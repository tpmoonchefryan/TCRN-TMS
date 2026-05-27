import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';

import { ModuleCapabilityService } from './module-capability.service';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $transaction: ReturnType<typeof vi.fn>;
};

const baseTenant = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'STD',
  name: 'Standard Tenant',
  schemaName: 'tenant_std',
  tier: 'standard',
  isActive: true,
  settings: {},
  createdAt: new Date('2026-05-27T00:00:00.000Z'),
  updatedAt: new Date('2026-05-27T00:00:00.000Z'),
};

describe('ModuleCapabilityService', () => {
  let tenantService: {
    getTenantById: ReturnType<typeof vi.fn>;
  };
  let service: ModuleCapabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    tenantService = {
      getTenantById: vi.fn().mockResolvedValue(baseTenant),
    };
    service = new ModuleCapabilityService(tenantService as never);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
  });

  it('denies current-tenant effective snapshots for disabled tenants before reading assignments', async () => {
    tenantService.getTenantById.mockResolvedValueOnce({
      ...baseTenant,
      isActive: false,
    });

    await expect(
      service.getCurrentTenantEffectiveCapabilities(baseTenant.id)
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('rejects non-assignable capability codes before mutation', async () => {
    await expect(
      service.replaceTenantCapabilities(
        baseTenant.id,
        {
          enabledCapabilityCodes: ['platform.ac_management'],
          version: 1,
        },
        '22222222-2222-4222-8222-222222222222'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects stale assignment versions without writing rows', async () => {
    const tx = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ version: 7 }]),
      $executeRawUnsafe: vi.fn(),
    };
    mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: unknown) => unknown) =>
      callback(tx)
    );

    await expect(
      service.replaceTenantCapabilities(
        baseTenant.id,
        {
          enabledCapabilityCodes: ['public_presence.homepage'],
          version: 1,
        },
        '22222222-2222-4222-8222-222222222222'
      )
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('records an audit row for AC-managed manual replacement', async () => {
    const tx = {
      $queryRawUnsafe: vi
        .fn()
        .mockResolvedValueOnce([{ version: 1 }])
        .mockResolvedValueOnce([{ capabilityCode: 'public_presence.homepage' }]),
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    };
    mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: unknown) => unknown) =>
      callback(tx)
    );
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ version: 2, updatedAt: new Date('2026-05-27T00:00:01.000Z') }])
      .mockResolvedValueOnce([
        {
          capabilityCode: 'marshmallow.mailbox',
          enabled: true,
          source: 'ac_manual',
          assignedBy: null,
          assignedAt: null,
          updatedBy: '22222222-2222-4222-8222-222222222222',
          updatedAt: new Date('2026-05-27T00:00:01.000Z'),
          note: 'manual acceptance',
        },
      ]);

    const result = await service.replaceTenantCapabilities(
      baseTenant.id,
      {
        enabledCapabilityCodes: ['marshmallow.mailbox'],
        version: 1,
        note: 'manual acceptance',
      },
      '22222222-2222-4222-8222-222222222222',
      { requestId: 'req-1', ipAddress: '127.0.0.1' }
    );

    const auditCall = tx.$executeRawUnsafe.mock.calls.find(([sql]) =>
      String(sql).includes('tenant_capability_audit')
    );

    expect(auditCall).toBeTruthy();
    expect(JSON.parse(String(auditCall?.[5]))).toEqual(['public_presence.homepage']);
    expect(JSON.parse(String(auditCall?.[6]))).toEqual(['marshmallow.mailbox']);
    expect(result.version).toBe(2);
    expect(result.effective.requiredRbacByCapability['marshmallow.mailbox']).toEqual([
      { resourceCode: 'talent.marshmallow', actions: ['read', 'update'] },
    ]);
  });
});
