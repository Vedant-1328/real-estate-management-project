/**
 * Remove consecutive duplicate lines (imports, const, export) from source trees.
 * Run: node supplier-mgmt/scripts/dedupe-lines.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const roots = [
  path.join(__dirname, '../frontend/src'),
  path.join(__dirname, '../backend'),
];

const shouldDedupe = (line) => {
  const t = line.trim();
  if (!t) return false;
  return (
    t.startsWith('import ') ||
    t.startsWith('export ') ||
    t.startsWith('const ') ||
    t.startsWith('let ') ||
    t.startsWith('var ')
  );
};

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.(jsx?|tsx?)$/.test(name)) files.push(p);
  }
  return files;
}

let totalRemoved = 0;
const changed = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const out = [];
    let removed = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        i > 0 &&
        shouldDedupe(line) &&
        shouldDedupe(lines[i - 1]) &&
        line.trim() === lines[i - 1].trim()
      ) {
        removed++;
        continue;
      }
      out.push(line);
    }
    if (removed > 0) {
      fs.writeFileSync(file, out.join('\n') + (lines.at(-1) === '' ? '\n' : ''));
      totalRemoved += removed;
      changed.push({ file, removed });
    }
  }
}

console.log(`Removed ${totalRemoved} duplicate lines in ${changed.length} files`);
changed.forEach(({ file, removed }) => console.log(`  ${removed}x ${file}`));
