const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Ler o .env.local diretamente
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

function getHost(connectionString) {
  if (!connectionString) return 'não definida';
  try {
    const u = new URL(connectionString);
    return `${u.host}${u.port ? ':' + u.port : ''}`;
  } catch (_) {
    return 'URL inválida';
  }
}

async function testConnection(name, connectionString) {
  const host = getHost(connectionString);

  if (!connectionString) {
    console.log(`- ${name} [${host}]: Variável não encontrada.`);
    return false;
  }

  const isSupabase = connectionString.includes('supabase.com') || connectionString.includes('supabase.co');

  const client = new Client({
    connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT current_database();');
    console.log(`- ${name} [${host}]: [OK] Conectado com sucesso.`);
    await client.end();
    return true;
  } catch (err) {
    // Redigir qualquer menção a senha ou usuário
    const safeError = err.message
      .replace(/:\/\/[^:]+:[^@]+@/g, '://***:***@')
      .replace(/password authentication failed for user "[^"]+"/g, 'password authentication failed');
    console.log(`- ${name} [${host}]: [FALHA] ${safeError}`);
    try { await client.end(); } catch (_) {}
    return false;
  }
}

async function run() {
  console.log('Resultados dos testes de conexão:');
  await testConnection('TEST_DATABASE_URL', env.TEST_DATABASE_URL);
  await testConnection('DATABASE_URL', env.DATABASE_URL);
  await testConnection('DIRECT_URL', env.DIRECT_URL);
}

run();
