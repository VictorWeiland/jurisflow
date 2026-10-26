const fs = require('fs');
const path = require('path');

// Ler o output do prisma migrate diff
const diffLogPath = 'C:/Users/vtr_a/.gemini/antigravity/brain/5a86c4e8-840a-4916-9265-944638f84add/.system_generated/steps/227/output.txt';
let ddl = fs.readFileSync(diffLogPath, 'utf8');

// Extrai apenas a parte SQL (remove avisos do prisma)
const startIdx = ddl.indexOf('-- CreateSchema');
if (startIdx !== -1) {
  ddl = ddl.slice(startIdx);
}
const endIdx = ddl.indexOf('┌───');
if (endIdx !== -1) {
  ddl = ddl.slice(0, endIdx);
}

const seedSql = `
-- ==============================================================================
-- DADOS GLOBAIS INICIAIS (Roles, Permissions, Plans, Subprocessors)
-- ==============================================================================

-- 1. Roles
INSERT INTO "roles" ("id", "name", "display_name", "description", "is_system", "created_at", "updated_at") VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Proprietário', 'Controle total da organização e titularidade', true, now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'admin', 'Administrador', 'Gestão administrativa, equipe e configurações', true, now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'lawyer', 'Advogado', 'Gestão de processos, prazos, audiências e clientes', true, now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'assistant', 'Assistente Jurídico', 'Operação de suporte, tarefas e andamentos', true, now(), now()),
  ('00000000-0000-0000-0000-000000000005', 'financial', 'Financeiro', 'Gestão financeira, cobranças, fluxo de caixa e relatórios', true, now(), now()),
  ('00000000-0000-0000-0000-000000000006', 'viewer', 'Consulta', 'Acesso somente leitura para clientes e auditoria', true, now(), now())
ON CONFLICT ("name") DO NOTHING;

-- 2. Subscription Plans
INSERT INTO "subscription_plans" ("id", "name", "code", "description", "price_cents", "billing_cycle", "max_users", "max_storage_mb", "max_cases", "features", "is_active", "created_at", "updated_at") VALUES
  ('10000000-0000-0000-0000-000000000001', 'Essencial', 'essential', 'Ideal para advogados autônomos iniciando digitalização', 14900, 'monthly', 1, 5120, 300, '{"audit_logs": true, "export_csv": true, "calendar": true}', true, now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'Profissional', 'professional', 'Para escritórios pequenos e médios em expansão', 34900, 'monthly', 5, 25600, 2000, '{"audit_logs": true, "export_csv": true, "calendar": true, "kanban": true, "privacy_center": true}', true, now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'Empresarial', 'enterprise', 'Equipes jurídicas corporativas e grandes bancas', 79900, 'monthly', 20, 102400, 10000, '{"audit_logs": true, "export_csv": true, "calendar": true, "kanban": true, "privacy_center": true, "custom_roles": true}', true, now(), now())
ON CONFLICT ("code") DO NOTHING;

-- 3. Subprocessors (LGPD Art. 33/39)
INSERT INTO "subprocessors" ("id", "name", "purpose", "data_types", "country", "privacy_url", "is_active", "created_at", "updated_at") VALUES
  ('20000000-0000-0000-0000-000000000001', 'Supabase Inc. / AWS', 'Hospedagem de Banco de Dados PostgreSQL e Autenticação (Região sa-east-1)', 'Dados cadastrais, registros jurídicos e credenciais criptografadas', 'Brasil (São Paulo)', 'https://supabase.com/privacy', true, now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'Vercel Inc. / AWS', 'Hospedagem da Aplicação Frontend e Edge Network', 'Metadados de tráfego, headers HTTP e logs de edge anonimizados', 'Estados Unidos / Brasil', 'https://vercel.com/legal/privacy-policy', true, now(), now())
ON CONFLICT ("id") DO NOTHING;
`;

const tenantTables = [
  'organization_members', 'invitations', 'audit_logs', 'subscriptions',
  'organization_settings', 'consent_records', 'processing_activities',
  'data_subject_requests', 'retention_policies', 'security_incidents',
  'clients', 'legal_cases', 'case_parties', 'case_events', 'deadlines',
  'hearings', 'tasks', 'task_comments', 'documents', 'document_versions',
  'document_access_logs', 'contracts', 'financial_transactions',
  'payment_records', 'categories', 'holidays', 'notifications'
];

let rlsSql = `
-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & POLÍTICAS
-- ==============================================================================

-- 1. Habilitação de RLS em todas as tabelas com isolamento
`;

for (const t of tenantTables) {
  rlsSql += `
ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${t}" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON "${t}";
CREATE POLICY "tenant_isolation_policy" ON "${t}"
  FOR ALL TO jurisflow_app
  USING ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
`;
}

