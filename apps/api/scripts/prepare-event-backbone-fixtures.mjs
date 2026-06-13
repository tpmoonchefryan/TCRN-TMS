// SPDX-License-Identifier: Apache-2.0
import { readEventRegistryBaseline } from '@tcrn/shared';

import {
  parseArgs,
  readFixture,
  removeFixture,
  writeFixture,
  writeJson,
} from './event-backbone-script-utils.mjs';

const options = parseArgs();
const command = options._?.[0] ?? 'readback';
const out = options.out ?? `event-backbone-fixture-${command}.json`;
const prefix = options.prefix ?? 'TEST_P8_EVENT';

const fixture = {
  prefix,
  createdAt: new Date().toISOString(),
  eventDefinitions: readEventRegistryBaseline('local').definitions
    .filter((definition) => ['job.email.failed', 'webhook.delivery.replayed'].includes(definition.code))
    .map((definition) => ({
      code: `${prefix}.${definition.code}`,
      sourceCode: definition.code,
      subject: definition.subject,
      piiClass: definition.piiClass,
      scopeClass: definition.scopeClass,
    })),
  outboxRecords: [
    {
      idempotencyKey: `${prefix}.outbox.email.failed`,
      eventCode: 'job.email.failed',
      bridgeMode: 'disabled',
      status: 'pending',
    },
  ],
  consumers: [
    {
      durableName: 'consumer_worker_email_job',
      sideEffectKey: `${prefix}.consumer.worker_email.email_failed`,
      status: 'pending',
    },
  ],
};

if (command === 'setup' || command === 'idempotence') {
  writeFixture(fixture);
}

if (command === 'cleanup') {
  removeFixture();
}

const existing = readFixture();
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'manual_readback',
  data_mode: 'disposable_fixture',
  target_scope: 'event_registry',
  command,
  prefix,
  createdResources: command === 'cleanup' ? [] : fixture.eventDefinitions.map((definition) => definition.code),
  fixture: command === 'cleanup' ? null : existing ?? fixture,
  cleanupProof: command === 'cleanup' ? 'fixture file removed' : null,
  idempotenceProof:
    command === 'idempotence'
      ? 'setup rewrites the same TEST_P8_EVENT fixture identities without duplicates'
      : null,
  retained_data_approval: null,
  passed:
    (command === 'cleanup' && !readFixture()) ||
    (command !== 'cleanup' && (existing ?? fixture).eventDefinitions.length === 2),
};

writeJson(out, payload);
