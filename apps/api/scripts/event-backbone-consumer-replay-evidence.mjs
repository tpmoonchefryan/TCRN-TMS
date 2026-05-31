// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, sourceSignals, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-consumer-replay.json';
const signals = sourceSignals();
const checks = [
  { id: 'execute_permission_required', passed: signals.controller.includes("resource: 'platform.event_backbone', action: 'execute'") },
  { id: 'reason_required', passed: signals.controller.includes('EventBackboneReplayPreviewDto') && signals.service.includes('reason: dto.reason') },
  { id: 'dry_run_only', passed: signals.service.includes('dryRun') && signals.service.includes('dry-run only') && signals.service.includes('sideEffects: []') },
  { id: 'side_effect_idempotency_key', passed: signals.migration.includes('side_effect_key') && signals.migration.includes('event_backbone_consumer_cursor_side_effect_key_key UNIQUE') },
  { id: 'consumer_durable_generated', passed: signals.service.includes('generateConsumerDurableName') },
  { id: 'tenant_context_returned', passed: signals.service.includes('tenantId: context.tenantId') },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'consumer_replay',
  checks,
  passed: checks.every((check) => check.passed),
});
