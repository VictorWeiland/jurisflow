const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let directUrl = '';
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    if (key === 'DIRECT_URL') {
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      directUrl = val;
    }
  }
});

if (!directUrl) {
  console.log('DIRECT_URL não encontrada no .env.local');
  process.exit(1);
}

let host = 'desconhecido';
let port = 'desconhecido';
let baseUser = 'desconhecido';

try {
  const u = new URL(directUrl);
  host = u.hostname;
  port = u.port || '5432';
  const rawUser = decodeURIComponent(u.username);
  baseUser = rawUser.split('.')[0];
} catch (e) {
  console.log('Erro ao analisar formato da DIRECT_URL');
  process.exit(1);
}

const client = new Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

client.connect()
  .then(() => client.query('SELECT 1 as result;'))
  .then(() => {
    console.log(`Host: ${host}`);
    console.log(`Porta: ${port}`);
    console.log(`Usuário-base: ${baseUser}`);
    console.log(`Resultado: [OK]`);
    return client.end();
  })
  .catch(err => {
    const safeError = err.message.replace(/:\/\/[^:]+:[^@]+@/g, '://***:***@');
    console.log(`Host: ${host}`);
    console.log(`Porta: ${port}`);
    console.log(`Usuário-base: ${baseUser}`);
    console.log(`Resultado: [FALHA] ${safeError}`);
    return client.end().catch(() => {});
  });
