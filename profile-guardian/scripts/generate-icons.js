/**
 * Generate PNG icons from an SVG source using Sharp.
 * Run: node scripts/generate-icons.js
 * Requires: npm install sharp (dev dependency)
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Inline SVG: shield with a checkmark
const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2d3748"/>
      <stop offset="100%" style="stop-color:#4a5568"/>
    </linearGradient>
  </defs>
  <!-- Shield body -->
  <path d="M50 8 L85 22 L85 50 C85 70 65 88 50 94 C35 88 15 70 15 50 L15 22 Z"
        fill="url(#g)" stroke="#e2e8f0" stroke-width="2"/>
  <!-- Lock icon -->
  <rect x="35" y="52" width="30" height="22" rx="3" fill="#48bb78"/>
  <path d="M38 52 L38 46 C38 38 62 38 62 46 L62 52" fill="none" stroke="#48bb78" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="62" r="3" fill="#fff"/>
  <line x1="50" y1="64" x2="50" y2="68" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
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
