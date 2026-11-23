import * as esbuild from 'esbuild';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const sharedConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external: ['better-sqlite3', 'typescript'],
  banner: {
    js: "import { createRequire as __repodocCreateRequire } from 'node:module'; const require = __repodocCreateRequire(import.meta.url);",
  },
  sourcemap: false,
  minify: false,
};

await esbuild.build({
  ...sharedConfig,
  entryPoints: [path.join(rootDir, 'apps/cli/src/bin.ts')],
  outfile: path.join(rootDir, 'dist/repodoc.mjs'),
});

await esbuild.build({
  ...sharedConfig,
  entryPoints: [path.join(rootDir, 'apps/mcp-server/src/bin.ts')],
  outfile: path.join(rootDir, 'dist/repodoc-mcp.mjs'),
});

console.log('Bundled dist/repodoc.mjs and dist/repodoc-mcp.mjs');
