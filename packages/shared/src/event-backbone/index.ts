// SPDX-License-Identifier: Apache-2.0
import { TechEventType } from '../constants/event-types';

export const EVENT_BACKBONE_BRIDGE_MODES = [
  'disabled',
  'local_stub',
  'mirror_only',
  'selected_event_stream',
  'external_provided',
] as const;

export const EVENT_BACKBONE_PII_CLASSES = [
  'internal_operational',
  'operational_summary',
  'public_safe_summary',
  'restricted',
] as const;

export const EVENT_BACKBONE_SCOPE_CLASSES = [
  'platform',
  'tenant',
  'subsidiary',
  'talent',
  'public',
  'internal',
] as const;

export const EVENT_BACKBONE_REPLAY_ELIGIBILITY = [
  'not_replayable',
  'mirror_only',
  'authorized_replay_only',
] as const;

export type EventBackboneBridgeMode = (typeof EVENT_BACKBONE_BRIDGE_MODES)[number];
export type EventBackbonePiiClass = (typeof EVENT_BACKBONE_PII_CLASSES)[number];
export type EventBackboneScopeClass = (typeof EVENT_BACKBONE_SCOPE_CLASSES)[number];
export type EventBackboneReplayEligibility = (typeof EVENT_BACKBONE_REPLAY_ELIGIBILITY)[number];

export interface TcrnEventDefinition {
  code: string;
  family:
    | 'technical_event'
    | 'job'
    | 'webhook_delivery'
    | 'public_presence_projection';
  category: string;
  producer: string;
  payloadVersion: '1';
  piiClass: EventBackbonePiiClass;
  scopeClass: EventBackboneScopeClass;
  replayEligibility: EventBackboneReplayEligibility;
  retentionClass: 'operational_30d' | 'audit_90d' | 'audit_1y' | 'public_projection_30d';
  idempotencyKeyFields: readonly string[];
  deprecationState: 'active' | 'candidate' | 'deprecated';
  consumerEligibility: 'mirror_only' | 'side_effect_allowed_after_policy';
}

export interface BullMqQueueClassification {
  queue: string;
  owner: string;
  domain: 'customer-data' | 'platform-maintenance' | 'observability';
  classification: 'preserve' | 'mirror_lifecycle_events' | 'bridge_candidate' | 'not_in_phase_8';
  allowedMirrorScope: string;
  idempotencyProof: string;
  rollbackRequirement: string;
}

export interface EventBackboneAdapterCatalogItem {
  code: string;
  label: string;
  kind: 'built_in_registry' | 'durable_store' | 'existing_job_runtime' | 'stream_transport' | 'policy' | 'monitoring_projection';
  defaultState: 'active' | 'preserve_existing_behavior' | 'disabled_readiness';
  ownerPhase: 'phase_8';
  transportCapability: string;
  localDevModes: readonly EventBackboneBridgeMode[] | readonly ['always_available'];
  sourceOfTruthBoundary: string;
}

const unsafeSubjectSegmentPattern = /[^a-z0-9_.-]/;
const jobLifecycleStates = [
  'created',
  'started',
  'progress',
  'completed',
  'failed',
  'stalled',
  'dlq',
] as const;

const restrictedTechEvents = new Set<TechEventType>([
  TechEventType.AUTH_LOGIN_FAILED,
  TechEventType.AUTH_LOGIN_SUCCESS,
  TechEventType.AUTH_TOKEN_REFRESH,
  TechEventType.AUTH_2FA_ENABLED,
  TechEventType.AUTH_RECOVERY_CODE_USED,
  TechEventType.AUTH_PASSWORD_CHANGED,
  TechEventType.AUTH_PASSWORD_RESET,
  TechEventType.PII_ACCESS_REQUESTED,
  TechEventType.PII_ACCESS_GRANTED,
  TechEventType.PII_ACCESS_DENIED,
  TechEventType.PII_FETCH_FAILED,
  TechEventType.REPORT_DOWNLOADED,
  TechEventType.REPORT_PII_BATCH_REQUESTED,
  TechEventType.SECURITY_EVENT,
]);

function lowerSnake(input: string) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .replace(/2_fa/g, '2fa');
}

