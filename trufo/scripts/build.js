/**
 * Build script: validates the extension before packaging.
 * Checks that all files referenced in manifest.json exist.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const filesToCheck = [
  manifest.action?.default_popup,
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
].filter(Boolean);

let ok = true;
for (const file of filesToCheck) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.error(`MISSING: ${file}`);
    ok = false;
  } else {
    console.log(`OK: ${file}`);
  }
}

if (!ok) {
  console.error('\nBuild failed: missing files.');
  process.exit(1);
} else {
  console.log('\nAll files present. Extension is ready to load or zip.');
}
