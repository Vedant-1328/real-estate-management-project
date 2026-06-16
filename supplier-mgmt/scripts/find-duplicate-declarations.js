/**
 * Find duplicate const/function declarations in the same scope (same file).
 * Run: node supplier-mgmt/scripts/find-duplicate-declarations.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const roots = [
  path.join(__dirname, '../frontend/src'),
  path.join(__dirname, '../backend'),
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.(jsx?|tsx?)$/.test(name)) files.push(p);
  }
  return files;
}

const declRe = /^\s*(?:export\s+)?(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/;

for (const root of roots) {
  for (const file of walk(root)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const seen = new Map();
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(declRe);
      if (!m) continue;
      const name = m[1];
      if (seen.has(name)) {
        console.log(`${file}:${i + 1}: duplicate '${name}' (first at ${seen.get(name)})`);
      } else {
        seen.set(name, i + 1);
      }
    }
  }
}
