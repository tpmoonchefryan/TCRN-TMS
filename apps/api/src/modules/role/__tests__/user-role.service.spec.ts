// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { DelegatedAdminService } from '../../delegated-admin/delegated-admin.service';
import { PermissionSnapshotService } from '../../permission/permission-snapshot.service';
import { UserRoleService } from '../user-role.service';

describe('UserRoleService', () => {
  let service: UserRoleService;
  let mockSnapshotService: Partial<PermissionSnapshotService>;
  let mockDelegatedAdminService: Partial<DelegatedAdminService>;

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

    service = new UserRoleService(
      mockSnapshotService as PermissionSnapshotService,
      mockDelegatedAdminService as DelegatedAdminService,
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
});
