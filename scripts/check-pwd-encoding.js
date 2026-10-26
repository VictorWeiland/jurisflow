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

const direct = env.DIRECT_URL || '';
try {
  const m = direct.match(/:\/\/[^:]+:([^@]+)@/);
  if (m) {
    const pwd = m[1];
    const hasSpecial = /[\#\%\&\?\+\/\\]/.test(pwd);
    console.log('Senha de DIRECT_URL contém caracteres especiais não escapados:', hasSpecial);
  }
} catch (_) {}
