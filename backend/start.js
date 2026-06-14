require('dotenv/config');

const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.dirname(__filename);

console.log('[START] Backend dir:', backendDir);
console.log('[START] Running migrations...');

try {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: backendDir,
  });
  console.log('[START] Migrations completed');
} catch (err) {
  console.error('[START] Migration failed:', err.message);
  process.exit(1);
}

console.log('[START] Starting server...');
require('./dist/src/server.js');
