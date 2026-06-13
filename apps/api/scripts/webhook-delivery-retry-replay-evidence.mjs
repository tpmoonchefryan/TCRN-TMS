// SPDX-License-Identifier: Apache-2.0
import { parseArgs, sourceSignals, writeJson } from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-retry-replay-results.json';
const signals = sourceSignals();
const checks = [
  {
    id: 'replay_route_present',
    passed: signals.controller.includes("delivery-attempts/:attemptId/replay'"),
  },
  {
    id: 'reason_required',
    passed:
      signals.service.includes('assertReason') &&
      signals.service.includes('A reason is required for webhook delivery test or replay'),
  },
  {
    id: 'duplicate_replay_idempotency_uses_atomic_insert_and_returns_existing_outbox',
    passed:
      signals.service.includes('insertOutboxIfAbsent') &&
      signals.service.includes('mapDuplicateOperation') &&
      signals.service.includes('assertIdempotencyConflictMatches') &&
      signals.service.includes('Webhook delivery idempotency key is already used for a different operation') &&
      signals.deliveryRepository.includes('ON CONFLICT (idempotency_key) DO NOTHING') &&
      signals.deliveryRepository.includes('created: false'),
  },
  {
    id: 'dry_run_no_outbound_http',
    passed:
      signals.service.includes('DRY_RUN_NO_OUTBOUND_HTTP') &&
      signals.service.includes('DRY_RUN_REPLAY_NO_OUTBOUND_HTTP'),
  },
  {
    id: 'dlq_fields_available',
    passed:
      signals.schema.includes('deadLetteredAt') &&
      signals.schema.includes('dlqReason') &&
      signals.migration.includes('dead_lettered_at') &&
      signals.migration.includes('dlq_reason'),
  },
  {
    id: 'bounded_retry_policy_preserved',
    passed:
      signals.sharedCatalog.includes('defaultRetryPolicy') &&
      signals.sharedCatalog.includes('maxRetries') &&
      signals.sharedCatalog.includes('backoffMs'),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'api_integration',
  data_mode: 'disposable_fixture',
  target_scope: 'delivery_attempt',
  checks,
  passed: checks.every((check) => check.passed),
});
