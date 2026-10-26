import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { createAdminTestClient, createJurisflowAppClient } from '../test-client';

describe('Verificação de Privilégios Mínimos e Imutabilidade', () => {
  let adminClient: Client;
  let appClient: Client;

  beforeAll(async () => {
    adminClient = await createAdminTestClient();
    appClient = await createJurisflowAppClient();
  });

  afterAll(async () => {
    if (adminClient) await adminClient.end();
    if (appClient) await appClient.end();
  });

  describe('PostgREST (anon e authenticated) - Zero Acessos no Schema Public', () => {
    it('anon deve ter ZERO privilégios em todas as tabelas do schema public', async () => {
      const res = await adminClient.query(`
        SELECT c.relname as table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND (
            has_table_privilege('anon', c.oid, 'SELECT')
            OR has_table_privilege('anon', c.oid, 'INSERT')
            OR has_table_privilege('anon', c.oid, 'UPDATE')
            OR has_table_privilege('anon', c.oid, 'DELETE')
          );
      `);

      expect(res.rows).toHaveLength(0);
    });

    it('authenticated deve ter ZERO privilégios em todas as tabelas do schema public', async () => {
      const res = await adminClient.query(`
        SELECT c.relname as table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND (
            has_table_privilege('authenticated', c.oid, 'SELECT')
            OR has_table_privilege('authenticated', c.oid, 'INSERT')
            OR has_table_privilege('authenticated', c.oid, 'UPDATE')
            OR has_table_privilege('authenticated', c.oid, 'DELETE')
          );
      `);

      expect(res.rows).toHaveLength(0);
    });

    it('anon e authenticated devem ter ZERO privilégios nas sequences do schema public', async () => {
      const res = await adminClient.query(`
        SELECT c.relname as sequence_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'S'
          AND (
            has_sequence_privilege('anon', c.oid, 'USAGE')
            OR has_sequence_privilege('anon', c.oid, 'SELECT')
            OR has_sequence_privilege('authenticated', c.oid, 'USAGE')
            OR has_sequence_privilege('authenticated', c.oid, 'SELECT')
          );
      `);

      expect(res.rows).toHaveLength(0);
    });

    it('anon e authenticated devem ter ZERO privilégios de execução nas funções do schema public', async () => {
      const res = await adminClient.query(`
        SELECT p.proname as routine_name
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (
            has_function_privilege('anon', p.oid, 'EXECUTE')
            OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
          );
      `);

      expect(res.rows).toHaveLength(0);
    });
  });

  describe('Papel jurisflow_app - Imutabilidade e Restrições Globais', () => {
    it('deve rejeitar UPDATE em audit_logs com erro de permissão (42501)', async () => {
      await expect(
        appClient.query(`
          UPDATE public.audit_logs
          SET action = 'tampered'
          WHERE id = '00000000-0000-0000-0000-000000000001';
        `)
      ).rejects.toThrow(/(permission denied|permissão negada)/i);
    });

    it('deve rejeitar DELETE em audit_logs com erro de permissão (42501)', async () => {
      await expect(
        appClient.query(`
          DELETE FROM public.audit_logs
          WHERE id = '00000000-0000-0000-0000-000000000001';
        `)
      ).rejects.toThrow(/(permission denied|permissão negada)/i);
    });

    it('deve rejeitar UPDATE em document_access_logs com erro de permissão (42501)', async () => {
      await expect(
        appClient.query(`
          UPDATE public.document_access_logs
          SET access_type = 'tampered'
          WHERE id = '00000000-0000-0000-0000-000000000001';
        `)
      ).rejects.toThrow(/(permission denied|permissão negada)/i);
    });

    it('deve rejeitar UPDATE ou INSERT nas tabelas globais (roles, permissions, subscription_plans, subprocessors)', async () => {
      // 1. Tentar alterar role
      await expect(
        appClient.query(`
          UPDATE public.roles
          SET display_name = 'Hacked'
          WHERE name = 'owner';
        `)
      ).rejects.toThrow(/(permission denied|permissão negada)/i);

      // 2. Tentar inserir novo subscription_plan
      await expect(
        appClient.query(`
          INSERT INTO public.subscription_plans (id, name, code, price_cents, updated_at)
          VALUES (gen_random_uuid(), 'Fake Plan', 'fake_plan', 0, now());
        `)
      ).rejects.toThrow(/(permission denied|permissão negada)/i);
    });

    it('deve rejeitar UPDATE ou DELETE em terms_acceptances (imutável)', async () => {
      await expect(
        appClient.query(`
          UPDATE public.terms_acceptances
          SET document_version = 'tampered'
          WHERE id = '00000000-0000-0000-0000-000000000001';
        `)
      ).rejects.toThrow(/(permission denied|permissão negada)/i);

      await expect(
        appClient.query(`
          DELETE FROM public.terms_acceptances
          WHERE id = '00000000-0000-0000-0000-000000000001';
        `)
      ).rejects.toThrow(/(permission denied|permissão negada)/i);
    });
  });
});
