// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // These tests should be run with package-specific configs:
    // - E2E tests use Playwright
    // - Integration tests need complete NestJS modules, run with: pnpm test:integration
    // - Web tests need jsdom environment, run with: pnpm --filter @tcrn/web exec vitest
    // - Worker/PII tests need process isolation
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/**',
      '**/e2e/**',
      '**/test/integration/**',
      '**/testing/isolation/**',
      'apps/web/**',       // Use: pnpm --filter @tcrn/web exec vitest
      'apps/worker/**',    // Use: pnpm --filter @tcrn/worker exec vitest
      'apps/pii-service/**', // Use: pnpm --filter @tcrn/pii-service exec vitest
    ],
    passWithNoTests: true,
  },
});
