// Builds the site into ./dist: one JS bundle, one CSS file, index.html and static files.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dev = process.argv.includes('--dev');
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });

await build({
  entryPoints: { app: 'src/main.tsx' },
  outdir: 'dist/assets',
  bundle: true,
  format: 'esm',
  minify: !dev,
  sourcemap: dev,
  target: ['es2020'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production') },
  logLevel: 'info',
});
await build({ entryPoints: { app: 'src/styles.css' }, outdir: 'dist/assets', bundle: true, minify: !dev, logLevel: 'info' });

// Cache-bust: tie each asset URL to its content so a new deploy never mixes old and new files.
const v = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 10);
const html = readFileSync('index.html', 'utf8')
  .replace('/assets/app.css', `/assets/app.css?v=${v('dist/assets/app.css')}`)
  .replace('/assets/app.js', `/assets/app.js?v=${v('dist/assets/app.js')}`);
writeFileSync('dist/index.html', html);
cpSync('public', 'dist', { recursive: true });
console.log('Built dist/');
