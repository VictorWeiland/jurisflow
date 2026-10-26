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
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

function getRefFromUrl(u) {
  if (!u) return null;
  const m = u.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  return m ? m[1] : null;
}

function getRefFromConn(u) {
  if (!u) return null;
  const m = u.match(/postgres\.([a-z0-9]+)/);
  if (m) return m[1];
  const m2 = u.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (m2) return m2[1];
  return null;
}

function getRefFromJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.ref || null;
  } catch (_) {
    return null;
  }
}

const urlRef = getRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
const dbRef = getRefFromConn(env.DATABASE_URL);
const directRef = getRefFromConn(env.DIRECT_URL);

const pubKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const pubRef = getRefFromJwt(pubKey);
const secRef = getRefFromJwt(secKey);

console.log('--- Validação de Coerência de Projeto (sem dados sensíveis) ---');
console.log('1. ID extraído de NEXT_PUBLIC_SUPABASE_URL presente:', Boolean(urlRef));
console.log('2. Coincide com ID de DATABASE_URL:', urlRef === dbRef);
console.log('3. Coincide com ID de DIRECT_URL:', urlRef === directRef);

if (pubRef) {
  console.log('4. Coincide com o ID presente na Chave Pública (JWT):', urlRef === pubRef);
} else {
  console.log('4. Chave Pública presente (formato moderno de API key):', Boolean(pubKey));
}

if (secRef) {
  console.log('5. Coincide com o ID presente na Chave Secreta (JWT):', urlRef === secRef);
} else {
  console.log('5. Chave Secreta presente (formato moderno de API key):', Boolean(secKey));
}

const allMatch = Boolean(urlRef && (urlRef === dbRef) && (urlRef === directRef) && (!pubRef || urlRef === pubRef) && (!secRef || urlRef === secRef));
console.log('Resultado Final:', allMatch ? 'TODAS AS VARIÁVEIS SÃO DO MESMO PROJETO [OK]' : 'DIVERGÊNCIA ENCONTRADA [FALHA]');
console.log('----------------------------------------------------------------');
