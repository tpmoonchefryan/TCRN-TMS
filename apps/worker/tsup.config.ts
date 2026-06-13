// SPDX-License-Identifier: Apache-2.0
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
