// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import { TechEventType } from '../constants/event-types';
import {
  BULLMQ_QUEUE_CLASSIFICATIONS,
  EVENT_BACKBONE_ADAPTER_CATALOG,
  TCRN_EVENT_DEFINITIONS,
  generateConsumerDurableName,
  generateEventSubject,
  readEventRegistryBaseline,
} from './index';

describe('event backbone registry', () => {
  it('includes every current TechEventType exactly once under TCRN authority', () => {
    const technicalCodes = TCRN_EVENT_DEFINITIONS.filter(
      (definition) => definition.family === 'technical_event'
    ).map((definition) => definition.code);

    expect(technicalCodes).toHaveLength(Object.values(TechEventType).length);
    for (const eventType of Object.values(TechEventType)) {
      expect(technicalCodes).toContain(`technical_event.${eventType.toLowerCase()}`);
    }
  });

  it('generates non-PII subject and durable names from registry metadata', () => {
    const baseline = readEventRegistryBaseline('shared_dev');
    const forbidden = /tenant-[a-z0-9]|customer-[a-z0-9]|talent-[a-z0-9]|email@example|@|secret=|access_token=|phone=|report-[0-9]/i;

    expect(baseline.total).toBe(baseline.uniqueCodes);
    expect(baseline.total).toBe(baseline.uniqueSubjects);
    expect(baseline.definitions.every((definition) => definition.subject.startsWith('tcrn.'))).toBe(
      true
    );
    expect(baseline.definitions.some((definition) => definition.code === 'webhook.delivery.dlq')).toBe(
      true
    );
    expect(baseline.definitions.some((definition) => definition.code === 'job.email.failed')).toBe(
      true
    );
    expect(baseline.definitions.map((definition) => definition.subject).join('\n')).not.toMatch(
      forbidden
    );
    expect(generateEventSubject(baseline.definitions[0], 'local')).toMatch(/^tcrn\.local\./);
    expect(generateConsumerDurableName('worker.email', 'job')).toBe('consumer_worker_email_job');
  });

  it('preserves every current BullMQ queue with explicit classification', () => {
    expect(BULLMQ_QUEUE_CLASSIFICATIONS.map((entry) => entry.queue)).toEqual([
      'import',
      'report',
      'membership-renewal',
      'log',
      'log-cleanup',
      'export',
      'marshmallow-export',
      'email',
    ]);
    expect(BULLMQ_QUEUE_CLASSIFICATIONS.every((entry) => entry.rollbackRequirement)).toBe(true);
    expect(BULLMQ_QUEUE_CLASSIFICATIONS.find((entry) => entry.queue === 'log')?.classification).toBe(
      'preserve'
    );
  });

  it('keeps NATS disabled as transport and not source of truth', () => {
    const nats = EVENT_BACKBONE_ADAPTER_CATALOG.find(
      (entry) => entry.code === 'nats_jetstream_backbone'
    );

    expect(nats?.defaultState).toBe('disabled_readiness');
    expect(nats?.sourceOfTruthBoundary).toContain('never owns TCRN event meaning');
  });
});
