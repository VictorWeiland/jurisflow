import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";
import crypto from "crypto";
import {
  createAdminTestClient,
  createJurisflowAppClient,
  setSessionContext,
} from "../test-client";

describe("Integridade Composta (FK Anti-Vazamento) e Descoberta de Organizações", () => {
  let adminClient: Client;
  let appClient: Client;

  const runId = crypto.randomUUID().slice(0, 8);
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();

  let orgAId: string;
  let orgBId: string;
  let clientAId: string;
  let clientBId: string;

  beforeAll(async () => {
    adminClient = await createAdminTestClient();
    appClient = await createJurisflowAppClient();

    // 1. Cria usuários em auth.users
    await adminClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES 
        ('${userAId}', 'user_a_${runId}@triforce.test', now()),
        ('${userBId}', 'user_b_${runId}@triforce.test', now());
    `);

    // 2. Cria Org A e Org B
    await setSessionContext(appClient, { userId: userAId });
    const resOrgA = await appClient.query(`
      SELECT public.create_organization_with_owner('Escritório Alpha FK', 'escritorio-alpha-fk-${runId}') as org_id;
    `);
    orgAId = resOrgA.rows[0].org_id;

    await setSessionContext(appClient, { userId: userBId });
    const resOrgB = await appClient.query(`
      SELECT public.create_organization_with_owner('Escritório Beta FK', 'escritorio-beta-fk-${runId}') as org_id;
    `);
    orgBId = resOrgB.rows[0].org_id;

    // 3. Cria Cliente A na Org A
    clientAId = crypto.randomUUID();
    await setSessionContext(appClient, { orgId: orgAId, userId: userAId });
    await appClient.query(`
      INSERT INTO public.clients (id, organization_id, name, document_number, updated_at)
      VALUES ('${clientAId}', '${orgAId}', 'Cliente da Org A', '11111111111', now());
    `);

    // 4. Cria Cliente B na Org B
    clientBId = crypto.randomUUID();
    await setSessionContext(appClient, { orgId: orgBId, userId: userBId });
    await appClient.query(`
      INSERT INTO public.clients (id, organization_id, name, document_number, updated_at)
      VALUES ('${clientBId}', '${orgBId}', 'Cliente da Org B', '22222222222', now());
    `);
  });

  afterAll(async () => {
    if (adminClient) await adminClient.end();
    if (appClient) await appClient.end();
  });

  describe("1. Integridade Referencial Composta (FK Multi-Tenant)", () => {
    it("deve rejeitar cadastro de processo na Org A apontando para cliente da Org B via chave estrangeira composta", async () => {
      // Define contexto da Org A
      await setSessionContext(appClient, { orgId: orgAId, userId: userAId });

      const caseId = crypto.randomUUID();

      // Tenta criar processo na Org A com client_id da Org B
      // A constraint composta legal_cases_organization_id_client_id_fkey exige que (organization_id, client_id) exista em clients
      await expect(
        appClient.query(`
          INSERT INTO public.legal_cases (
            id, organization_id, client_id, title, area, updated_at
          ) VALUES (
            '${caseId}', '${orgAId}', '${clientBId}', 'Processo Cruzado Ilegal', 'civel', now()
          );
        `),
      ).rejects.toThrow(
        /(violates foreign key constraint|viola restrição de chave estrangeira)/i,
      );
    });

    it("deve permitir cadastro de processo na Org A apontando para cliente legítimo da Org A", async () => {
      await setSessionContext(appClient, { orgId: orgAId, userId: userAId });

      const caseId = crypto.randomUUID();

      await appClient.query(`
        INSERT INTO public.legal_cases (
          id, organization_id, client_id, title, area, updated_at
        ) VALUES (
          '${caseId}', '${orgAId}', '${clientAId}', 'Processo Legítimo Org A', 'civel', now()
        );
      `);

      const res = await appClient.query(`
        SELECT id, title, client_id FROM public.legal_cases WHERE id = '${caseId}';
      `);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].client_id).toBe(clientAId);
    });
  });

  describe("2. Descoberta e Listagem de Organizações Antes de app.current_org_id Existir", () => {
    it("deve permitir ao Usuário A listar apenas suas organizações ativas quando app.current_org_id estiver vazio", async () => {
      // Define APENAS app.current_user_id (app.current_org_id permanece vazio)
      await appClient.query(
        "SELECT set_config('app.current_org_id', '', false);",
      );
      await setSessionContext(appClient, { userId: userAId });

      // Consulta organizations (ativa a política org_member_list_policy)
      const res = await appClient.query(`
        SELECT id, name, slug FROM public.organizations ORDER BY name;
      `);

      // O Usuário A deve ver apenas a Org A
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].id).toBe(orgAId);
      expect(res.rows[0].name).toBe("Escritório Alpha FK");

      // Comprova que a Org B é totalmente invisível
      const orgBInResults = res.rows.some(
        (r: { id: string }) => r.id === orgBId,
      );
      expect(orgBInResults).toBe(false);
    });

    it("deve permitir ao Usuário B listar apenas suas organizações ativas quando app.current_org_id estiver vazio", async () => {
      // Define APENAS app.current_user_id do Usuário B
      await appClient.query(
        "SELECT set_config('app.current_org_id', '', false);",
      );
      await setSessionContext(appClient, { userId: userBId });

      const res = await appClient.query(`
        SELECT id, name, slug FROM public.organizations ORDER BY name;
      `);

      expect(res.rows.length).toBe(1);
      expect(res.rows[0].id).toBe(orgBId);
      expect(res.rows[0].name).toBe("Escritório Beta FK");

      const orgAInResults = res.rows.some(
        (r: { id: string }) => r.id === orgAId,
      );
      expect(orgAInResults).toBe(false);
    });
  });
});
