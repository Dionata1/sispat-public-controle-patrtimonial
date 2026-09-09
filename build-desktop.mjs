import fs from 'node:fs';
import path from 'node:path';
import { build as esbuild } from 'esbuild';
import { compile } from 'tailwindcss';

const root = process.cwd();
const out = path.join(root, 'desktop-dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });

await esbuild({
  entryPoints: [path.join(root, 'src/main.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome120'],
  jsx: 'automatic',
  minify: true,
  sourcemap: false,
  outfile: path.join(out, 'assets/app.js'),
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  define: {
    'process.env.NODE_ENV': '"production"',
    'global': 'globalThis'
  },
});

// Tailwind v4 core compiler, without platform-specific Vite/Rollup native addons.
const tailwindIndex = fs.readFileSync(path.join(root, 'node_modules/tailwindcss/index.css'), 'utf8');
const compiler = await compile(tailwindIndex);

const srcFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(tsx?|html)$/.test(name)) srcFiles.push(full);
  }
}
walk(path.join(root, 'src'));
srcFiles.push(path.join(root, 'index.html'));

const text = srcFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
// Deliberately permissive scanner: Tailwind ignores invalid candidates.
const tokens = text.match(/[!@A-Za-z0-9_:\-\/\.\[\]#%(),+'"=]+/g) || [];
const candidates = [...new Set(tokens.map(t => t.replace(/^["'`]+|["'`,;]+$/g, '')).filter(Boolean))];
const css = compiler.build(candidates);
fs.writeFileSync(path.join(out, 'assets/app.css'), css);

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#020617" />
  <title>SISPAT Public 4.0 Desktop</title>
  <link rel="stylesheet" href="/assets/app.css" />
</head>
<body class="bg-slate-950">
  <div id="root"></div>
  <script type="module" src="/assets/app.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(out, 'index.html'), html);

console.log(`Desktop web build OK: ${out}`);
console.log(`Tailwind candidates: ${candidates.length}; CSS: ${(Buffer.byteLength(css)/1024).toFixed(1)} KB`);
