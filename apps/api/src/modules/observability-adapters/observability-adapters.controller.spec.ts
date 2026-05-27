// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ObservabilityAdaptersController } from './observability-adapters.controller';

function buildRequest(tier: string | null) {
  return {
    tenantContext: tier
      ? {
          tenantId: '00000000-0000-0000-0000-0000000000ac',
          schemaName: 'tenant_ac',
          tier,
        }
      : null,
    headers: {},
  } as never;
}

const actor = {
  id: '00000000-0000-0000-0000-00000000ac01',
} as never;

describe('ObservabilityAdaptersController', () => {
  it('allows AC tenant context to read summary', async () => {
    const service = {
      getSummary: vi.fn().mockResolvedValue([]),
    };
    const controller = new ObservabilityAdaptersController(service as never);

    await expect(controller.getSummary({ environment: 'local' }, buildRequest('ac'), actor)).resolves.toEqual([]);
    expect(service.getSummary).toHaveBeenCalledWith(
      { environment: 'local' },
      expect.objectContaining({
        tenantId: '00000000-0000-0000-0000-0000000000ac',
        tenantSchema: 'tenant_ac',
        actorId: '00000000-0000-0000-0000-00000000ac01',
      })
    );
  });

  it.each([['standard'], ['subsidiary'], [null]])(
    'denies non-AC tenant context %s',
    async (tier) => {
      const service = {
        getSummary: vi.fn().mockResolvedValue([]),
      };
      const controller = new ObservabilityAdaptersController(service as never);

      expect(() => controller.getSummary({ environment: 'local' }, buildRequest(tier), actor)).toThrow(
        ForbiddenException
      );
      expect(service.getSummary).not.toHaveBeenCalled();
    }
  );
});
