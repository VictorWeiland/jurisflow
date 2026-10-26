const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[trimmed.slice(0, idx).trim()] = val;
  }
});

function parseSafe(conn) {
  if (!conn) return { host: 'não configurado', user: 'não configurado', rawUserFormat: 'não configurado' };
  try {
    const u = new URL(conn);
    const rawUser = decodeURIComponent(u.username);
    const baseUser = rawUser.split('.')[0];
    const hasProjectRef = rawUser.includes('.');
    return {
      host: `${u.host}${u.port ? ':' + u.port : ''}`,
      baseUser,
      rawUserFormat: hasProjectRef ? `${baseUser}.[PROJECT_REF]` : baseUser,
    };
  } catch (_) {
    return { host: 'inválido', user: 'inválido', rawUserFormat: 'inválido' };
  }
}

async function run() {
  console.log('--- Verificação de Conexão e Atributos de Papel em pg_roles ---');

  const directInfo = parseSafe(env.DIRECT_URL);
  const dbInfo = parseSafe(env.DATABASE_URL);

  let directClient;
  let dbClient;

  // 1. Testa DIRECT_URL
  try {
    directClient = new Client({
      connectionString: env.DIRECT_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    await directClient.connect();
    console.log(`- DIRECT_URL [Host: ${directInfo.host} | Usuário: ${directInfo.rawUserFormat}]: [OK] Conectado.`);
  } catch (err) {
    const safeError = err.message.replace(/:\/\/[^:]+:[^@]+@/g, '://***:***@');
    console.log(`- DIRECT_URL [Host: ${directInfo.host} | Usuário: ${directInfo.rawUserFormat}]: [FALHA] ${safeError}`);
  }

  // 2. Testa DATABASE_URL (jurisflow_app)
  try {
    dbClient = new Client({
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    await dbClient.connect();
    console.log(`- DATABASE_URL [Host: ${dbInfo.host} | Usuário: ${dbInfo.rawUserFormat}]: [OK] Conectado.`);

    // Consulta pg_roles diretamente
    const roleRes = await dbClient.query(
      "SELECT rolname, rolsuper, rolbypassrls, rolinherit, rolcanlogin FROM pg_roles WHERE rolname = 'jurisflow_app';"
    );
    if (roleRes.rows.length === 0) {
      console.log("- Consulta pg_roles: Papel 'jurisflow_app' NÃO encontrado!");
    } else {
      const row = roleRes.rows[0];
      console.log(`- Consulta pg_roles ('jurisflow_app'):`);
      console.log(`    rolsuper: ${row.rolsuper} (esperado: false)`);
      console.log(`    rolbypassrls: ${row.rolbypassrls} (esperado: false)`);
      console.log(`    rolcanlogin: ${row.rolcanlogin} (esperado: true)`);
    }
  } catch (err) {
    const safeError = err.message.replace(/:\/\/[^:]+:[^@]+@/g, '://***:***@');
    console.log(`- DATABASE_URL [Host: ${dbInfo.host} | Usuário: ${dbInfo.rawUserFormat}]: [FALHA] ${safeError}`);
  }

  try { if (directClient) await directClient.end(); } catch (_) {}
  try { if (dbClient) await dbClient.end(); } catch (_) {}
  console.log('----------------------------------------------------------------');
}

run();
