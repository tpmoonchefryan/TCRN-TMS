// SPDX-License-Identifier: Apache-2.0
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { EventBackboneService } from './event-backbone.service';

function buildService(env: Record<string, string | undefined> = {}) {
  return new EventBackboneService({
    get: (key: string) => env[key],
  } as never);
}

const context = {
  tenantId: '00000000-0000-0000-0000-0000000000ac',
  tenantSchema: 'tenant_ac',
  actorId: '00000000-0000-0000-0000-00000000ac01',
};

describe('EventBackboneService', () => {
  it('returns registry and subject mapping from TCRN-owned definitions', () => {
    const service = buildService();
    const registry = service.getRegistry({ environment: 'local' });
    const mapping = service.getSubjectMapping({ environment: 'local' });

    expect(registry.total).toBeGreaterThan(40);
    expect(registry.definitions.some((definition) => definition.code === 'webhook.delivery.dlq')).toBe(
      true
    );
    expect(mapping.mapping.every((entry) => entry.subject.startsWith('tcrn.local.'))).toBe(true);
    expect(mapping.mapping.map((entry) => entry.subject).join('\n')).not.toMatch(
      /@|secret=|access_token=|tenant-[a-z0-9]|customer-[a-z0-9]/
    );
  });

  it('keeps disabled mode as default and preserves BullMQ classifications', () => {
    const service = buildService();
    const summary = service.getSummary({}, context);

    expect(summary.bridgeMode).toBe('disabled');
    expect(summary.streams.every((stream) => stream.status === 'not_created')).toBe(true);
    expect(service.getBullMqClassification().queues).toHaveLength(8);
    expect(service.getBullMqClassification().queues.find((entry) => entry.queue === 'log')?.classification).toBe(
      'preserve'
    );
  });

  it('allows dry-run replay preview and rejects side-effect replay', () => {
    const service = buildService();

    expect(
      service.previewReplay(
        {
          outboxId: 'outbox-1',
          reason: 'Investigate failed local stub consumer',
          dryRun: true,
        },
        context
      )
    ).toMatchObject({
      accepted: true,
      dryRun: true,
      sideEffects: [],
      tenantId: context.tenantId,
    });

    expect(
      service.previewReplay(
        {
          outboxId: 'outbox-1',
          reason: 'Investigate failed local stub consumer',
        },
        context
      )
    ).toMatchObject({
      accepted: true,
      dryRun: true,
      sideEffects: [],
      tenantId: context.tenantId,
    });

    expect(() =>
      service.previewReplay(
        {
          outboxId: 'outbox-1',
          reason: 'Investigate failed local stub consumer',
          dryRun: false,
        },
        context
      )
    ).toThrow(BadRequestException);
  });
});
