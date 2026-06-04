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
      incrementPermissionVersion: vi.fn().mockResolvedValue(4),
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
        roleId: 'tenant-role-viewer',
        roleCode: 'VIEWER',
        roleName: 'Viewer',
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
        .mockResolvedValueOnce([{ id: 'tenant-role-viewer', code: 'VIEWER' }])
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
          roleCode: 'VIEWER',
          scopeType: 'tenant',
          inherit: false,
        },
        grantorUserId
      );

      expect(result).toEqual(assignment);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WHERE code = $1 AND is_active = true'),
        'VIEWER'
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "tenant_test123".user_role'),
        'user-2',
        'tenant-role-viewer',
        'tenant',
        null,
        false,
        grantorUserId,
        null
      );
      expect(mockSnapshotService.refreshUserSnapshots).toHaveBeenCalledWith(testSchema, 'user-2');
      expect(mockSnapshotService.incrementPermissionVersion).toHaveBeenCalledWith(testSchema);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('permission_governance_assignment'),
        grantorUserId,
        'role_assignment_create',
        'assignment-1',
        'VIEWER',
        expect.stringContaining('"permissionVersionAfter":4')
      );
    });

    it('rejects legacy admin compatibility roles before writing assignments', async () => {
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
          code: 'LEGACY_ADMIN_ROLE_ASSIGNMENT_REMOVED',
        }),
      });

      expect(mockSnapshotService.checkPermission).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('rejects legacy admin compatibility roles resolved by roleId', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'role-1', code: 'ADMIN' }]);

      await expect(
        service.assignRole(
          'user-2',
          testSchema,
          {
            roleId: 'role-1',
            scopeType: 'tenant',
            inherit: false,
          },
          grantorUserId
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'LEGACY_ADMIN_ROLE_ASSIGNMENT_REMOVED',
        }),
      });

      expect(mockSnapshotService.checkPermission).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe('Initial Admin assignment rescue invariant', () => {
    it('fails closed when removing the last active tenant-scope Initial Admin assignment', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            id: 'assignment-initial-admin',
            roleCode: 'INITIAL_ADMIN',
            scopeType: 'tenant',
            scopeId: null,
            expiresAt: null,
          },
        ])
        .mockResolvedValueOnce([{ count: 0n }]);

      await expect(
        service.removeAssignment('assignment-initial-admin', testSchema, grantorUserId)
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INITIAL_ADMIN_RESCUE_REQUIRED',
        }),
      });

      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(mockSnapshotService.incrementPermissionVersion).not.toHaveBeenCalled();
      expect(mockSnapshotService.refreshUserSnapshots).not.toHaveBeenCalled();
    });

    it('fails closed when expiring the last active tenant-scope Initial Admin assignment', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            id: 'assignment-initial-admin',
            roleCode: 'INITIAL_ADMIN',
            scopeType: 'tenant',
            scopeId: null,
            expiresAt: null,
          },
        ])
        .mockResolvedValueOnce([{ count: 0n }]);

      await expect(
        service.updateAssignment(
          'assignment-initial-admin',
          testSchema,
          {
            expiresAt: new Date(Date.now() - 1000),
          },
          grantorUserId
        )
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INITIAL_ADMIN_RESCUE_REQUIRED',
        }),
      });

      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(mockSnapshotService.incrementPermissionVersion).not.toHaveBeenCalled();
      expect(mockSnapshotService.refreshUserSnapshots).not.toHaveBeenCalled();
    });

    it('uses the current operator as the assignment removal audit actor', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            id: 'assignment-viewer',
            roleCode: 'VIEWER',
            scopeType: 'tenant',
            scopeId: null,
            expiresAt: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'assignment-viewer',
            userId: 'user-2',
            roleId: 'role-viewer',
            roleCode: 'VIEWER',
            scopeType: 'tenant',
            scopeId: null,
            inherit: false,
            grantedBy: 'original-grantor',
            expiresAt: null,
          },
        ]);

      await service.removeAssignment('assignment-viewer', testSchema, grantorUserId);

      expect(mockSnapshotService.incrementPermissionVersion).toHaveBeenCalledWith(testSchema);
      expect(mockSnapshotService.refreshUserSnapshots).toHaveBeenCalledWith(testSchema, 'user-2');
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('permission_governance_assignment'),
        grantorUserId,
        'role_assignment_remove',
        'assignment-viewer',
        'VIEWER',
        expect.stringContaining('"permissionVersionAfter":4')
      );
    });
  });
});
