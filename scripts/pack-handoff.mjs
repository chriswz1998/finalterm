#!/usr/bin/env node
/**
 * Create handoff zip for sharing health-link standalone.
 * Usage: node scripts/pack-handoff.mjs [--full]
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'handoff');
const includeDeps = process.argv.includes('--full');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const zipName = includeDeps
  ? `health-link-handoff-full-${stamp}.zip`
  : `health-link-handoff-${stamp}.zip`;
const zipPath = path.join(OUT_DIR, zipName);
const folderName = path.basename(ROOT);
const parentDir = path.dirname(ROOT);

const EXCLUDE = [
  `${folderName}/node_modules/*`,
  `${folderName}/dist/*`,
  `${folderName}/handoff/*`,
  `${folderName}/.git/*`,
  `${folderName}/.env.local`,
  `${folderName}/.env.locaY`,
  `${folderName}/.DS_Store`,
  `${folderName}/src/.DS_Store`,
  `${folderName}/*.log`,
  `${folderName}/coverage/*`,
];

if (includeDeps) {
  EXCLUDE.splice(EXCLUDE.indexOf(`${folderName}/node_modules/*`), 1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Remove stale zip if re-running same day
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

console.log('\n=== Health Link Handoff Pack ===');
console.log(`Mode: ${includeDeps ? 'full (with node_modules)' : 'slim (source only, git archive)'}`);
console.log(`Output: ${zipPath}\n`);

if (includeDeps) {
  execFileSync(
    'zip',
    ['-r', zipPath, folderName, ...EXCLUDE.flatMap((pattern) => ['-x', pattern])],
    { cwd: parentDir, stdio: 'inherit' },
  );
} else {
  // Slim pack: git-tracked files only (no .git, node_modules, .env.local)
  execFileSync('git', ['archive', '--format=zip', '--prefix=health-link/', '-o', zipPath, 'HEAD'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
console.log(`\n✓ Created ${zipName} (${sizeMb} MB)`);
console.log('  Send zip + .env.local (separately) to your teammate.\n');
