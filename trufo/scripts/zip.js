/**
 * Packages the extension into a .zip for Chrome Web Store upload.
 * Output: dist/trufo-v{version}.zip
 * Run: node scripts/zip.js
 */
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const version = manifest.version;

const distDir = path.join(ROOT, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const output = fs.createWriteStream(path.join(distDir, `trufo-v${version}.zip`));
const archive = archiver('zip', { zlib: { level: 9 } });

const IGNORE = [
  'node_modules', 'dist', 'scripts', '.git', '.github',
  'package.json', 'package-lock.json', 'README.md', '.gitignore',
];

output.on('close', () =>
  console.log(`Packaged: dist/trufo-v${version}.zip (${archive.pointer()} bytes)`)
);
archive.on('error', (err) => { throw err; });

archive.pipe(output);

fs.readdirSync(ROOT).forEach((item) => {
  if (IGNORE.includes(item)) return;
  const fullPath = path.join(ROOT, item);
  if (fs.statSync(fullPath).isDirectory()) {
    archive.directory(fullPath, item);
  } else {
    archive.file(fullPath, { name: item });
  }
});

archive.finalize();
