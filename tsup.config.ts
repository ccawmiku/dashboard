import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['apps/server/src/main.ts'],
  outDir: 'dist/server',
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
