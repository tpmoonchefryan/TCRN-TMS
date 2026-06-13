// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';

import { EventBackboneController } from './event-backbone.controller';

const acRequest = {
  tenantContext: {
    tenantId: '00000000-0000-0000-0000-0000000000ac',
    schemaName: 'tenant_ac',
    tier: 'ac',
  },
  headers: {
    'x-request-id': 'req-p8',
    'user-agent': 'vitest',
  },
  ip: '127.0.0.1',
};
const user = {
  id: '00000000-0000-0000-0000-00000000ac01',
};

describe('EventBackboneController', () => {
  it('passes AC context to the event backbone service', () => {
    const service = {
      getSummary: vi.fn().mockReturnValue({ ok: true }),
    };
    const controller = new EventBackboneController(service as never);

    controller.getSummary({ environment: 'local' }, acRequest as never, user as never);

    expect(service.getSummary).toHaveBeenCalledWith(
      { environment: 'local' },
      expect.objectContaining({
        tenantId: acRequest.tenantContext.tenantId,
        tenantSchema: acRequest.tenantContext.schemaName,
        actorId: user.id,
        requestId: 'req-p8',
      })
    );
  });

  it('rejects ordinary tenant context before reaching the service', () => {
    const service = {
      getRegistry: vi.fn(),
    };
    const controller = new EventBackboneController(service as never);

    expect(() =>
      controller.getRegistry(
        { environment: 'local' },
        {
          ...acRequest,
          tenantContext: {
            ...acRequest.tenantContext,
            tier: 'standard',
          },
        } as never,
        user as never
      )
    ).toThrow('Event backbone controls are available to AC operators only');
    expect(service.getRegistry).not.toHaveBeenCalled();
  });
});
