const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error('DIRECT_URL não definida.');
  process.exit(1);
}

async function run() {
  console.log('=== VERIFICAÇÃO DE LEITURA NO SUPABASE CLOUD (São Paulo) ===\n');

  const client = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();

    // (a) Lista das tabelas criadas, incluindo _prisma_migrations
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`(a) Tabelas criadas no schema public (${tables.length} tabelas encontradas):`);
    console.log(tables.join(', '));
    console.log(`    Presença de '_prisma_migrations': ${tables.includes('_prisma_migrations') ? 'SIM [OK]' : 'NÃO [FALHA]'}\n`);

    // (b) RLS ativo e FORCE ativo nas 31 tabelas que deveriam ter
    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND relname NOT IN ('_prisma_migrations', 'roles', 'permissions', 'role_permissions', 'subscription_plans', 'subprocessors')
      ORDER BY relname;
    `);
    console.log(`(b) Verificação de RLS e FORCE RLS (${rlsRes.rows.length} tabelas com isolamento):`);
    const allRlsOk = rlsRes.rows.every(r => r.relrowsecurity === true && r.relforcerowsecurity === true);
    console.log(`    Todas as ${rlsRes.rows.length} tabelas têm relrowsecurity=true e relforcerowsecurity=true: ${allRlsOk ? 'SIM [OK]' : 'NÃO [FALHA]'}\n`);

    // (c) has_table_privilege, has_sequence_privilege e has_function_privilege para anon e authenticated
    const anonTables = await client.query(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE');
    `);

    const authTables = await client.query(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND has_table_privilege('authenticated', c.oid, 'SELECT, INSERT, UPDATE, DELETE');
    `);

    const seqRes = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
        AND (
          has_sequence_privilege('anon', 'public.' || quote_ident(sequence_name), 'USAGE, SELECT')
          OR has_sequence_privilege('authenticated', 'public.' || quote_ident(sequence_name), 'USAGE, SELECT')
        );
    `);

    const funcRes = await client.query(`
      SELECT p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND (
          has_function_privilege('anon', p.oid, 'EXECUTE')
          OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
        );
    `);

    console.log('(c) Privilégios para anon e authenticated no schema public:');
    console.log(`    Tabelas acessíveis por anon: ${anonTables.rows.length}`);
    console.log(`    Tabelas acessíveis por authenticated: ${authTables.rows.length}`);
    console.log(`    Sequences acessíveis por anon ou authenticated: ${seqRes.rows.length}`);
    console.log(`    Funções executáveis por anon ou authenticated: ${funcRes.rows.length}`);
    const zeroAccessOk = (
      anonTables.rows.length === 0 &&
      authTables.rows.length === 0 &&
      seqRes.rows.length === 0 &&
      funcRes.rows.length === 0
    );
    console.log(`    Resultado PostgREST Zero Acessos: ${zeroAccessOk ? '100% ZERO ACESSOS [OK]' : 'FALHA'}\n`);

    // (d) Contagem de linhas em dados globais
    const rolesCount = await client.query('SELECT count(*) as c FROM public.roles;');
    const permCount = await client.query('SELECT count(*) as c FROM public.permissions;');
    const rolePermCount = await client.query('SELECT count(*) as c FROM public.role_permissions;');
    const plansCount = await client.query('SELECT count(*) as c FROM public.subscription_plans;');
    const subpCount = await client.query('SELECT count(*) as c FROM public.subprocessors;');
    console.log('(d) Contagem de linhas nas tabelas de dados globais:');
    console.log(`    roles: ${rolesCount.rows[0].c} linhas`);
    console.log(`    permissions: ${permCount.rows[0].c} linhas`);
    console.log(`    role_permissions: ${rolePermCount.rows[0].c} linhas`);
    console.log(`    subscription_plans: ${plansCount.rows[0].c} linhas`);
    console.log(`    subprocessors: ${subpCount.rows[0].c} linhas\n`);

    // (e) As duas funções SECURITY DEFINER existem e apenas jurisflow_app tem EXECUTE
    const funcsRes = await client.query(`
      SELECT p.proname, p.prosecdef,
             has_function_privilege('jurisflow_app', p.oid, 'EXECUTE') as app_execute,
             has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_execute,
             has_function_privilege('public', p.oid, 'EXECUTE') as public_execute
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('create_organization_with_owner', 'accept_invitation')
      ORDER BY p.proname;
    `);
    console.log('(e) Funções SECURITY DEFINER e privilégios de execução:');
    for (const f of funcsRes.rows) {
      console.log(`    - ${f.proname}:`);
      console.log(`        SECURITY DEFINER (prosecdef): ${f.prosecdef}`);
      console.log(`        jurisflow_app tem EXECUTE: ${f.app_execute}`);
      console.log(`        anon tem EXECUTE: ${f.anon_execute}`);
      console.log(`        authenticated tem EXECUTE: ${f.auth_execute}`);
      console.log(`        public tem EXECUTE: ${f.public_execute}`);
    }
    const funcsOk = funcsRes.rows.length === 2 && funcsRes.rows.every(f => f.prosecdef && f.app_execute && !f.anon_execute && !f.auth_execute && !f.public_execute);
    console.log(`    Status das funções: ${funcsOk ? 'VÁLIDAS E RESTRITAS [OK]' : 'FALHA'}\n`);

    // (f) jurisflow_app continua com rolsuper e rolbypassrls falsos
    const roleRes = await client.query(`
      SELECT rolname, rolsuper, rolbypassrls, rolinherit, rolcanlogin
      FROM pg_roles
      WHERE rolname = 'jurisflow_app';
    `);
    console.log('(f) Atributos de segurança do papel jurisflow_app:');
    const roleRow = roleRes.rows[0];
    console.log(`    rolsuper: ${roleRow.rolsuper} (esperado: false)`);
    console.log(`    rolbypassrls: ${roleRow.rolbypassrls} (esperado: false)`);
    console.log(`    rolcanlogin: ${roleRow.rolcanlogin} (esperado: true)`);
    const roleOk = roleRow.rolsuper === false && roleRow.rolbypassrls === false && roleRow.rolcanlogin === true;
    console.log(`    Status do papel: ${roleOk ? 'CONFORME [OK]' : 'FALHA'}\n`);

  } catch (err) {
    console.error('Erro durante a verificação de leitura:', err.message);
  } finally {
    await client.end();
  }
}

run();
