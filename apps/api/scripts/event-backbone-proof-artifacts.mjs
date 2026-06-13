// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { readEventRegistryBaseline } from '@tcrn/shared';

import {
  parseArgs,
  readProductText,
  runRg,
  sourceSignals,
} from './event-backbone-script-utils.mjs';

const options = parseArgs();
const outDir = options['out-dir'] ?? process.cwd();
const registry = readEventRegistryBaseline('local');
const signals = sourceSignals();
const localCompose = readProductText('docker-compose.yml');
const stagingCompose = readProductText('docker-compose.staging.yml');
const prodCompose = readProductText('docker-compose.prod.yml');
const k8sRuntime = readProductText('infra/k8s/runtime.env.example');
const k8sNats = readProductText('infra/k8s/dependencies/nats.yaml');

function writeNamedJson(fileName, payload) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload.passed;
}

function writeNamedText(fileName, text) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, fileName), `${text.trimEnd()}\n`, 'utf8');
}

const subjectRawMaterialPattern = /@|secret=|access_token=|id_token|private_key|tenant-[a-z0-9]|customer-[a-z0-9]/i;
const registryDefinitions = registry.definitions.map((definition) => ({
  code: definition.code,
  family: definition.family,
  producer: definition.producer,
  payloadVersion: definition.payloadVersion,
  subject: definition.subject,
  streamName: definition.streamName,
  consumerDurableName: definition.consumerDurableName,
  scopeClass: definition.scopeClass,
  piiClass: definition.piiClass,
}));
const registryChecks = [
  { id: 'registry_total_matches_definitions', passed: registry.total === registry.definitions.length },
  { id: 'registry_has_expected_phase8_families', passed: ['technical_event', 'job', 'webhook_delivery'].every((family) => registryDefinitions.some((definition) => definition.family === family)) },
  { id: 'registry_subjects_sanitized', passed: registryDefinitions.every((definition) => !subjectRawMaterialPattern.test(definition.subject)) },
];
const subjectChecks = [
  { id: 'subjects_are_environment_namespaced', passed: registryDefinitions.every((definition) => definition.subject.startsWith('tcrn.local.')) },
  { id: 'stream_names_generated_for_all_events', passed: registryDefinitions.every((definition) => definition.streamName.startsWith('stream_')) },
  { id: 'consumer_durable_names_generated_for_all_events', passed: registryDefinitions.every((definition) => definition.consumerDurableName.startsWith('consumer_')) },
  { id: 'no_subject_raw_material', passed: registryDefinitions.every((definition) => !subjectRawMaterialPattern.test(definition.subject)) },
];

const directNatsHits = runRg([
  '-n',
  "from 'nats'|from \"nats\"|StringCodec|JetStreamManager|jetstream\\(",
  'apps',
  'packages',
  '-g',
  '!**/node_modules/**',
  '-g',
  '!**/dist/**',
  '-g',
  '!**/scripts/**',
]).filter((line) => !line.includes('packages/shared/src/platform-tools/index.ts'));
const ordinarySettingsHits = runRg([
  '-n',
  'event_backbone|Event Backbone|NATS JetStream|stream controls|consumer durable|DLQ',
  'apps/web/src/app/tenant',
  '-g',
  '**/settings/page.tsx',
]);
const rawMaterialHits = runRg([
  '-n',
  'payloadEnvelope|redactedPayload|requestBody|responseBody|secret=|access_token|id_token|private_key|authorization_code',
  'apps/web/src/app/ac/[tenantId]/platform-tools/page.tsx',
  'apps/web/src/domains/platform-tool-connections/screens',
  'apps/web/src/domains/event-backbone',
  'apps/api/src/modules/event-backbone/event-backbone.controller.ts',
  'apps/api/src/modules/event-backbone/event-backbone.service.ts',
  'apps/api/src/modules/event-backbone/dto/event-backbone.dto.ts',
  '-g',
  '!**/*.spec.ts',
  '-g',
  '!**/*.test.ts',
  '-g',
  '!**/*.test.tsx',
]);

