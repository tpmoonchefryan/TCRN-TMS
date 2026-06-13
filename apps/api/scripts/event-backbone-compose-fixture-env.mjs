// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { parseArgs } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-compose.fixture.env';
const body = [
  'NODE_ENV=development',
  'EVENT_BACKBONE_MODE=disabled',
  'POSTGRES_USER=tcrn',
  'POSTGRES_PASSWORD=fixture-postgres-password-render-only',
  'POSTGRES_DB=tcrn_tms',
  'REDIS_PASSWORD=fixture-redis-password-render-only',
  'NATS_URL=nats://nats:4222',
  'DATABASE_URL=postgresql://tcrn:tcrn@postgres:5432/tcrn',
  'REDIS_URL=redis://redis:6379',
  'JWT_SECRET=fixture-jwt-secret-for-render-only-000000',
  'JWT_REFRESH_SECRET=fixture-jwt-refresh-secret-render-only-000000',
  'FINGERPRINT_SECRET_KEY=fixture-fingerprint-secret-render-only-000000',
  'MINIO_ROOT_PASSWORD=fixture-minio-password-render-only',
  'TENCENT_SES_SECRET_ID=fixture-tencent-secret-id',
  'TENCENT_SES_SECRET_KEY=fixture-tencent-secret-key',
  'TENCENT_SES_FROM_ADDRESS=noreply@example.test',
  '',
].join('\n');

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, body, 'utf8');
console.log(body);
