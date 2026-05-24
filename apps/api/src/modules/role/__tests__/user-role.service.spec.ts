// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';

import { DelegatedAdminService } from '../../delegated-admin/delegated-admin.service';
import { PermissionSnapshotService } from '../../permission/permission-snapshot.service';
import { TenantService } from '../../tenant/tenant.service';
import { UserRoleService } from '../user-role.service';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

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
      refreshAndCheckPermission: vi.fn(),
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
      mockTenantService as TenantService
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
        null
      );

      expect(result).toBe(true);
      expect(mockSnapshotService.checkPermission).toHaveBeenCalledTimes(1);
      expect(mockSnapshotService.checkPermission).toHaveBeenCalledWith(
        testSchema,
        grantorUserId,
        'system_user',
        'admin',
        'tenant',
        null
      );
      expect(mockSnapshotService.refreshAndCheckPermission).not.toHaveBeenCalled();
    });

    it('refreshes a stale tenant admin snapshot before accepting role assignment', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        false
      );
      (
        mockSnapshotService.refreshAndCheckPermission as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(true);

      const result = await service.canAssignRoleAtScope(
        testSchema,
        grantorUserId,
        'VIEWER',
        'tenant',
        null
      );

      expect(result).toBe(true);
      expect(mockSnapshotService.refreshAndCheckPermission).toHaveBeenCalledWith(
        testSchema,
        grantorUserId,
        'system_user',
        'admin',
        'tenant',
        null
      );
      expect(mockDelegatedAdminService.hasDelegationForScope).not.toHaveBeenCalled();
    });

    it('rejects tenant-scope assignment when a refreshed canonical admin grant is still absent', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        false
      );
      (
        mockSnapshotService.refreshAndCheckPermission as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(false);

      const result = await service.canAssignRoleAtScope(
        testSchema,
        grantorUserId,
        'VIEWER',
        'tenant',
        null
      );

      expect(result).toBe(false);
      expect(mockSnapshotService.checkPermission).toHaveBeenCalledTimes(1);
      expect(mockSnapshotService.refreshAndCheckPermission).toHaveBeenCalledTimes(1);
      expect(mockDelegatedAdminService.hasDelegationForScope).not.toHaveBeenCalled();
    });

    it('does not allow delegated assignment of high-privilege roles without tenant admin permission', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        false
      );
      (
        mockSnapshotService.refreshAndCheckPermission as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(false);

      const result = await service.canAssignRoleAtScope(
        testSchema,
        grantorUserId,
        'ADMIN',
        'subsidiary',
        'sub-123'
      );

      expect(result).toBe(false);
      expect(mockDelegatedAdminService.hasDelegationForScope).not.toHaveBeenCalled();
    });

    it('uses delegated admin checks for non-tenant scopes after canonical admin check fails', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        false
      );
      (
        mockSnapshotService.refreshAndCheckPermission as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(false);
      (
        mockDelegatedAdminService.hasDelegationForScope as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(true);

      const result = await service.canAssignRoleAtScope(
        testSchema,
        grantorUserId,
        'VIEWER',
        'subsidiary',
        'sub-123'
      );

      expect(result).toBe(true);
      expect(mockDelegatedAdminService.hasDelegationForScope).toHaveBeenCalledWith(
        testSchema,
        grantorUserId,
        'subsidiary',
        'sub-123'
      );
    });
  });

  describe('getUserRoles', () => {
    it('normalizes full Chinese locale tags before selecting LocalizedText JSON values', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await service.getUserRoles('user-2', testSchema, 'zh-Hant-TW');

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("r.name->>'zh_HANT'"),
        'user-2'
      );
    });
  });

  describe('assignRole', () => {
    it('resolves roleCode inside the tenant schema before writing the assignment', async () => {
      const assignment = {
        id: 'assignment-1',
        userId: 'user-2',
        roleId: 'tenant-role-admin',
        roleCode: 'ADMIN',
        roleName: 'Administrator',
        scopeType: 'tenant',
        scopeId: null,
        scopeName: null,
        scopePath: null,
        inherit: false,
        grantedAt: new Date('2026-04-17T00:00:00.000Z'),
        grantedById: grantorUserId,
        grantedByUsername: 'grantor',
        expiresAt: null,
      };

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: 'tenant-role-admin', code: 'ADMIN' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([assignment]);
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
      (
        mockSnapshotService.refreshAndCheckPermission as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(false);
      (mockSnapshotService.refreshUserSnapshots as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        undefined
      );
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      const result = await service.assignRole(
        'user-2',
        testSchema,
        {
          roleCode: 'ADMIN',
          scopeType: 'tenant',
          inherit: false,
        },
        grantorUserId
      );

      expect(result).toEqual(assignment);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WHERE code = $1 AND is_active = true'),
        'ADMIN'
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "tenant_test123".user_role'),
        'user-2',
        'tenant-role-admin',
        'tenant',
        null,
        false,
        grantorUserId,
        null
      );
      expect(mockSnapshotService.refreshUserSnapshots).toHaveBeenCalledWith(testSchema, 'user-2');
    });

    it('rejects workspace-incompatible roles before writing assignments', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'role-1', code: 'PLATFORM_ADMIN' }]);

      await expect(
        service.assignRole(
          'user-2',
          testSchema,
          {
            roleCode: 'PLATFORM_ADMIN',
            scopeType: 'tenant',
            inherit: false,
          },
          grantorUserId
        )
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
