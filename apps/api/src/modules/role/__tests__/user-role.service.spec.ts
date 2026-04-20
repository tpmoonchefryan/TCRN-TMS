// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { prisma } from '@tcrn/database';

import { DelegatedAdminService } from '../../delegated-admin/delegated-admin.service';
import { PermissionSnapshotService } from '../../permission/permission-snapshot.service';
import { TenantService } from '../../tenant/tenant.service';
import { UserRoleService } from '../user-role.service';

describe('UserRoleService', () => {
  const mockPrisma = prisma as unknown as {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };
  let service: UserRoleService;
  let mockSnapshotService: Partial<PermissionSnapshotService>;
  let mockDelegatedAdminService: Partial<DelegatedAdminService>;
  let mockTenantService: Partial<TenantService>;

  const testSchema = 'tenant_test123';
  const grantorUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    mockSnapshotService = {
      checkPermission: vi.fn(),
      refreshUserSnapshots: vi.fn(),
    };

    mockDelegatedAdminService = {
      hasDelegationForScope: vi.fn().mockResolvedValue(false),
    };

    mockTenantService = {
      getTenantBySchemaName: vi.fn().mockResolvedValue({
        id: 'tenant-1',
        tier: 'standard',
      }),
    };

    service = new UserRoleService(
      mockSnapshotService as PermissionSnapshotService,
      mockDelegatedAdminService as DelegatedAdminService,
      mockTenantService as TenantService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canAssignRoleAtScope', () => {
    it('prefers canonical system_user:admin without checking legacy fallback', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const result = await service.canAssignRoleAtScope(
        testSchema,
        grantorUserId,
        'VIEWER',
        'tenant',
        null,
      );

      expect(result).toBe(true);
      expect(mockSnapshotService.checkPermission).toHaveBeenCalledTimes(1);
      expect(mockSnapshotService.checkPermission).toHaveBeenCalledWith(
        testSchema,
        grantorUserId,
        'system_user',
        'admin',
        'tenant',
        null,
      );
    });

    it('rejects tenant-scope assignment when neither canonical nor legacy admin grant exists', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      const result = await service.canAssignRoleAtScope(
        testSchema,
        grantorUserId,
        'VIEWER',
        'tenant',
        null,
      );

      expect(result).toBe(false);
      expect(mockSnapshotService.checkPermission).toHaveBeenCalledTimes(1);
      expect(mockDelegatedAdminService.hasDelegationForScope).not.toHaveBeenCalled();
    });

    it('does not allow delegated assignment of high-privilege roles without tenant admin permission', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      const result = await service.canAssignRoleAtScope(
        testSchema,
        grantorUserId,
        'ADMIN',
        'subsidiary',
        'sub-123',
      );

      expect(result).toBe(false);
      expect(mockDelegatedAdminService.hasDelegationForScope).not.toHaveBeenCalled();
    });

    it('uses delegated admin checks for non-tenant scopes after canonical admin check fails', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      (mockDelegatedAdminService.hasDelegationForScope as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const result = await service.canAssignRoleAtScope(
        testSchema,
        grantorUserId,
        'VIEWER',
        'subsidiary',
        'sub-123',
      );

      expect(result).toBe(true);
      expect(mockDelegatedAdminService.hasDelegationForScope).toHaveBeenCalledWith(
        testSchema,
        grantorUserId,
        'subsidiary',
        'sub-123',
      );
    });
  });

  describe('assignRole', () => {
    it('rejects workspace-incompatible roles before writing assignments', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { id: 'role-1', code: 'PLATFORM_ADMIN' },
      ]);

      await expect(
        service.assignRole(
          'user-2',
          testSchema,
          {
            roleCode: 'PLATFORM_ADMIN',
            scopeType: 'tenant',
            inherit: false,
          },
          grantorUserId,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'PERM_ACCESS_DENIED',
        }),
      });

      expect(mockSnapshotService.checkPermission).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });
});