function technicalScope(eventType: TechEventType): EventBackboneScopeClass {
  if (
    eventType.startsWith('SYSTEM_') ||
    eventType.startsWith('LOG_CLEANUP_') ||
    eventType.startsWith('SCHEDULED_TASK_')
  ) {
    return 'platform';
  }

  return 'tenant';
}

function technicalCategory(eventType: TechEventType) {
  return eventType.split('_')[0].toLowerCase();
}

const technicalEventDefinitions: readonly TcrnEventDefinition[] = Object.values(TechEventType).map(
  (eventType) => ({
    code: `technical_event.${lowerSnake(eventType)}`,
    family: 'technical_event',
    category: technicalCategory(eventType),
    producer: 'log',
    payloadVersion: '1',
    piiClass: restrictedTechEvents.has(eventType) ? 'restricted' : 'internal_operational',
    scopeClass: technicalScope(eventType),
    replayEligibility: 'mirror_only',
    retentionClass: restrictedTechEvents.has(eventType) ? 'audit_1y' : 'audit_90d',
    idempotencyKeyFields: ['event_code', 'tenant_id', 'trace_id', 'occurred_at'],
    deprecationState: 'active',
    consumerEligibility: 'mirror_only',
  })
);

export const BULLMQ_QUEUE_CLASSIFICATIONS: readonly BullMqQueueClassification[] = [
  {
    queue: 'import',
    owner: 'worker.import',
    domain: 'customer-data',
    classification: 'mirror_lifecycle_events',
    allowedMirrorScope: 'Lifecycle/status summaries only; raw import rows stay out of the stream.',
    idempotencyProof: 'job.id + tenant_id + lifecycle_state',
    rollbackRequirement: 'Disable mirroring and keep import BullMQ execution unchanged.',
  },
  {
    queue: 'report',
    owner: 'worker.report',
    domain: 'customer-data',
    classification: 'mirror_lifecycle_events',
    allowedMirrorScope: 'Lifecycle/status summaries only; no report binary or result payload.',
    idempotencyProof: 'job.id + tenant_id + lifecycle_state',
    rollbackRequirement: 'Disable mirroring and keep report BullMQ execution unchanged.',
  },
  {
    queue: 'membership-renewal',
    owner: 'worker.membership-renewal',
    domain: 'platform-maintenance',
    classification: 'mirror_lifecycle_events',
    allowedMirrorScope: 'Batch lifecycle summaries only; no double-renew side effects.',
    idempotencyProof: 'job.id + batch_window + lifecycle_state',
    rollbackRequirement: 'Disable mirroring and keep scheduled renewal BullMQ execution unchanged.',
  },
  {
    queue: 'log',
    owner: 'worker.log',
    domain: 'observability',
    classification: 'preserve',
    allowedMirrorScope: 'Optional sanitized counts only; no log payload mirror in Phase 8.',
    idempotencyProof: 'log authority remains the database/log processor path.',
    rollbackRequirement: 'No bridge to disable; log queue remains authoritative execution path.',
  },
  {
    queue: 'log-cleanup',
    owner: 'worker.log-cleanup',
    domain: 'platform-maintenance',
    classification: 'preserve',
    allowedMirrorScope: 'Cleanup status summaries only if later accepted.',
    idempotencyProof: 'cleanup schedule + retention policy version',
    rollbackRequirement: 'Keep cleanup schedule and BullMQ queue unchanged.',
  },
  {
    queue: 'export',
    owner: 'worker.export',
    domain: 'customer-data',
    classification: 'mirror_lifecycle_events',
    allowedMirrorScope: 'Lifecycle/status summaries only; no exported file payload.',
    idempotencyProof: 'job.id + tenant_id + lifecycle_state',
    rollbackRequirement: 'Disable mirroring and keep export BullMQ execution unchanged.',
  },
  {
    queue: 'marshmallow-export',
    owner: 'worker.marshmallow-export',
    domain: 'customer-data',
    classification: 'mirror_lifecycle_events',
    allowedMirrorScope: 'Lifecycle/status summaries only; no marshmallow export payload.',
    idempotencyProof: 'job.id + tenant_id + lifecycle_state',
    rollbackRequirement: 'Disable mirroring and keep marshmallow export BullMQ execution unchanged.',
  },
  {
    queue: 'email',
    owner: 'worker.email',
    domain: 'customer-data',
    classification: 'mirror_lifecycle_events',
    allowedMirrorScope: 'Delivery lifecycle summaries only; no email body, recipient PII, or provider secret.',
    idempotencyProof: 'job.id + tenant_id + lifecycle_state',
    rollbackRequirement: 'Disable mirroring and keep email BullMQ execution unchanged.',
  },
];

