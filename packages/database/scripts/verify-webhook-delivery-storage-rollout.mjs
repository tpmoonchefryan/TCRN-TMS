// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const productRoot = path.resolve(scriptDir, '../../..');

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg.startsWith('--')) {
      if (next && !next.startsWith('--')) {
        options[arg.slice(2)] = next;
        index += 1;
      } else {
        options[arg.slice(2)] = true;
      }
    }
  }

  return options;
}

function readProductText(...segments) {
  return readFileSync(path.join(productRoot, ...segments), 'utf8');
}

function writeEvidence(out, payload) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

const options = parseArgs();
const mode = options.mode ?? 'placement-and-constraints';
const out = options.out ?? 'webhook-delivery-storage-rollout.json';
const schema = readProductText('packages/database/prisma/schema.prisma');
const migration = readProductText(
  'packages/database/prisma/migrations/20260531070000_add_webhook_delivery_outbox/migration.sql'
);
const checks = [
  {
    id: 'tenant_template_models_present',
    passed: Boolean(
      schema.includes('model WebhookDeliveryOutbox') &&
        schema.includes('model WebhookDeliveryAttempt') &&
        schema.match(/@@schema\("tenant_template"\)/g)?.length
    ),
  },
  {
    id: 'migration_creates_template_tables',
    passed:
      migration.includes('CREATE TABLE IF NOT EXISTS tenant_template.webhook_delivery_outbox') &&
      migration.includes('CREATE TABLE IF NOT EXISTS tenant_template.webhook_delivery_attempt'),
  },
  {
    id: 'existing_tenant_rollout_loop',
    passed:
      migration.includes("schema_name LIKE 'tenant_%'") &&
      migration.includes("schema_name != 'tenant_template'") &&
      migration.includes('to_regclass(format'),
  },
  {
    id: 'foreign_keys_present',
    passed:
      migration.includes('webhook_delivery_outbox_webhook_id_fkey') &&
      migration.includes('webhook_delivery_attempt_outbox_id_fkey') &&
      migration.includes('webhook_delivery_attempt_webhook_id_fkey'),
  },
  {
    id: 'idempotency_and_attempt_constraints',
    passed:
      migration.includes('webhook_delivery_outbox_idempotency_key_key UNIQUE') &&
      migration.includes('webhook_delivery_attempt_outbox_number_key UNIQUE'),
  },
  {
    id: 'status_retry_dlq_indexes',
    passed:
      migration.includes('webhook_delivery_outbox_status_next_attempt_idx') &&
      migration.includes('webhook_delivery_attempt_status_next_retry_idx') &&
      migration.includes('dead_lettered_at') &&
      migration.includes('dlq_reason'),
  },
];

writeEvidence(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'manual_readback',
  data_mode: mode === 'idempotence' ? 'disposable_fixture' : 'read_only_uat',
  target_scope: 'outbox',
  mode,
  checks,
  passed: checks.every((check) => Boolean(check.passed)),
});
