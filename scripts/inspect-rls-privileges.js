const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();

  console.log('=== ITEM 1: LISTA DAS 31 TABELAS COM RLS E FORCE RLS ===');
  const rlsRes = await client.query(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
    ORDER BY c.relname;
  `);

  rlsRes.rows.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.relname} (RLS: ${r.relrowsecurity}, FORCE: ${r.relforcerowsecurity})`);
  });
  console.log(`Total com RLS ativo: ${rlsRes.rows.length}`);

  console.log('\n=== CONFIRMAÇÃO DAS TABELAS GLOBAIS (SEM RLS DE TENANT) ===');
  const globalRes = await client.query(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN ('roles', 'permissions', 'role_permissions', 'subscription_plans', 'subprocessors', '_prisma_migrations')
    ORDER BY c.relname;
  `);
  globalRes.rows.forEach(r => {
    console.log(`- ${r.relname}: RLS=${r.relrowsecurity}, FORCE=${r.relforcerowsecurity}`);
  });

  console.log('\n=== ITEM 2: ESTADO DE RLS EM terms_acceptances E notification_preferences ===');
  const specificRes = await client.query(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('terms_acceptances', 'notification_preferences');
  `);
  for (const r of specificRes.rows) {
    console.log(`Tabela: ${r.relname}`);
    console.log(`  RLS ativo: ${r.relrowsecurity}`);
    console.log(`  FORCE RLS ativo: ${r.relforcerowsecurity}`);
    
    const polRes = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = '${r.relname}';
    `);
    for (const p of polRes.rows) {
      console.log(`  Política: ${p.policyname}`);
      console.log(`    Tipo: ${p.permissive}`);
      console.log(`    Papéis: ${p.roles}`);
      console.log(`    Comando: ${p.cmd}`);
      console.log(`    USING (qual): ${p.qual}`);
      console.log(`    WITH CHECK: ${p.with_check}`);
    }
  }

  console.log('\n=== ITEM 3: CONFIRMAÇÃO has_table_privilege PARA jurisflow_app EM TABELAS GLOBAIS ===');
  const globals = ['roles', 'permissions', 'role_permissions', 'subscription_plans', 'subprocessors'];
  for (const t of globals) {
    const privRes = await client.query(`
      SELECT 
        has_table_privilege('jurisflow_app', 'public.' || quote_ident('${t}'), 'SELECT') as can_select,
        has_table_privilege('jurisflow_app', 'public.' || quote_ident('${t}'), 'INSERT') as can_insert,
        has_table_privilege('jurisflow_app', 'public.' || quote_ident('${t}'), 'UPDATE') as can_update,
        has_table_privilege('jurisflow_app', 'public.' || quote_ident('${t}'), 'DELETE') as can_delete;
    `);
    const p = privRes.rows[0];
    console.log(`- ${t}: SELECT=${p.can_select}, INSERT=${p.can_insert}, UPDATE=${p.can_update}, DELETE=${p.can_delete}`);
  }

  await client.end();
}

run();
