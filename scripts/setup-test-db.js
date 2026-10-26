const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error('TEST_DATABASE_URL não configurada no .env.local');
  process.exit(1);
}

async function run() {
  console.log('--- Configurando Banco de Dados de Testes Local (jurisflow_test) ---');

  // 1. Conecta ao banco de controle (postgres) para garantir existência dos papéis e banco
  const parsed = new URL(testUrl);
  const controlUrl = `${parsed.protocol}//${parsed.username}:${parsed.password}@${parsed.host}/postgres`;

  const controlClient = new Client({ connectionString: controlUrl });
  try {
    await controlClient.connect();
    
    const testAppPassword = process.env.TEST_APP_PASSWORD || 'jurisflow_test_password';

    // Cria papéis anon, authenticated e jurisflow_app se não existirem
    await controlClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;

        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;

        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jurisflow_app') THEN
          CREATE ROLE jurisflow_app WITH LOGIN PASSWORD '${testAppPassword}' NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
        ELSE
          ALTER ROLE jurisflow_app WITH LOGIN PASSWORD '${testAppPassword}' NOBYPASSRLS NOSUPERUSER;
        END IF;
      END
      $$;
    `);
    console.log('[OK] Papéis jurisflow_app (sem superuser e sem bypassrls), anon e authenticated verificados.');

    // Verifica existência do banco jurisflow_test
    const dbRes = await controlClient.query("SELECT 1 FROM pg_database WHERE datname = 'jurisflow_test';");
    if (dbRes.rows.length === 0) {
      await controlClient.query("CREATE DATABASE jurisflow_test;");
      console.log("[OK] Banco de dados 'jurisflow_test' criado com sucesso.");
    }
  } catch (err) {
    console.error('Erro ao conectar ao banco de controle postgres:', err.message);
    process.exit(1);
  } finally {
    await controlClient.end();
  }

  // 2. Conecta ao jurisflow_test como superusuário postgres para recriar schema e aplicar migração
  const testClient = new Client({ connectionString: testUrl });
  try {
    await testClient.connect();

    // Limpa o schema public do banco de testes para garantir reprodutibilidade
    await testClient.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT USAGE ON SCHEMA public TO public;

      -- Schema auth para emular Supabase Auth localmente nos testes
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        email_confirmed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      GRANT USAGE ON SCHEMA auth TO jurisflow_app;
      GRANT SELECT ON auth.users TO jurisflow_app;

      -- Configura permissões base para jurisflow_app no public
      GRANT USAGE ON SCHEMA public TO jurisflow_app;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jurisflow_app;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jurisflow_app;

      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jurisflow_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO jurisflow_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO jurisflow_app;

      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;
    `);
    console.log('[OK] Schema public limpo e schema auth configurado.');

    // Lê e executa o migration.sql
    const migrationFile = path.resolve(__dirname, '..', 'prisma', 'migrations', '20261026000000_init', 'migration.sql');
    const migrationSql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Executando migração 20261026000000_init no jurisflow_test...');
    await testClient.query(migrationSql);
    console.log('[OK] Migração 20261026000000_init aplicada com sucesso no jurisflow_test!');

  } catch (err) {
    console.error('Erro ao aplicar migração no jurisflow_test:', err.message);
    process.exit(1);
  } finally {
    await testClient.end();
  }

  console.log('--- Setup do Banco de Testes Local Concluído com Sucesso ---');
}

run();
