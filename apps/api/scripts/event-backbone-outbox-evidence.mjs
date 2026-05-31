// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, sourceSignals, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-outbox-results.json';
const signals = sourceSignals();
const checks = [
  { id: 'prisma_models_present', passed: signals.prismaSchema.includes('model EventBackboneOutbox') && signals.prismaSchema.includes('model EventBackboneConsumerCursor') },
  { id: 'tenant_template_tables_present', passed: signals.migration.includes('tenant_template.event_backbone_outbox') && signals.migration.includes('tenant_template.event_backbone_consumer_cursor') },
  { id: 'idempotency_unique', passed: signals.migration.includes('event_backbone_outbox_idempotency_key_key UNIQUE') && signals.migration.includes('event_backbone_consumer_cursor_side_effect_key_key UNIQUE') },
  { id: 'publish_dlq_replay_fields', passed: ['bridge_mode', 'publish_status', 'dead_lettered_at', 'dlq_reason', 'replay_reason'].every((needle) => signals.migration.includes(needle)) },
  { id: 'existing_tenant_rollout_loop', passed: signals.migration.includes("schema_name LIKE 'tenant_%'") && signals.migration.includes('CREATE TABLE IF NOT EXISTS %I.event_backbone_outbox') },
  { id: 'repository_idempotent_insert', passed: signals.repository.includes('ON CONFLICT (idempotency_key) DO NOTHING') && signals.repository.includes('Event backbone tenant schema is required') },
  { id: 'repository_conflict_readback', passed: signals.repository.includes('findOutboxByIdempotencyKey(tenantSchema, input.idempotencyKey, client)') },
  { id: 'repository_transaction_boundary', passed: signals.repository.includes('withOutboxTransaction') && signals.repository.includes('this.prisma.$transaction') },
  { id: 'no_direct_nats_publish', passed: !signals.repository.includes('jetstream(') && !signals.repository.includes("from 'nats'") },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'manual_readback',
  target_scope: 'event_outbox',
  checks,
  passed: checks.every((check) => check.passed),
});