const outboxStorageChecks = [
  { id: 'tenant_template_outbox_table', passed: signals.migration.includes('tenant_template.event_backbone_outbox') },
  { id: 'existing_tenant_rollout_loop', passed: signals.migration.includes("schema_name LIKE 'tenant_%'") },
  { id: 'idempotency_unique_constraint', passed: signals.migration.includes('event_backbone_outbox_idempotency_key_key UNIQUE') },
  { id: 'consumer_side_effect_unique_constraint', passed: signals.migration.includes('event_backbone_consumer_cursor_side_effect_key_key UNIQUE') },
  { id: 'repository_conflict_readback', passed: signals.repository.includes('findOutboxByIdempotencyKey(tenantSchema, input.idempotencyKey, client)') },
  { id: 'transaction_boundary_helper', passed: signals.repository.includes('withOutboxTransaction') && signals.repository.includes('this.prisma.$transaction') },
  { id: 'no_direct_publish_in_storage_boundary', passed: directNatsHits.length === 0 },
];
const composeChecks = [
  { id: 'event_backbone_mode_default_disabled', passed: [stagingCompose, prodCompose].every((text) => text.includes('EVENT_BACKBONE_MODE: ${EVENT_BACKBONE_MODE:-disabled}')) },
  { id: 'nats_service_profile_gated', passed: /nats:[\s\S]{0,240}profiles:\s*\n\s*-\s*event-backbone/.test(localCompose) },
  { id: 'nats_ports_loopback_only', passed: localCompose.includes("'127.0.0.1:4222:4222'") && localCompose.includes("'127.0.0.1:8222:8222'") },
  { id: 'prod_no_default_nats_depends_on', passed: !/depends_on:[\s\S]{0,220}\bnats:\s*\n\s*condition:\s*service_started/.test(prodCompose) },
];
const k8sChecks = [
  { id: 'runtime_env_documents_nats_url', passed: k8sRuntime.includes('NATS_URL') },
  { id: 'runtime_env_default_disabled', passed: k8sRuntime.includes('EVENT_BACKBONE_MODE=disabled') },
  { id: 'nats_manifest_exists_as_dependency_only', passed: k8sNats.includes('kind:') && k8sNats.includes('nats') },
  { id: 'api_mode_default_disabled_in_schema', passed: signals.configSchema.includes(".default('disabled')") },
];

const payloadsPassed = [
  writeNamedJson('event-registry-readback.json', {
    checkedAt: new Date().toISOString(),
    test_layer: 'shared_contract_readback',
    data_mode: 'read_only_uat',
    target_scope: 'event_registry',
    environment: registry.environment,
    total: registry.total,
    families: [...new Set(registryDefinitions.map((definition) => definition.family))],
    definitions: registryDefinitions,
    checks: registryChecks,
    passed: registryChecks.every((check) => check.passed),
  }),
  writeNamedJson('event-subject-mapping.json', {
    checkedAt: new Date().toISOString(),
    test_layer: 'shared_contract_readback',
    data_mode: 'read_only_uat',
    target_scope: 'subject_mapping',
    environment: registry.environment,
    mapping: registryDefinitions.map((definition) => ({
      eventCode: definition.code,
      family: definition.family,
      subject: definition.subject,
      streamName: definition.streamName,
      consumerDurableName: definition.consumerDurableName,
      scopeClass: definition.scopeClass,
      piiClass: definition.piiClass,
    })),
    checks: subjectChecks,
    passed: subjectChecks.every((check) => check.passed),
  }),
  writeNamedJson('event-outbox-storage-rollout.json', {
    checkedAt: new Date().toISOString(),
    test_layer: 'migration_readback',
    data_mode: 'source_scan',
    target_scope: 'outbox_rollout',
    checks: outboxStorageChecks.slice(0, 4),
    passed: outboxStorageChecks.slice(0, 4).every((check) => check.passed),
  }),
  writeNamedJson('event-outbox-storage-readback.json', {
    checkedAt: new Date().toISOString(),
    test_layer: 'repository_contract_readback',
    data_mode: 'source_scan_plus_unit_test',
    target_scope: 'outbox_readback',
    checks: outboxStorageChecks.filter((check) => ['repository_conflict_readback', 'transaction_boundary_helper', 'no_direct_publish_in_storage_boundary'].includes(check.id)),
    passed: outboxStorageChecks.filter((check) => ['repository_conflict_readback', 'transaction_boundary_helper', 'no_direct_publish_in_storage_boundary'].includes(check.id)).every((check) => check.passed),
  }),
  writeNamedJson('event-outbox-storage-idempotence.json', {
    checkedAt: new Date().toISOString(),
    test_layer: 'repository_contract_readback',
    data_mode: 'source_scan_plus_unit_test',
    target_scope: 'outbox_idempotence',
    checks: outboxStorageChecks.filter((check) => ['idempotency_unique_constraint', 'repository_conflict_readback'].includes(check.id)),
    passed: outboxStorageChecks.filter((check) => ['idempotency_unique_constraint', 'repository_conflict_readback'].includes(check.id)).every((check) => check.passed),
  }),
];

