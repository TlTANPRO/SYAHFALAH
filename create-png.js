// Create minimal valid PNG files (1x1 transparent) as base64
const fs = require('fs');
const path = require('path');

// Minimal 1x1 transparent PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(pngBase64, 'base64');

const iconsDir = path.join(__dirname, 'public', 'icons');
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), pngBuffer);

console.log('Created PNG placeholders');
