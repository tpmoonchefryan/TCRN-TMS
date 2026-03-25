// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Root Vitest is intentionally reserved for root-only utility tests.
    // Workspace tests run through package-level configs and root pnpm/turbo scripts.
    include: ['tests/root/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '.references/**',
      'e2e/**',
      '**/e2e/**',
      'apps/**',
      'packages/**',
    ],
    passWithNoTests: true,
  },
});