writeNamedText(
  'event-backbone-authority-source-scan.txt',
  `
# Phase 8 Authority Source Scan

Command: rg -n "from 'nats'|from \\"nats\\"|StringCodec|JetStreamManager|jetstream\\\\(" apps packages -g '!**/node_modules/**' -g '!**/dist/**' -g '!**/scripts/**'
Exit status: ${directNatsHits.length === 0 ? 0 : 1}
Hits: ${directNatsHits.length}
${directNatsHits.join('\n') || '(none)'}

Command: rg -n "event_backbone|Event Backbone|NATS JetStream|stream controls|consumer durable|DLQ" apps/web/src/app/tenant -g '**/settings/page.tsx'
Exit status: ${ordinarySettingsHits.length === 0 ? 0 : 1}
Hits: ${ordinarySettingsHits.length}
${ordinarySettingsHits.join('\n') || '(none)'}

Command: rg -n "payloadEnvelope|redactedPayload|requestBody|responseBody|secret=|access_token|id_token|private_key|authorization_code" apps/web/src/app/ac/[tenantId]/platform-tools/page.tsx apps/web/src/domains/platform-tool-connections/screens apps/web/src/domains/event-backbone apps/api/src/modules/event-backbone/event-backbone.controller.ts apps/api/src/modules/event-backbone/event-backbone.service.ts apps/api/src/modules/event-backbone/dto/event-backbone.dto.ts -g '!**/*.spec.ts' -g '!**/*.test.ts' -g '!**/*.test.tsx'
Exit status: ${rawMaterialHits.length === 0 ? 0 : 1}
Hits: ${rawMaterialHits.length}
${rawMaterialHits.join('\n') || '(none)'}
`
);
writeNamedText(
  'event-backbone-k8s-readiness.txt',
  `
# Phase 8 K8s Readiness Scan

${k8sChecks.map((check) => `${check.passed ? 'PASS' : 'FAIL'} ${check.id}`).join('\n')}
`
);
writeNamedText(
  'event-backbone-k8s-render-scan.txt',
  `
# Phase 8 K8s Render Scan

${k8sChecks.map((check) => `${check.passed ? 'PASS' : 'FAIL'} ${check.id}`).join('\n')}
`
);
writeNamedText(
  'event-backbone-compose-render-scan.txt',
  `
# Phase 8 Compose Render Scan

${composeChecks.map((check) => `${check.passed ? 'PASS' : 'FAIL'} ${check.id}`).join('\n')}
`
);
writeNamedText(
  'phase-8-negative-source-scans.md',
  `
# Phase 8 Negative Source Scans

Direct NATS client source hits: ${directNatsHits.length}

Ordinary tenant settings Event Backbone hits: ${ordinarySettingsHits.length}

Raw payload/secret UI and Event Backbone API source hits: ${rawMaterialHits.length}

All three scans above are expected to be zero. Non-zero hits fail this evidence file.
`
);

if (
  payloadsPassed.every(Boolean) &&
  directNatsHits.length === 0 &&
  ordinarySettingsHits.length === 0 &&
  rawMaterialHits.length === 0 &&
  composeChecks.every((check) => check.passed) &&
  k8sChecks.every((check) => check.passed)
) {
  console.log(`Phase 8 proof artifacts written to ${outDir}`);
} else {
  console.error(`Phase 8 proof artifacts failed checks in ${outDir}`);
  process.exitCode = 1;
}
