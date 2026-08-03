const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const standalonePublicDir = path.join(__dirname, '..', '.next', 'standalone', 'public');

if (fs.existsSync(publicDir)) {
  fs.mkdirSync(standalonePublicDir, { recursive: true });
  fs.cpSync(publicDir, standalonePublicDir, { recursive: true });
  console.log('✓ Copied public/ to .next/standalone/public/');
} else {
  console.error('✗ public/ directory not found');
  process.exit(1);
}