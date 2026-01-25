// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node20',
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  external: ['@tcrn/database', '@tcrn/shared'],
});