function jobEventDefinitions(): TcrnEventDefinition[] {
  return BULLMQ_QUEUE_CLASSIFICATIONS.flatMap((queue) =>
    jobLifecycleStates.map((state) => ({
      code: `job.${queue.queue.replace(/-/g, '_')}.${state}`,
      family: 'job' as const,
      category: queue.queue.replace(/-/g, '_'),
      producer: queue.owner,
      payloadVersion: '1' as const,
      piiClass:
        queue.queue === 'email' || queue.queue === 'report'
          ? ('restricted' as const)
          : ('operational_summary' as const),
      scopeClass:
        queue.domain === 'platform-maintenance' && queue.queue !== 'membership-renewal'
          ? ('platform' as const)
          : ('tenant' as const),
      replayEligibility:
        queue.classification === 'preserve' ? ('not_replayable' as const) : ('mirror_only' as const),
      retentionClass: 'operational_30d' as const,
      idempotencyKeyFields: ['queue', 'job_id', 'lifecycle_state'],
      deprecationState: 'active' as const,
      consumerEligibility: 'mirror_only' as const,
    }))
  );
}

const webhookDeliveryEventDefinitions: readonly TcrnEventDefinition[] = [
  'enqueued',
  'attempted',
  'succeeded',
  'failed',
  'dlq',
  'replayed',
].map((state) => ({
  code: `webhook.delivery.${state}`,
  family: 'webhook_delivery',
  category: 'webhook_delivery',
  producer: 'integration.webhook',
  payloadVersion: '1',
  piiClass: 'restricted',
  scopeClass: 'tenant',
  replayEligibility: 'authorized_replay_only',
  retentionClass: 'audit_90d',
  idempotencyKeyFields: ['webhook_id', 'event_id', 'payload_hash', 'replay_source'],
  deprecationState: 'active',
  consumerEligibility: 'side_effect_allowed_after_policy',
}));

const publicPresenceProjectionEventDefinitions: readonly TcrnEventDefinition[] = [
  'invalidated',
  'built',
  'failed',
].map((state) => ({
  code: `public_presence.projection.${state}`,
  family: 'public_presence_projection',
  category: 'public_presence_projection',
  producer: 'homepage.public_presence',
  payloadVersion: '1',
  piiClass: state === 'built' ? 'public_safe_summary' : 'restricted',
  scopeClass: 'talent',
  replayEligibility: 'not_replayable',
  retentionClass: 'public_projection_30d',
  idempotencyKeyFields: ['tenant_id', 'talent_id', 'projection_version', 'lifecycle_state'],
  deprecationState: 'candidate',
  consumerEligibility: 'mirror_only',
}));

export const TCRN_EVENT_DEFINITIONS: readonly TcrnEventDefinition[] = [
  ...technicalEventDefinitions,
  ...jobEventDefinitions(),
  ...webhookDeliveryEventDefinitions,
  ...publicPresenceProjectionEventDefinitions,
];

