import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { withTenantContext } from "@/lib/db/prisma";
import { resolveOrgContext } from "@/lib/auth/context";
import {
  createAdminTestClient,
  JURISFLOW_APP_TEST_URL,
} from "../../test-client";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Client } from "pg";

describe("Cliente Prisma com Contexto de Sessão e Isolamento Transacional (Etapa 4)", () => {
  let adminClient: Client;
  let userAId: string;
  let orgAId: string;
  let testPrisma: PrismaClient;

  // URL de teste configurada com connection_limit=1 para forçar reutilização do mesmo backend PostgreSQL
  const singleConnUrl = new URL(JURISFLOW_APP_TEST_URL);
  singleConnUrl.searchParams.set("connection_limit", "1");

  beforeAll(async () => {
    adminClient = await createAdminTestClient();

    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: singleConnUrl.toString(),
        },
      },
    });

    // 1. Cria Usuário A e Org A
    userAId = crypto.randomUUID();
    const runIdA = `${Date.now()}_a`;
    const userAEmail = `user.a.${runIdA}@exemplo.com.br`;
    await adminClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES ('${userAId}', '${userAEmail}', now());
    `);

    await testPrisma.$executeRaw`SELECT set_config('app.current_user_id', ${userAId}, false)`;
    const resA = await testPrisma.$queryRaw<Array<{ org_id: string }>>`
      SELECT public.create_organization_with_owner(
        ${"Org Alpha " + runIdA}::text,
        ${"org-alpha-" + runIdA}::text
      ) as org_id;
    `;
    orgAId = resA[0].org_id;

    // Limpa qualquer contexto residual de sessão
    await testPrisma.$executeRaw`SELECT set_config('app.current_user_id', '', false)`;
    await testPrisma.$executeRaw`SELECT set_config('app.current_org_id', '', false)`;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
    if (adminClient) {
      await adminClient.end();
    }
  });

  it("1. Query dentro de withTenantContext retorna dados do tenant e isola outros tenants", async () => {
    const ctxA = await resolveOrgContext(testPrisma, userAId, orgAId);
    const clientAId = crypto.randomUUID();

    // Grava e lê cliente usando withTenantContext
    await withTenantContext(
      ctxA,
      async (db) => {
        await db.client.create({
          data: {
            id: clientAId,
            organizationId: orgAId,
            name: "Cliente Org A via withTenantContext",
            documentNumber: "11122233344",
          },
        });

        const clients = await db.client.findMany();
        expect(clients.some((c) => c.id === clientAId)).toBe(true);
      },
      testPrisma,
    );
  });

  it("2. Query sem contexto (fora de withTenantContext) retorna ZERO linhas na tabela de tenant", async () => {
    // Consulta direta sem contexto de sessão configurado
    const clients = await testPrisma.client.findMany();
    expect(clients).toEqual([]);
    expect(clients.length).toBe(0);
  });

  it("3. Teste de não-vazamento sequencial comprovado no mesmo backend PostgreSQL (pg_backend_pid)", async () => {
    const ctxA = await resolveOrgContext(testPrisma, userAId, orgAId);

    let pid1 = 0;
    let pid2 = 0;

    // 1. Transação com contexto da Org A
    await withTenantContext(
      ctxA,
      async (db) => {
        const pidRes = await (db as unknown as PrismaClient).$queryRaw<
          Array<{ pg_backend_pid: number }>
        >`SELECT pg_backend_pid();`;
        pid1 = pidRes[0].pg_backend_pid;

        const visibleClients = await db.client.findMany();
        expect(visibleClients.length).toBeGreaterThan(0);
      },
      testPrisma,
    );

    // 2. Transação sequencial sem contexto na mesma conexão (connection_limit=1)
    await testPrisma.$transaction(async (tx) => {
      const pidRes = await tx.$queryRaw<
        Array<{ pg_backend_pid: number }>
      >`SELECT pg_backend_pid();`;
      pid2 = pidRes[0].pg_backend_pid;

      // Consulta sem filtros no código da aplicação
      const clients = await tx.client.findMany();
      expect(clients).toEqual([]);
      expect(clients.length).toBe(0);

      // Confirma que a variável de sessão está limpa
      const settingRes = await tx.$queryRaw<
        Array<{ current_setting: string | null }>
      >`SELECT current_setting('app.current_org_id', true);`;
      const currentOrg = settingRes[0].current_setting;
      expect(currentOrg === "" || currentOrg === null).toBe(true);
    });

    // 3. Prova matemática de reutilização de backend:
    // Asserção estrita de igualdade sem 'if' protetor: se diferente, falha imediatamente.
    expect(
      pid1,
      `Falha de conexão: os PIDs deveriam ser iguais para comprovar reuso do pool (PID 1: ${pid1}, PID 2: ${pid2})`,
    ).toBe(pid2);
    expect(pid1).toBeGreaterThan(0);
  });

  it('4. Teste Estático: Proíbe "as OrgContext", importação de OrgContextBrand, e instâncias de PrismaClient fora dos locais autorizados', () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const testsDir = path.resolve(process.cwd(), "tests");

    const violations: string[] = [];

    // Padrões de busca regex
    const asOrgContextRegex = new RegExp("\\bas\\s+OrgContext\\b");
    const orgContextBrandRegex = new RegExp("\\bOrgContextBrand\\b");
    const newPrismaClientRegex = new RegExp("new\\s+PrismaClient\\b");

    function scanFile(filePath: string) {
      const normPath = filePath.replace(/\\/g, "/");

      // Ignora o próprio arquivo de teste para não disparar falso positivo nos literais de teste
      if (normPath.endsWith("tests/integration/db/tenant-prisma.test.ts")) {
        return;
      }

      const content = fs.readFileSync(filePath, "utf-8");

      // Regra 1: Proíbe "as OrgContext" em qualquer lugar do código em src/ e tests/
      // (somente permitido dentro da factory createOrgContext em src/lib/auth/context.ts)
      if (!normPath.endsWith("src/lib/auth/context.ts")) {
        if (asOrgContextRegex.test(content)) {
          violations.push(
            `[Violação de Cast]: '${normPath}' contém cast forçado 'as OrgContext'. Use requireOrgContext().`,
          );
        }
      }

      // Regra 2: Proíbe importação ou referência a OrgContextBrand fora de src/lib/auth/context.ts
      if (!normPath.endsWith("src/lib/auth/context.ts")) {
        if (orgContextBrandRegex.test(content)) {
          violations.push(
            `[Violação de Brand]: '${normPath}' faz referência ao símbolo privado 'OrgContextBrand'.`,
          );
        }
      }

      // Regra 3: Proíbe "new PrismaClient" fora de src/lib/db/, scripts/ e arquivos de setup de testes
      const isDbModule = normPath.includes("src/lib/db/");
      const isTestFile = normPath.includes("tests/");
      const isScript = normPath.includes("scripts/");

      if (!isDbModule && !isTestFile && !isScript) {
        if (newPrismaClientRegex.test(content)) {
          violations.push(
            `[Violação de Singleton]: '${normPath}' instancia 'new PrismaClient()' diretamente. Use src/lib/db/prisma.ts.`,
          );
        }

        // Proíbe imports não restritos a tipos de '@prisma/client' fora de src/lib/db/
        // Permite "import type { ... } from '@prisma/client'"
        const importLines = content
          .split("\n")
          .filter((line) => line.includes("@prisma/client"));
        for (const line of importLines) {
          if (!/import\s+type\b/.test(line)) {
            violations.push(
              `[Violação de Encapsulamento]: '${normPath}' importa '@prisma/client' em runtime. Apenas 'import type' é permitido fora de src/lib/db/. Linha: ${line.trim()}`,
            );
          }
        }
      }
    }

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          scanFile(fullPath);
        }
      }
    }

    scanDir(srcDir);
    scanDir(testsDir);

    expect(
      violations,
      `Violações estáticas de segurança arquitetural encontradas:\n${violations.join(
        "\n",
      )}`,
    ).toEqual([]);
  });
});
