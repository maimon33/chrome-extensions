/**
 * Generate PNG icons from an SVG source using Sharp.
 * Run: node scripts/generate-icons.js
 * Requires: npm install sharp (dev dependency)
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Lock icon with Trufo's blue-purple gradient
const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <circle cx="50" cy="50" r="48" fill="url(#bg)"/>
  <!-- Lock body -->
  <rect x="28" y="48" width="44" height="32" rx="5" fill="white"/>
  <!-- Lock shackle -->
  <path d="M36 48 L36 36 C36 22 64 22 64 36 L64 48"
        fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/>
  <!-- Keyhole circle -->
  <circle cx="50" cy="63" r="5" fill="#667eea"/>
  <!-- Keyhole stem -->
  <rect x="47" y="66" width="6" height="8" rx="2" fill="#667eea"/>
</svg>
`;

const sizes = [16, 48, 128];
const outDir = path.resolve(__dirname, '../icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

Promise.all(
  sizes.map((size) =>
    sharp(Buffer.from(SVG))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon${size}.png`))
      .then(() => console.log(`Generated icon${size}.png`))
  )
).then(() => console.log('All icons generated.')).catch(console.error);
