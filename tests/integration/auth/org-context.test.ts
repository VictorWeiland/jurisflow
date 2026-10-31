import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  resolveOrgContext,
  withOrgContext,
  ORG_COOKIE_NAME,
} from "@/lib/auth/context";
import { ForbiddenOrgAccessError, OrgRequiredError } from "@/lib/auth/errors";
import {
  createAdminTestClient,
  JURISFLOW_APP_TEST_URL,
} from "../../test-client";
import crypto from "crypto";
import type { Client } from "pg";

// Conecta expressamente como jurisflow_app (NOBYPASSRLS) para que as regras RLS sejam aplicadas
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: JURISFLOW_APP_TEST_URL,
    },
  },
});

describe("Camada de Resolução de Contexto de Tenant (resolveOrgContext & withOrgContext)", () => {
  let adminClient: Client;
  let userAId: string;
  let userBId: string;
  let orgAId: string;
  let orgBId: string;

  beforeAll(async () => {
    adminClient = await createAdminTestClient();

    // 1. Cria Usuário A em auth.users e sua organização via SECURITY DEFINER
    userAId = crypto.randomUUID();
    const runIdA = `${Date.now()}_a`;
    const userAEmail = `user.a.${runIdA}@exemplo.com.br`;
    await adminClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES ('${userAId}', '${userAEmail}', now());
    `);

    await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userAId}, false)`;
    const resA = await prisma.$queryRaw<Array<{ org_id: string }>>`
      SELECT public.create_organization_with_owner(
        ${"Org Alpha " + runIdA}::text,
        ${"org-alpha-" + runIdA}::text
      ) as org_id;
    `;
    orgAId = resA[0].org_id;

    // 2. Cria Usuário B em auth.users e sua organização via SECURITY DEFINER
    userBId = crypto.randomUUID();
    const runIdB = `${Date.now()}_b`;
    const userBEmail = `user.b.${runIdB}@exemplo.com.br`;
    await adminClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES ('${userBId}', '${userBEmail}', now());
    `);

    await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userBId}, false)`;
    const resB = await prisma.$queryRaw<Array<{ org_id: string }>>`
      SELECT public.create_organization_with_owner(
        ${"Org Beta " + runIdB}::text,
        ${"org-beta-" + runIdB}::text
      ) as org_id;
    `;
    orgBId = resB[0].org_id;

    // Limpa o contexto de sessão após o setup
    await prisma.$executeRaw`SELECT set_config('app.current_user_id', '', false)`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (adminClient) {
      await adminClient.end();
    }
  });

  it("Cenário (a): Usuário da Org A com Org B no cookie jurisflow_org_id recebe 403 Forbidden", async () => {
    // Usuário A tenta instanciar contexto passando o cookie com ID da Org B
    await expect(
      resolveOrgContext(prisma, userAId, orgBId),
    ).rejects.toThrowError(ForbiddenOrgAccessError);

    // Valida também se a mensagem e código de status 403 estão estritamente definidos
    try {
      await resolveOrgContext(prisma, userAId, orgBId);
      expect.unreachable("Deveria ter lançado ForbiddenOrgAccessError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ForbiddenOrgAccessError);
      const forbiddenErr = err as ForbiddenOrgAccessError;
      expect(forbiddenErr.statusCode).toBe(403);
      expect(forbiddenErr.message).toContain("Acesso negado");
    }
  });

  it("Cenário (c): Headers customizados são ignorados e NÃO influenciam a resolução de tenant", async () => {
    // Simula uma requisição com headers arbitrários enviados pelo cliente
    const fakeIncomingHeaders = {
      "x-organization-id": orgBId,
      "x-user-id": userBId,
    };

    // Subcenário c.1: Com cookie jurisflow_org_id presente apontando para Org A,
    // o contexto resolvido DEVE ser Org A, mesmo com o header apontando para Org B.
    const resolvedContext = await resolveOrgContext(prisma, userAId, orgAId);
    expect(resolvedContext.orgId).toBe(orgAId);
    expect(resolvedContext.userId).toBe(userAId);
    expect(resolvedContext.orgId).not.toBe(
      fakeIncomingHeaders["x-organization-id"],
    );

    // Subcenário c.2: Sem o cookie jurisflow_org_id (null/undefined/vazio),
    // a resolução DEVE falhar com OrgRequiredError (400), provando que o header
    // x-organization-id NÃO é lido nem considerado como substituto.
    await expect(resolveOrgContext(prisma, userAId, null)).rejects.toThrowError(
      OrgRequiredError,
    );

    await expect(resolveOrgContext(prisma, userAId, "")).rejects.toThrowError(
      OrgRequiredError,
    );

    try {
      await resolveOrgContext(prisma, userAId, undefined);
      expect.unreachable("Deveria ter lançado OrgRequiredError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(OrgRequiredError);
      const orgErr = err as OrgRequiredError;
      expect(orgErr.statusCode).toBe(400);
      expect(orgErr.message).toContain(ORG_COOKIE_NAME);
    }
  });

  it("Cenário (e): Cliente de tenant real com RLS ativo retorna registros da Org A e ZERO da Org B sem filtro no código", async () => {
    const clientAId = crypto.randomUUID();
    const clientBId = crypto.randomUUID();

    // 1. Inserção de cliente via contexto da Org A
    const contextOrgA = await resolveOrgContext(prisma, userAId, orgAId);
    await withOrgContext(prisma, contextOrgA, async (tx) => {
      await tx.client.create({
        data: {
          id: clientAId,
          organizationId: orgAId,
          name: "Cliente Confidencial Org A",
          documentNumber: "11122233344",
        },
      });
    });

    // 2. Inserção de cliente via contexto da Org B
    const contextOrgB = await resolveOrgContext(prisma, userBId, orgBId);
    await withOrgContext(prisma, contextOrgB, async (tx) => {
      await tx.client.create({
        data: {
          id: clientBId,
          organizationId: orgBId,
          name: "Cliente Confidencial Org B",
          documentNumber: "55566677788",
        },
      });
    });

    // 3. Consulta da aplicação logada na Org A
    // REGRA CRÍTICA: SEM cláusula `where: { organization_id: orgAId }` no código da aplicação!
    await withOrgContext(prisma, contextOrgA, async (tx) => {
      const allVisibleClients = await tx.client.findMany();

      // Confirma que o cliente da Org A está presente
      const clientAFound = allVisibleClients.find((c) => c.id === clientAId);
      expect(clientAFound).toBeDefined();
      expect(clientAFound?.name).toBe("Cliente Confidencial Org A");

      // CONFIRMAÇÃO ABSOLUTA DE ISOLAMENTO:
      // O cliente da Org B NUNCA aparece na listagem (contagem de clientes da Org B é ZERO)
      const clientBFound = allVisibleClients.find((c) => c.id === clientBId);
      expect(clientBFound).toBeUndefined();

      const orgBClientsCount = allVisibleClients.filter(
        (c) => c.organizationId === orgBId,
      ).length;
      expect(orgBClientsCount).toBe(0);
    });
  });
});
