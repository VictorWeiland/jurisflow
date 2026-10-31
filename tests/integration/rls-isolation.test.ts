import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";
import crypto from "crypto";
import {
  createJurisflowAppClient,
  createAdminTestClient,
  setSessionContext,
} from "../test-client";

describe("Isolamento Multi-Tenant por Row Level Security (RLS)", () => {
  let appClient: Client;
  let adminClient: Client;

  const runId = crypto.randomUUID().slice(0, 8);
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const slugA = `escritorio-alpha-${runId}`;
  const slugB = `escritorio-beta-${runId}`;

  let actualOrgA: string;
  let actualOrgB: string;

  beforeAll(async () => {
    adminClient = await createAdminTestClient();

    // 1. Cria fixtures em auth.users para os dois usuários
    await adminClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES 
        ('${userAId}', 'advogado_a_${runId}@triforce.test', now()),
        ('${userBId}', 'advogado_b_${runId}@triforce.test', now());
    `);

    // 2. Conecta como jurisflow_app (usuário comum sem bypass RLS)
    appClient = await createJurisflowAppClient();

    // 3. Cria as organizações A e B via função SECURITY DEFINER como cada usuário
    await setSessionContext(appClient, { userId: userAId });
    const resOrgA = await appClient.query(`
      SELECT public.create_organization_with_owner('Escritório Alpha', '${slugA}') as org_id;
    `);
    actualOrgA = resOrgA.rows[0].org_id;

    await setSessionContext(appClient, { userId: userBId });
    const resOrgB = await appClient.query(`
      SELECT public.create_organization_with_owner('Escritório Beta', '${slugB}') as org_id;
    `);
    actualOrgB = resOrgB.rows[0].org_id;

    // 4. Insere cliente no Escritório A como jurisflow_app
    await setSessionContext(appClient, { orgId: actualOrgA, userId: userAId });
    await appClient.query(`
      INSERT INTO public.clients (id, organization_id, name, document_number, updated_at)
      VALUES (gen_random_uuid(), '${actualOrgA}', 'Cliente Exclusivo Org A', '12345678909', now());
    `);

    // 5. Insere cliente no Escritório B como jurisflow_app
    await setSessionContext(appClient, { orgId: actualOrgB, userId: userBId });
    await appClient.query(`
      INSERT INTO public.clients (id, organization_id, name, document_number, updated_at)
      VALUES (gen_random_uuid(), '${actualOrgB}', 'Cliente Exclusivo Org B', '98765432100', now());
    `);
  });

  afterAll(async () => {
    if (appClient) await appClient.end();
    if (adminClient) await adminClient.end();
  });

  it("deve retornar apenas registros da Org A quando o contexto for da Org A (sem filtro WHERE na aplicação)", async () => {
    // Define contexto da Org A
    await setSessionContext(appClient, { orgId: actualOrgA, userId: userAId });

    // Consulta direta sem cláusula WHERE organization_id
    const result = await appClient.query("SELECT * FROM public.clients;");

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe("Cliente Exclusivo Org A");
    expect(result.rows[0].organization_id).toBe(actualOrgA);
  });

  it("deve retornar apenas registros da Org B quando o contexto for da Org B (sem filtro WHERE na aplicação)", async () => {
    // Define contexto da Org B
    await setSessionContext(appClient, { orgId: actualOrgB, userId: userBId });

    // Consulta direta sem cláusula WHERE organization_id
    const result = await appClient.query("SELECT * FROM public.clients;");

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe("Cliente Exclusivo Org B");
    expect(result.rows[0].organization_id).toBe(actualOrgB);
  });

  it("deve retornar zero linhas se app.current_org_id estiver ausente ou vazio", async () => {
    // Limpa o contexto de organização no escopo da sessão
    await appClient.query(
      "SELECT set_config('app.current_org_id', '', false);",
    );

    const result = await appClient.query("SELECT * FROM public.clients;");
    expect(result.rows.length).toBe(0);
  });

  it("deve impedir que a Org A leia ou altere dados da Org B mesmo forçando o ID da Org B no INSERT", async () => {
    // Contexto é Org A, mas tenta inserir com organization_id da Org B
    await setSessionContext(appClient, { orgId: actualOrgA, userId: userAId });

    // O WITH CHECK da política RLS deve rejeitar a inserção com erro de violação de política RLS
    await expect(
      appClient.query(`
        INSERT INTO public.clients (id, organization_id, name, document_number, updated_at)
        VALUES (gen_random_uuid(), '${actualOrgB}', 'Invasor Tentando Gravar na Org B', '11122233344', now());
      `),
    ).rejects.toThrow(
      /(violates row-level security policy|viola a política de segurança no nível de linha)/i,
    );
  });
});
