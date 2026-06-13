// SPDX-License-Identifier: Apache-2.0
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PlatformToolsController } from './platform-tools.controller';

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
    ip: '127.0.0.1',
    socket: {
      remoteAddress: '127.0.0.1',
    },
  } as never;
}

const actor = {
  id: '00000000-0000-0000-0000-00000000ac01',
} as never;

describe('PlatformToolsController', () => {
  it('allows AC tenant context to read definitions', async () => {
    const service = {
      listDefinitions: vi.fn().mockResolvedValue([]),
    };
    const controller = new PlatformToolsController(service as never);

    await expect(controller.listDefinitions(buildRequest('ac'), actor)).resolves.toEqual([]);
    expect(service.listDefinitions).toHaveBeenCalledTimes(1);
    expect(service.listDefinitions).toHaveBeenCalledWith(
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
        listDefinitions: vi.fn().mockResolvedValue([]),
      };
      const controller = new PlatformToolsController(service as never);

      expect(() => controller.listDefinitions(buildRequest(tier), actor)).toThrow(ForbiddenException);
      expect(service.listDefinitions).not.toHaveBeenCalled();
    }
  );
});
