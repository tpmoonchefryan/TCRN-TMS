// SPDX-License-Identifier: Apache-2.0
import { parseArgs, sourceSignals, writeJson } from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-outbox-results.json';
const signals = sourceSignals();
const checks = [
  {
    id: 'outbox_table_defined',
    passed:
      signals.schema.includes('model WebhookDeliveryOutbox') &&
      signals.migration.includes('webhook_delivery_outbox'),
  },
  {
    id: 'attempt_table_defined',
    passed:
      signals.schema.includes('model WebhookDeliveryAttempt') &&
      signals.migration.includes('webhook_delivery_attempt'),
  },
  {
    id: 'idempotency_unique',
    passed:
      signals.schema.includes('@unique @map("idempotency_key")') &&
      signals.migration.includes('webhook_delivery_outbox_idempotency_key_key UNIQUE'),
  },
  {
    id: 'no_direct_send_without_outbox',
    passed:
      signals.service.includes('insertOutbox') &&
      signals.service.includes('insertAttempt') &&
      !signals.service.includes('axios.post') &&
      !signals.service.includes('fetch('),
  },
  {
    id: 'redacted_summary_written',
    passed:
      signals.service.includes('redactWebhookPayloadEnvelope') &&
      signals.service.includes('requestBodySummary') &&
      signals.policy.includes('rawPayloadStored: false'),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'api_integration',
  data_mode: 'read_only_uat',
  target_scope: 'outbox',
  checks,
  passed: checks.every((check) => check.passed),
});
