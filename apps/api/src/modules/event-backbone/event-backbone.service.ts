// SPDX-License-Identifier: Apache-2.0
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  BULLMQ_QUEUE_CLASSIFICATIONS,
  EVENT_BACKBONE_ADAPTER_CATALOG,
  EVENT_BACKBONE_BRIDGE_MODES,
  ErrorCodes,
  generateConsumerDurableName,
  generateEventSubject,
  generateStreamName,
  readEventRegistryBaseline,
  type EventBackboneBridgeMode,
  type PlatformToolConnectionEnvironment,
  type TcrnEventDefinition,
} from '@tcrn/shared';

import type { EventBackboneQueryDto, EventBackboneReplayPreviewDto } from './dto/event-backbone.dto';

export interface EventBackboneRequestContext {
  tenantId: string;
  tenantSchema?: string;
  actorId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string | string[];
}

function resolveBridgeMode(
  queryMode: EventBackboneBridgeMode | undefined,
  configMode: string | undefined
): EventBackboneBridgeMode {
  const candidate = queryMode ?? configMode ?? 'disabled';
  return EVENT_BACKBONE_BRIDGE_MODES.includes(candidate as EventBackboneBridgeMode)
    ? (candidate as EventBackboneBridgeMode)
    : 'disabled';
}

function countBy<T extends string>(values: readonly T[]) {
  return values.reduce<Record<T, number>>(
    (accumulator, value) => ({
      ...accumulator,
      [value]: (accumulator[value] ?? 0) + 1,
    }),
    {} as Record<T, number>
  );
}

@Injectable()
export class EventBackboneService {
  constructor(private readonly configService: ConfigService) {}

  getRegistry(query: EventBackboneQueryDto = {}) {
    const environment = query.environment ?? 'local';
    return {
      sourceOfTruth:
        'TCRN event registry owns event meaning, payload schemas, producer authorization, tenant scope, replay policy, and audit.',
      ...readEventRegistryBaseline(environment),
    };
  }

  getSubjectMapping(query: EventBackboneQueryDto = {}) {
    const registry = this.getRegistry(query);

    return {
      environment: registry.environment,
      mapping: registry.definitions.map((definition) => ({
        eventCode: definition.code,
        family: definition.family,
        subject: definition.subject,
        streamName: definition.streamName,
        consumerDurableName: definition.consumerDurableName,
        scopeClass: definition.scopeClass,
        piiClass: definition.piiClass,
      })),
      forbiddenSubjectMaterial: [
        'tenant names',
        'customer ids',
        'talent codes',
        'email addresses',
        'phone numbers',
        'report ids',
        'import file names',
        'secrets',
        'tokens',
      ],
    };
  }

  getBullMqClassification() {
    return {
      sourceOfTruth:
        'BullMQ queue names remain runtime mechanics. Phase 8 only preserves or mirrors lifecycle summaries according to this classification.',
      queues: BULLMQ_QUEUE_CLASSIFICATIONS,
      queueCount: BULLMQ_QUEUE_CLASSIFICATIONS.length,
      classificationCounts: countBy(BULLMQ_QUEUE_CLASSIFICATIONS.map((entry) => entry.classification)),
    };
  }

  getPolicy() {
    return {
      replay: {
        requiresPermission: 'platform.event_backbone:execute',
        requiresReason: true,
        defaultDryRun: true,
        crossTenantReplay: 'denied',
        idempotency: 'outbox idempotency key and consumer side-effect key are required',
      },
      redaction: {
        subjects: 'no PII, raw ids, secrets, tokens, cookies, auth headers, or report/import payload names',
        payloads: 'restricted payload classes keep redacted summaries in evidence and UI',
        dlq: 'DLQ summaries expose reason/status only, never raw payload bodies',
      },
      authority:
        'NATS may own stream transport mechanics only. TCRN owns event registry, outbox, replay approval, tenant scope, and audit truth.',
    };
  }

  getSummary(query: EventBackboneQueryDto = {}, _context?: EventBackboneRequestContext) {
    const environment = query.environment ?? 'local';
    const bridgeMode = resolveBridgeMode(
      query.bridgeMode,
      this.configService.get<string>('EVENT_BACKBONE_MODE')
    );
    const registry = readEventRegistryBaseline(environment);
    const families = [...new Set(registry.definitions.map((definition) => definition.family))];

    return {
      environment,
      bridgeMode,
      readinessState: bridgeMode === 'disabled' ? 'disabled' : 'readiness_only',
      sourceOfTruthBoundary:
        'TCRN owns event meaning, outbox, tenant isolation, idempotency, replay approval, and audit. NATS is transport only and disabled by default.',
      adapters: EVENT_BACKBONE_ADAPTER_CATALOG,
      registry: {
        totalEvents: registry.total,
        families,
        restrictedEvents: registry.definitions.filter((definition) => definition.piiClass === 'restricted')
          .length,
      },
      streams: families.map((family) => ({
        family,
        streamName: generateStreamName('nats_jetstream_backbone', family),
        status: bridgeMode === 'disabled' ? 'not_created' : 'readiness_only',
        rawPayloadAccess: false,
        pendingOutboxCount: 0,
        dlqCount: 0,
      })),
      consumers: BULLMQ_QUEUE_CLASSIFICATIONS.map((queue) => ({
        owner: queue.owner,
        queue: queue.queue,
        durableName: generateConsumerDurableName(queue.owner, 'job'),
        classification: queue.classification,
        sideEffectPolicy:
          queue.classification === 'preserve'
            ? 'no stream side effect in Phase 8'
            : 'mirror lifecycle summary only',
        status: 'preserved',
      })),
      bridgeModes: EVENT_BACKBONE_BRIDGE_MODES.map((mode) => ({
        mode,
        available: mode === 'disabled' || mode === 'local_stub',
        requiresExplicitEnable: mode !== 'disabled',
      })),
    };
  }

  previewReplay(dto: EventBackboneReplayPreviewDto, context: EventBackboneRequestContext) {
    if (dto.dryRun === false) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Phase 8 replay endpoint is dry-run only until consumer side-effect proof is accepted',
      });
    }

    return {
      accepted: true,
      dryRun: true,
      outboxId: dto.outboxId,
      requestedBy: context.actorId ?? null,
      tenantId: context.tenantId,
      reason: dto.reason,
      sideEffects: [],
      audit:
        'Replay preview records authorization intent only; no NATS publish, DLQ redrive, or consumer side effect occurs.',
    };
  }

  projectEventEnvelope(definition: TcrnEventDefinition, environment: PlatformToolConnectionEnvironment) {
    return {
      eventCode: definition.code,
      payloadVersion: definition.payloadVersion,
      piiClass: definition.piiClass,
      subject: generateEventSubject(definition, environment),
      headers: ['tenant_id', 'subsidiary_id', 'talent_id', 'actor_id', 'trace_id', 'idempotency_key'],
    };
  }
}
