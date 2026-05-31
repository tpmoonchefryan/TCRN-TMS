// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import 'reflect-metadata';

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PERMISSIONS_KEY } from '../src/common/decorators';
import { EventBackboneController } from '../src/modules/event-backbone/event-backbone.controller';
import { EventBackboneReplayPreviewDto } from '../src/modules/event-backbone/dto/event-backbone.dto';
import { EventBackboneService } from '../src/modules/event-backbone/event-backbone.service';

function parseArgs(argv = process.argv.slice(2)) {
  const options: Record<string, string | true> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (next && !next.startsWith('--')) {
        options[key] = next;
        index += 1;
      } else {
        options[key] = true;
      }
    }
  }

  return options;
}

function withoutVolatileDates(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function hasNoRawPayloadSurface(value: unknown) {
  return !/payloadEnvelope|redactedPayload|requestBody|responseBody|secret=|access_token|id_token|private_key|authorization_code/i.test(
    JSON.stringify(value)
  );
}

const options = parseArgs();
const out = typeof options.out === 'string' ? options.out : 'event-backbone-api-readback.json';

const service = new EventBackboneService({
  get: (key: string) => (key === 'EVENT_BACKBONE_MODE' ? undefined : undefined),
} as never);
const controller = new EventBackboneController(service);

const acRequest = {
  tenantContext: {
    tenantId: '00000000-0000-0000-0000-0000000000ac',
    schemaName: 'tenant_ac',
    tier: 'ac',
  },
  headers: {
    'x-request-id': 'phase-8-api-readback',
    'user-agent': 'phase-8-evidence',
  },
  ip: '127.0.0.1',
};
const standardTenantRequest = {
  ...acRequest,
  tenantContext: {
    ...acRequest.tenantContext,
    tier: 'standard',
  },
};
const user = {
  id: '00000000-0000-0000-0000-00000000ac01',
};

const summary = controller.getSummary({ environment: 'local' }, acRequest as never, user as never);
const registry = controller.getRegistry({ environment: 'local' }, acRequest as never, user as never);
const subjectMapping = controller.getSubjectMapping(
  { environment: 'local' },
  acRequest as never,
  user as never
);
const policy = controller.getPolicy(acRequest as never, user as never);
const replayWithDryRun = controller.previewReplay(
  {
    outboxId: 'outbox-1',
    reason: 'Investigate failed local stub consumer',
    dryRun: true,
  },
  acRequest as never,
  user as never
);
const replayWithOmittedDryRun = controller.previewReplay(
  {
    outboxId: 'outbox-1',
    reason: 'Investigate failed local stub consumer',
  },
  acRequest as never,
  user as never
);

let ordinaryTenantDenied = false;
try {
  controller.getRegistry({ environment: 'local' }, standardTenantRequest as never, user as never);
} catch (error) {
  ordinaryTenantDenied = error instanceof ForbiddenException;
}

let sideEffectReplayDenied = false;
try {
  controller.previewReplay(
    {
      outboxId: 'outbox-1',
      reason: 'Investigate failed local stub consumer',
      dryRun: false,
    },
    acRequest as never,
    user as never
  );
} catch (error) {
  sideEffectReplayDenied = error instanceof BadRequestException;
}

const shortReasonErrors = validateSync(
  plainToInstance(EventBackboneReplayPreviewDto, {
    outboxId: 'outbox-1',
    reason: 'short',
  })
);
const replayPermissions = Reflect.getMetadata(
  PERMISSIONS_KEY,
  EventBackboneController.prototype.previewReplay
) as unknown[];
const summaryPermissions = Reflect.getMetadata(
  PERMISSIONS_KEY,
  EventBackboneController.prototype.getSummary
) as unknown[];
const replayPermissionText = JSON.stringify(replayPermissions ?? []);
const summaryPermissionText = JSON.stringify(summaryPermissions ?? []);
const readbacks = {
  summary: {
    environment: summary.environment,
    bridgeMode: summary.bridgeMode,
    readinessState: summary.readinessState,
    totalEvents: summary.registry.totalEvents,
    streamCount: summary.streams.length,
    consumerCount: summary.consumers.length,
  },
  registry: {
    environment: registry.environment,
    total: registry.total,
    sampleEventCodes: registry.definitions.slice(0, 5).map((definition) => definition.code),
  },
  subjectMapping: {
    environment: subjectMapping.environment,
    sampleSubjects: subjectMapping.mapping.slice(0, 5).map((entry) => entry.subject),
  },
  policy: {
    replay: policy.replay,
    redaction: policy.redaction,
  },
  replay: {
    withDryRun: replayWithDryRun,
    omittedDryRun: replayWithOmittedDryRun,
  },
  permissions: {
    summary: summaryPermissions,
    replay: replayPermissions,
  },
};

const checks = [
  {
    id: 'ac_summary_success',
    passed:
      summary.bridgeMode === 'disabled' &&
      summary.readinessState === 'disabled' &&
      summary.registry.totalEvents > 40,
  },
  {
    id: 'ordinary_tenant_denied',
    passed: ordinaryTenantDenied,
  },
  {
    id: 'read_permission_metadata_present',
    passed: summaryPermissionText.includes('platform.event_backbone') &&
      summaryPermissionText.includes('read'),
  },
  {
    id: 'execute_permission_metadata_present',
    passed:
      replayPermissionText.includes('platform.event_backbone') &&
      replayPermissionText.includes('execute'),
  },
  {
    id: 'replay_dry_run_true_success',
    passed:
      replayWithDryRun.accepted === true &&
      replayWithDryRun.dryRun === true &&
      replayWithDryRun.sideEffects.length === 0 &&
      replayWithDryRun.tenantId === acRequest.tenantContext.tenantId,
  },
  {
    id: 'replay_omitted_dry_run_defaults_to_preview',
    passed:
      replayWithOmittedDryRun.accepted === true &&
      replayWithOmittedDryRun.dryRun === true &&
      replayWithOmittedDryRun.sideEffects.length === 0,
  },
  {
    id: 'dry_run_false_rejected',
    passed: sideEffectReplayDenied,
  },
  {
    id: 'reason_validation_rejects_short_reason',
    passed: shortReasonErrors.some((error) => error.property === 'reason'),
  },
  {
    id: 'cross_tenant_replay_parameter_absent',
    passed:
      !('tenantId' in plainToInstance(EventBackboneReplayPreviewDto, {})) &&
      !('targetTenantId' in plainToInstance(EventBackboneReplayPreviewDto, {})) &&
      replayWithDryRun.tenantId === acRequest.tenantContext.tenantId,
  },
  {
    id: 'subjects_do_not_embed_raw_tenant_or_pii_material',
    passed: subjectMapping.mapping.every(
      (entry) => /^tcrn\.local\./.test(entry.subject) && !/@|secret=|access_token=|tenant-[a-z0-9]|customer-[a-z0-9]/i.test(entry.subject)
    ),
  },
  {
    id: 'readback_no_raw_payload_leakage',
    passed: hasNoRawPayloadSurface(readbacks),
  },
];

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'api_runtime_readback',
  data_mode: 'in_process_controller_service',
  target_scope: 'event_backbone_api_security',
  checks,
  readbacks: withoutVolatileDates(readbacks),
  passed: checks.every((check) => check.passed),
};

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
