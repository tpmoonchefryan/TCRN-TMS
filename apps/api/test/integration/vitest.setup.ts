import 'reflect-metadata';

import { loadRepoEnvFiles } from '../../src/repo-env';

loadRepoEnvFiles();

if (!process.env.DATABASE_URL) {
  throw new Error(
    [
      'API integration test setup requires DATABASE_URL.',
      'Run `pnpm --filter @tcrn/api test:integration -- --reporter=dot` with a configured integration database,',
      'or provide DATABASE_URL through the repo .env.local/.env files.',
    ].join(' ')
  );
}
