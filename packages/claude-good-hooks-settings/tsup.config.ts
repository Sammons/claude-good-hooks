import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Temporarily disable DTS to test basic build
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'node18',
});
