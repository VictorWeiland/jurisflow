import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import crypto from 'crypto';
import {
  createAdminTestClient,
  createJurisflowAppClient,
  setSessionContext,
} from '../test-client';

describe('Operação Positiva do Papel jurisflow_app em Tabelas de Tenant', () => {
  let adminClient: Client;
  let appClient: Client;

  const runId = crypto.randomUUID().slice(0, 8);
  const userId = crypto.randomUUID();
  const userEmail = `advogado_crud_${runId}@triforce.test`;
  const slug = `escritorio-crud-${runId}`;
  let orgId: string;

  beforeAll(async () => {
    adminClient = await createAdminTestClient();
    appClient = await createJurisflowAppClient();

    // 1. Fixture de usuário
    await adminClient.query(`
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES ('${userId}', '${userEmail}', now());
    `);

    // 2. Cria organização
    await setSessionContext(appClient, { userId });
    const orgRes = await appClient.query(`
      SELECT public.create_organization_with_owner('Escritório CRUD Test', '${slug}') as org_id;
    `);
    orgId = orgRes.rows[0].org_id;
  });

  afterAll(async () => {
    if (adminClient) await adminClient.end();
    if (appClient) await appClient.end();
  });

  it('deve permitir INSERT, SELECT e UPDATE de cliente pelo papel jurisflow_app com contexto ativo', async () => {
    await setSessionContext(appClient, { orgId, userId });

    const clientId = crypto.randomUUID();

    // 1. INSERT
    await appClient.query(`
      INSERT INTO public.clients (id, organization_id, name, document_number, email, updated_at)
      VALUES ('${clientId}', '${orgId}', 'Doutor Silva', '12345678901', 'silva@cliente.test', now());
    `);

    // 2. SELECT
    const selectRes = await appClient.query(`
      SELECT id, name, document_number, is_active FROM public.clients WHERE id = '${clientId}';
    `);
    expect(selectRes.rows).toHaveLength(1);
    expect(selectRes.rows[0].name).toBe('Doutor Silva');
    expect(selectRes.rows[0].is_active).toBe(true);

    // 3. UPDATE
    await appClient.query(`
      UPDATE public.clients
      SET name = 'Doutor Silva Atualizado', is_active = false
      WHERE id = '${clientId}';
    `);

    const updateRes = await appClient.query(`
      SELECT name, is_active FROM public.clients WHERE id = '${clientId}';
    `);
    expect(updateRes.rows[0].name).toBe('Doutor Silva Atualizado');
    expect(updateRes.rows[0].is_active).toBe(false);
  });

  it('deve permitir INSERT e SELECT de tarefas e comentários', async () => {
    await setSessionContext(appClient, { orgId, userId });

    const taskId = crypto.randomUUID();

    // 1. Inserir tarefa
    await appClient.query(`
      INSERT INTO public.tasks (id, organization_id, title, description, status, priority, updated_at)
      VALUES ('${taskId}', '${orgId}', 'Petição Inicial', 'Elaborar petição de cobrança', 'todo', 'high', now());
    `);

    // 2. Inserir comentário
    await appClient.query(`
      INSERT INTO public.task_comments (id, organization_id, task_id, author_id, content)
      VALUES (gen_random_uuid(), '${orgId}', '${taskId}', '${userId}', 'Documentos recebidos do cliente.');
    `);

    // 3. Consulta com JOIN
    const res = await appClient.query(`
      SELECT t.title, c.content
      FROM public.tasks t
      JOIN public.task_comments c ON t.id = c.task_id
      WHERE t.id = '${taskId}';
    `);

    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].title).toBe('Petição Inicial');
    expect(res.rows[0].content).toBe('Documentos recebidos do cliente.');
  });

  it('deve permitir INSERT de log de auditoria, mas bloquear sua alteração', async () => {
    await setSessionContext(appClient, { orgId, userId });

    const logId = crypto.randomUUID();

    // INSERT é permitido para registrar eventos auditados
    await appClient.query(`
      INSERT INTO public.audit_logs (id, organization_id, user_id, action, entity, entity_id)
      VALUES ('${logId}', '${orgId}', '${userId}', 'create', 'client', '${crypto.randomUUID()}');
    `);

    const res = await appClient.query(`SELECT action, entity FROM public.audit_logs WHERE id = '${logId}';`);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].action).toBe('create');

    // Tentativa de alterar o log gravado é bloqueada no nível de privilégio do banco
    await expect(
      appClient.query(`UPDATE public.audit_logs SET action = 'tampered' WHERE id = '${logId}';`)
    ).rejects.toThrow(/(permission denied|permissão negada)/i);
  });
});
