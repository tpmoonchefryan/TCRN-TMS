// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  // Keep dist intact during watch startup so workspace consumers do not observe a missing-module window.
  clean: !options.watch,
  external: ['@prisma/client'],
}));
