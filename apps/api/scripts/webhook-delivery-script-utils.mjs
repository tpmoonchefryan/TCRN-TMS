// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const productRoot = path.resolve(scriptDir, '../../..');
export const webhookDeliveryFixturePath = path.join(
  productRoot,
  'tmp/p7-webhook-delivery/fixtures.json'
);

export const EXPECTED_WEBHOOK_EVENT_CODES = [
  'customer.created',
  'customer.updated',
  'customer.deactivated',
  'membership.created',
  'membership.renewed',
  'membership.expired',
  'marshmallow.received',
  'marshmallow.approved',
  'report.completed',
  'report.failed',
  'import.completed',
  'import.failed',
];

export const EXPECTED_WEBHOOK_DELIVERY_ADAPTER_CODES = [
  'tcrn_webhook_outbox',
  'tcrn_local_webhook_dispatcher',
  'svix_delivery_provider',
  'nats_jetstream_backbone',
  'webhook_signature_policy',
];

export function parseArgs(argv = process.argv.slice(2)) {
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
    } else if (!options._) {
      options._ = [arg];
    } else {
      options._.push(arg);
    }
  }

  return options;
}

export function resolveProductPath(...segments) {
  return path.join(productRoot, ...segments);
}

export function readProductText(...segments) {
  return readFileSync(resolveProductPath(...segments), 'utf8');
}

export function readJson(...segments) {
  return JSON.parse(readProductText(...segments));
}

export function writeJson(out, payload) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

export function runGit(args) {
  return execFileSync('git', args, {
    cwd: productRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function runRg(args) {
  try {
    return execFileSync('rg', args, {
      cwd: productRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function writeFixture(payload) {
  mkdirSync(path.dirname(webhookDeliveryFixturePath), { recursive: true });
  writeFileSync(webhookDeliveryFixturePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function readFixture() {
  try {
    return JSON.parse(readFileSync(webhookDeliveryFixturePath, 'utf8'));
  } catch {
    return null;
  }
}

export function removeFixture() {
  rmSync(webhookDeliveryFixturePath, { force: true });
}

export function sourceSignals() {
  return {
    sharedCatalog: readProductText('packages/shared/src/types/integration/schema.ts'),
    controller: readProductText(
      'apps/api/src/modules/integration/controllers/integration.controller.ts'
    ),
    service: readProductText(
      'apps/api/src/modules/integration/application/webhook-delivery.service.ts'
    ),
    deliveryRepository: readProductText(
      'apps/api/src/modules/integration/infrastructure/webhook-delivery.repository.ts'
    ),
    webhookContext: readProductText(
      'apps/api/src/modules/integration/application/webhook-context.util.ts'
    ),
    policy: readProductText('apps/api/src/modules/integration/domain/webhook-delivery.policy.ts'),
    writeService: readProductText(
      'apps/api/src/modules/integration/application/webhook-write.service.ts'
    ),
    schema: readProductText('packages/database/prisma/schema.prisma'),
    migration: readProductText(
      'packages/database/prisma/migrations/20260531070000_add_webhook_delivery_outbox/migration.sql'
    ),
    platformTools: readProductText('packages/shared/src/platform-tools/index.ts'),
  };
}