export const EVENT_BACKBONE_ADAPTER_CATALOG: readonly EventBackboneAdapterCatalogItem[] = [
  {
    code: 'tcrn_event_registry',
    label: 'TCRN Event Registry',
    kind: 'built_in_registry',
    defaultState: 'active',
    ownerPhase: 'phase_8',
    transportCapability: 'Owns event metadata, schemas, producer and consumer contracts.',
    localDevModes: ['always_available'],
    sourceOfTruthBoundary: 'TCRN registry owns event meaning; subjects are generated outputs.',
  },
  {
    code: 'tcrn_event_outbox',
    label: 'TCRN Event Outbox',
    kind: 'durable_store',
    defaultState: 'active',
    ownerPhase: 'phase_8',
    transportCapability: 'Stores authorized events, idempotency, publish state, replay state, and audit.',
    localDevModes: ['disabled', 'local_stub'],
    sourceOfTruthBoundary: 'Outbox rows are authoritative before any transport publish occurs.',
  },
  {
    code: 'bullmq_job_runtime',
    label: 'BullMQ Job Runtime',
    kind: 'existing_job_runtime',
    defaultState: 'preserve_existing_behavior',
    ownerPhase: 'phase_8',
    transportCapability: 'Existing job execution remains BullMQ unless a later accepted bridge changes it.',
    localDevModes: ['disabled', 'local_stub'],
    sourceOfTruthBoundary: 'Queue names are runtime mechanics, not event taxonomy authority.',
  },
  {
    code: 'nats_jetstream_backbone',
    label: 'NATS JetStream Event Backbone',
    kind: 'stream_transport',
    defaultState: 'disabled_readiness',
    ownerPhase: 'phase_8',
    transportCapability: 'Optional transport for selected outbox events after bridge-mode proof.',
    localDevModes: ['disabled', 'local_stub', 'mirror_only', 'selected_event_stream', 'external_provided'],
    sourceOfTruthBoundary: 'NATS owns transport mechanics only; it never owns TCRN event meaning.',
  },
  {
    code: 'event_replay_policy',
    label: 'Event Replay Policy',
    kind: 'policy',
    defaultState: 'active',
    ownerPhase: 'phase_8',
    transportCapability: 'Defines replay authorization, reason, dry-run, idempotency, and tenant isolation.',
    localDevModes: ['always_available'],
    sourceOfTruthBoundary: 'Replay approval and audit stay in TCRN.',
  },
  {
    code: 'event_backbone_monitoring',
    label: 'Event Backbone Monitoring Projection',
    kind: 'monitoring_projection',
    defaultState: 'disabled_readiness',
    ownerPhase: 'phase_8',
    transportCapability: 'AC-only redacted health, lag, DLQ, and consumer summaries.',
    localDevModes: ['disabled', 'local_stub', 'external_provided'],
    sourceOfTruthBoundary: 'Monitoring exposes redacted transport state, not raw event payloads.',
  },
];

function assertSafeSegment(segment: string, label: string): string {
  if (!segment || unsafeSubjectSegmentPattern.test(segment)) {
    throw new Error(`Unsafe ${label} segment for event backbone subject: ${segment}`);
  }

  return segment;
}

function normalizeEnvironment(environment: string): string {
  return assertSafeSegment(lowerSnake(environment || 'local'), 'environment');
}

export function generateEventSubject(
  definition: Pick<TcrnEventDefinition, 'family' | 'code' | 'scopeClass'>,
  environment = 'local'
): string {
  return [
    'tcrn',
    normalizeEnvironment(environment),
    assertSafeSegment(definition.family, 'family'),
    assertSafeSegment(definition.code, 'event code'),
    assertSafeSegment(definition.scopeClass, 'scope class'),
  ].join('.');
}

export function generateStreamName(adapterCode: string, family: string): string {
  return `stream_${assertSafeSegment(lowerSnake(adapterCode), 'adapter')}_${assertSafeSegment(
    lowerSnake(family),
    'family'
  )}`;
}

export function generateConsumerDurableName(owner: string, family: string): string {
  return `consumer_${assertSafeSegment(lowerSnake(owner), 'consumer owner')}_${assertSafeSegment(
    lowerSnake(family),
    'family'
  )}`;
}

export function readEventRegistryBaseline(environment = 'local') {
  const definitions = TCRN_EVENT_DEFINITIONS.map((definition) => ({
    ...definition,
    subject: generateEventSubject(definition, environment),
    streamName: generateStreamName('nats_jetstream_backbone', definition.family),
    consumerDurableName: generateConsumerDurableName(definition.producer, definition.family),
  }));
  const codes = new Set(definitions.map((definition) => definition.code));
  const subjects = new Set(definitions.map((definition) => definition.subject));

  return {
    version: 'phase_8_initial',
    environment,
    total: definitions.length,
    uniqueCodes: codes.size,
    uniqueSubjects: subjects.size,
    definitions,
  };
}

export function assertEventRegistryIntegrity(): void {
  const baseline = readEventRegistryBaseline();

  if (baseline.total !== baseline.uniqueCodes) {
    throw new Error('Duplicate TCRN event registry code detected');
  }

  if (baseline.total !== baseline.uniqueSubjects) {
    throw new Error('Duplicate TCRN event subject mapping detected');
  }
}

assertEventRegistryIntegrity();
