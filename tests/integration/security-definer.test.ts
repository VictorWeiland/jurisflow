import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";
import crypto from "crypto";
import {
  createAdminTestClient,
  createJurisflowAppClient,
  setSessionContext,
} from "../test-client";

describe("Funções SECURITY DEFINER com FORCE ROW LEVEL SECURITY Ativo", () => {
  let adminClient: Client;
  let appClient: Client;

  const runId = crypto.randomUUID().slice(0, 8);
  const ownerUserId = crypto.randomUUID();
  const invitedUserId = crypto.randomUUID();
  const unconfirmedUserId = crypto.randomUUID();

  const ownerEmail = `proprietario_${runId}@triforce.test`;
  const invitedEmail = `convidado_${runId}@triforce.test`;
  const unconfirmedEmail = `unconfirmed_${runId}@triforce.test`;

  let testOrgId: string;
  let validTokenHash: string;

  beforeAll(async () => {
    adminClient = await createAdminTestClient();
    appClient = await createJurisflowAppClient();

    // 1. Cria usuários em auth.users
    await adminClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES 
        ('${ownerUserId}', '${ownerEmail}', now()),
        ('${invitedUserId}', '${invitedEmail}', now()),
        ('${unconfirmedUserId}', '${unconfirmedEmail}', NULL);
    `);

    // 2. Executa create_organization_with_owner conectado como jurisflow_app
    await setSessionContext(appClient, { userId: ownerUserId });
    const orgRes = await appClient.query(`
      SELECT public.create_organization_with_owner('Escritório Definer Test', 'escritorio-definer-${runId}') as org_id;
    `);
    testOrgId = orgRes.rows[0].org_id;

    // 3. Cria um convite válido para o invitedUser
    const rawToken = `secret_token_${runId}`;
    validTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const lawyerRoleRes = await adminClient.query(
      "SELECT id FROM public.roles WHERE name = 'lawyer'",
    );
    const lawyerRoleId = lawyerRoleRes.rows[0].id;

    await adminClient.query(`
      INSERT INTO public.invitations (
        id, organization_id, email, role_id, token_hash, expires_at, invited_by
      ) VALUES (
        gen_random_uuid(), '${testOrgId}', '${invitedEmail}', '${lawyerRoleId}',
        '${validTokenHash}', now() + interval '2 days', '${ownerUserId}'
      );
    `);
  });

  afterAll(async () => {
    if (adminClient) await adminClient.end();
    if (appClient) await appClient.end();
  });

  describe("create_organization_with_owner", () => {
    it("deve criar a organização e vincular o usuário como owner mesmo com FORCE RLS ativo", async () => {
      const newUserId = crypto.randomUUID();
      const newEmail = `novo_owner_${runId}@triforce.test`;
      const newSlug = `novo-escritorio-${runId}`;

      await adminClient.query(`
        INSERT INTO auth.users (id, email, email_confirmed_at)
        VALUES ('${newUserId}', '${newEmail}', now());
      `);

      await setSessionContext(appClient, { userId: newUserId });
      const res = await appClient.query(`
        SELECT public.create_organization_with_owner('Novo Escritório', '${newSlug}') as org_id;
      `);
      const newOrgId = res.rows[0].org_id;
      expect(newOrgId).toBeDefined();

      // Confere se é membro com papel de owner
      const memberRes = await adminClient.query(`
        SELECT om.id, r.name as role_name
        FROM public.organization_members om
        JOIN public.roles r ON om.role_id = r.id
        WHERE om.organization_id = '${newOrgId}' AND om.user_id = '${newUserId}';
      `);
      expect(memberRes.rows).toHaveLength(1);
      expect(memberRes.rows[0].role_name).toBe("owner");
    });

    it("deve falhar se app.current_user_id estiver vazio", async () => {
      await appClient.query(
        "SELECT set_config('app.current_user_id', '', false);",
      );
      await expect(
        appClient.query(
          `SELECT public.create_organization_with_owner('Erro Org', 'erro-org-${runId}');`,
        ),
      ).rejects.toThrow(/Não autenticado/i);
    });
  });

  describe("accept_invitation", () => {
    it("deve falhar se o usuário não tiver e-mail confirmado em auth.users", async () => {
      await setSessionContext(appClient, { userId: unconfirmedUserId });
      await expect(
        appClient.query(
          `SELECT public.accept_invitation('${validTokenHash}');`,
        ),
      ).rejects.toThrow(/e-mail verificado em auth.users/i);
    });

    it("deve falhar se o convite pertencer a outro e-mail", async () => {
      // O usuário owner tenta aceitar o convite emitido para o advogado convidado
      await setSessionContext(appClient, { userId: ownerUserId });
      await expect(
        appClient.query(
          `SELECT public.accept_invitation('${validTokenHash}');`,
        ),
      ).rejects.toThrow(/convite pertence a outro e-mail/i);
    });

    it("deve aceitar o convite com sucesso para o usuário correto e marcá-lo como aceito", async () => {
      await setSessionContext(appClient, { userId: invitedUserId });
      const res = await appClient.query(`
        SELECT public.accept_invitation('${validTokenHash}') as result;
      `);

      const result = res.rows[0].result;
      expect(result.success).toBe(true);
      expect(result.organization_id).toBe(testOrgId);

      // Confere no banco se virou membro ativo
      const memberRes = await adminClient.query(`
        SELECT om.is_active, r.name as role_name
        FROM public.organization_members om
        JOIN public.roles r ON om.role_id = r.id
        WHERE om.organization_id = '${testOrgId}' AND om.user_id = '${invitedUserId}';
      `);
      expect(memberRes.rows).toHaveLength(1);
      expect(memberRes.rows[0].is_active).toBe(true);
      expect(memberRes.rows[0].role_name).toBe("lawyer");

      // Confere se o convite foi marcado como accepted_at IS NOT NULL
      const invRes = await adminClient.query(`
        SELECT accepted_at FROM public.invitations WHERE token_hash = '${validTokenHash}';
      `);
      expect(invRes.rows[0].accepted_at).not.toBeNull();
    });

    it("deve falhar ao tentar reutilizar o convite já aceito (garantia de uso único)", async () => {
      await setSessionContext(appClient, { userId: invitedUserId });
      await expect(
        appClient.query(
          `SELECT public.accept_invitation('${validTokenHash}');`,
        ),
      ).rejects.toThrow(/Convite inválido ou expirado/i);
    });
  });
});
