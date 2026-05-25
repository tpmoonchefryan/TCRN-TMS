// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, env } from 'prisma/config';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageRoot, '..', '..');

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(repoRoot, envFile);

  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seeds/index.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
