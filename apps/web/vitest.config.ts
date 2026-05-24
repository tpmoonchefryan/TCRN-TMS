import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    hookTimeout: 15000,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
  },
});
