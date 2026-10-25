// Builds the site into ./dist: one JS bundle, one CSS file, index.html and static files.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';

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

copyFileSync('index.html', 'dist/index.html');
cpSync('public', 'dist', { recursive: true });
console.log('Built dist/');
