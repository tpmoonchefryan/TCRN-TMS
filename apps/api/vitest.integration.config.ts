// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { transform } from '@swc/core';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const nestDecoratorMetadataPlugin = (): Plugin => ({
  name: 'nest-decorator-metadata',
  enforce: 'pre',
  async transform(code, id) {
    const [filename] = id.split('?', 1);

    if (
      !filename.endsWith('.ts') ||
      filename.includes('/node_modules/') ||
      filename.includes('/dist/')
    ) {
      return null;
    }

    const result = await transform(code, {
      filename,
      sourceMaps: true,
      module: {
        type: 'es6',
      },
      jsc: {
        target: 'es2021',
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    });

    return {
      code: result.code,
      map: result.map ? JSON.parse(result.map) : null,
    };
  },
});

export default defineConfig({
  plugins: [nestDecoratorMetadataPlugin()],
  esbuild: false,
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/integration/vitest.setup.ts'],
    include: [
      'test/integration/**/*.{test,spec}.ts',
      'src/testing/isolation/**/*.{test,spec}.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // These suites exercise real integration boundaries and can need local services.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tcrn/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@tcrn/database': path.resolve(__dirname, '../../packages/database/src'),
    },
  },
});
