// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from './observability-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'observability-compose.fixture.env';
const content = [
  'POSTGRES_USER=tcrn',
  'POSTGRES_PASSWORD=nonsecret-local-observability-proof',
  'POSTGRES_DB=tcrn_tms',
  'MINIO_ROOT_USER=minioadmin',
  'MINIO_ROOT_PASSWORD=nonsecret-local-observability-proof',
  'LOKI_ENABLED=false',
  'LOKI_QUERY_URL=http://loki:3100',
  'LOKI_PUSH_URL=http://loki:3100/loki/api/v1/push',
  'OTEL_ENABLED=false',
  'OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318',
  'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=',
].join('\n');

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${content}\n`, 'utf8');
console.log(out);