rlsSql += `
-- 2. Tabela organizations
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_current_isolation_policy" ON "organizations";
CREATE POLICY "org_current_isolation_policy" ON "organizations"
  FOR ALL TO jurisflow_app
  USING ("id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS "org_member_list_policy" ON "organizations";
CREATE POLICY "org_member_list_policy" ON "organizations"
  FOR SELECT TO jurisflow_app
  USING ("id" IN (
    SELECT "organization_id" FROM "organization_members"
    WHERE "user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND "is_active" = true
  ));

-- 3. Tabela organization_members (política extra de listagem própria)
DROP POLICY IF EXISTS "user_own_memberships_policy" ON "organization_members";
CREATE POLICY "user_own_memberships_policy" ON "organization_members"
  FOR SELECT TO jurisflow_app
  USING ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- 4. Tabela profiles
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_own_policy" ON "profiles";
CREATE POLICY "profile_own_policy" ON "profiles"
  FOR ALL TO jurisflow_app
  USING ("id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

DROP POLICY IF EXISTS "profile_member_read_policy" ON "profiles";
CREATE POLICY "profile_member_read_policy" ON "profiles"
  FOR SELECT TO jurisflow_app
  USING ("id" IN (
    SELECT "user_id" FROM "organization_members"
    WHERE "organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
  ));

-- 5. Tabela terms_acceptances
ALTER TABLE "terms_acceptances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "terms_acceptances" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "terms_user_isolation_policy" ON "terms_acceptances";
CREATE POLICY "terms_user_isolation_policy" ON "terms_acceptances"
  FOR ALL TO jurisflow_app
  USING ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);

-- 6. Tabela notification_preferences
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_pref_own_policy" ON "notification_preferences";
CREATE POLICY "notif_pref_own_policy" ON "notification_preferences"
  FOR ALL TO jurisflow_app
  USING ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("user_id" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
`;

const functionsAndGrantsSql = `
-- ==============================================================================
-- FUNÇÕES SECURITY DEFINER (com FORCE ROW LEVEL SECURITY ativo)
-- ==============================================================================

-- 1. Criação de Organização com Proprietário
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  org_name text,
  org_slug text,
  org_timezone text DEFAULT 'America/Sao_Paulo'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_owner_role_id uuid;
BEGIN
  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: app.current_user_id ausente' USING ERRCODE = '28000';
  END IF;

  -- Garante existência de registro em public.profiles correspondente a auth.users
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, email, full_name, is_superadmin, created_at, updated_at)
    SELECT id, email, split_part(email, '@', 1), false, now(), now()
    FROM auth.users
    WHERE id = v_user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'owner';
  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'Papel owner não encontrado' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.organizations (id, name, slug, timezone, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), org_name, org_slug, org_timezone, true, now(), now())
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (id, organization_id, user_id, role_id, is_active, joined_at, updated_at)
  VALUES (gen_random_uuid(), v_org_id, v_user_id, v_owner_role_id, true, now(), now());

  RETURN v_org_id;
END;
$$;

-- 2. Aceite de Convite com Validação em auth.users e SELECT FOR UPDATE
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_invitation record;
  v_existing_id uuid;
BEGIN
  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado: app.current_user_id ausente' USING ERRCODE = '28000';
  END IF;

  -- Validação estrita em auth.users exigindo e-mail confirmado
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id AND email_confirmed_at IS NOT NULL;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não possui e-mail verificado em auth.users' USING ERRCODE = '28000';
  END IF;

  -- Lock pessimista com FOR UPDATE para garantia de uso único
  SELECT id, organization_id, role_id, email INTO v_invitation
  FROM public.invitations
  WHERE token_hash = p_token_hash
    AND accepted_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Convite inválido ou expirado' USING ERRCODE = 'P0002';
  END IF;

  IF lower(v_invitation.email) != lower(v_user_email) THEN
    RAISE EXCEPTION 'O convite pertence a outro e-mail' USING ERRCODE = '42501';
  END IF;

  -- Garante existência de registro em public.profiles correspondente a auth.users
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, email, full_name, is_superadmin, created_at, updated_at)
    SELECT id, email, split_part(email, '@', 1), false, now(), now()
    FROM auth.users
    WHERE id = v_user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.organization_members
  WHERE organization_id = v_invitation.organization_id AND user_id = v_user_id;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.organization_members (id, organization_id, user_id, role_id, is_active, joined_at, updated_at)
    VALUES (gen_random_uuid(), v_invitation.organization_id, v_user_id, v_invitation.role_id, true, now(), now());
  END IF;

  UPDATE public.invitations SET accepted_at = now() WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'organization_id', v_invitation.organization_id);
END;
$$;

-- Restrições de execução nas funções
REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text, text) TO jurisflow_app;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO jurisflow_app;

-- ==============================================================================
-- REVOGAÇÃO DE PRIVILÉGIOS (Mínimos Estritos)
-- ==============================================================================

-- 1. Revoga acesso de anon e authenticated em todas as tabelas, sequences e rotinas do schema public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- 2. Tabelas Globais: jurisflow_app tem APENAS permissão de leitura (SELECT)
REVOKE INSERT, UPDATE, DELETE ON public.roles FROM jurisflow_app;
REVOKE INSERT, UPDATE, DELETE ON public.permissions FROM jurisflow_app;
REVOKE INSERT, UPDATE, DELETE ON public.role_permissions FROM jurisflow_app;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_plans FROM jurisflow_app;
REVOKE INSERT, UPDATE, DELETE ON public.subprocessors FROM jurisflow_app;

-- 3. Aceite de Termos (terms_acceptances): apenas INSERT e SELECT (imutável)
REVOKE UPDATE, DELETE ON public.terms_acceptances FROM jurisflow_app;

-- 4. Trilha de Auditoria e Acessos a Documentos: apenas INSERT e SELECT (imutável)
REVOKE UPDATE, DELETE ON public.audit_logs FROM jurisflow_app;
REVOKE UPDATE, DELETE ON public.document_access_logs FROM jurisflow_app;
`;

const fullMigration = `${ddl}\n${seedSql}\n${rlsSql}\n${functionsAndGrantsSql}`;

const migrationDir = path.resolve('C:/Projetos/jurisflow/prisma/migrations/20261026000000_init');
fs.mkdirSync(migrationDir, { recursive: true });
fs.writeFileSync(path.join(migrationDir, 'migration.sql'), fullMigration, 'utf8');

console.log('Migration atualizada em:', path.join(migrationDir, 'migration.sql'));
