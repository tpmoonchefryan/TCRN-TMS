// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';

import { RuntimeFlagsController } from './runtime-flags.controller';

const acRequest = {
  tenantContext: {
    tenantId: '00000000-0000-0000-0000-0000000000ac',
    schemaName: 'tenant_ac',
    tier: 'ac',
  },
  headers: {
    'x-request-id': 'req-p6',
    'user-agent': 'vitest',
  },
  ip: '127.0.0.1',
};
const user = {
  id: '00000000-0000-0000-0000-00000000ac01',
};

describe('RuntimeFlagsController', () => {
  it('passes AC tenant context to the runtime flag service', async () => {
    const service = {
      getSummary: vi.fn().mockResolvedValue({ ok: true }),
    };
    const controller = new RuntimeFlagsController(service as never);

    await controller.getSummary({ environment: 'local' }, acRequest as never, user as never);

    expect(service.getSummary).toHaveBeenCalledWith(
      { environment: 'local' },
      expect.objectContaining({
        tenantId: acRequest.tenantContext.tenantId,
        tenantSchema: acRequest.tenantContext.schemaName,
        actorId: user.id,
        requestId: 'req-p6',
      })
    );
  });

  it('rejects ordinary tenant context before reaching the service', async () => {
    const service = {
      listDefinitions: vi.fn(),
    };
    const controller = new RuntimeFlagsController(service as never);

    expect(() =>
      controller.listDefinitions(
        {
          ...acRequest,
          tenantContext: {
            ...acRequest.tenantContext,
            tier: 'standard',
          },
        } as never,
        user as never
      )
    ).toThrow('Runtime flag controls are available to AC operators only');
    expect(service.listDefinitions).not.toHaveBeenCalled();
  });
});
