import fs from 'fs';
import path from 'path';

const pagesDir = 'src/pages';

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.jsx')) files.push(p);
  }
  return files;
}

for (const file of walk(pagesDir)) {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes('loading={loading}')) continue;
  const next = s.replace(/(\n\s*\/>\n)(\s*\)\}\n)(\s*<\/div>)/g, '$1$3');
  if (next !== s) {
    fs.writeFileSync(file, next);
    console.log('fixed', file);
  }
}
