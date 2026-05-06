// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PermissionController } from '../permission.controller';
import { PermissionService } from '../permission.service';
import { PermissionSnapshotService } from '../permission-snapshot.service';

describe('PermissionController', () => {
  let controller: PermissionController;
  let mockPermissionService: Partial<PermissionService>;
  let mockSnapshotService: Partial<PermissionSnapshotService>;

  const user: AuthenticatedUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    email: 'user@example.com',
    username: 'user',
  };

  beforeEach(() => {
    mockPermissionService = {
      list: vi.fn(),
      getResourceDefinitions: vi.fn(),
    };

    mockSnapshotService = {
      checkPermission: vi.fn(),
      refreshAndCheckPermission: vi.fn(),
    };

    controller = new PermissionController(
      mockPermissionService as PermissionService,
      mockSnapshotService as PermissionSnapshotService,
    );
  });

  describe('list', () => {
    it('normalizes full Chinese locale tags before localizing permission display names', async () => {
      (mockPermissionService.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: 'perm-1',
          resourceCode: 'customer.profile',
          action: 'read',
          nameEn: 'Customer Profile',
          nameZh: '客户档案',
          nameJa: '顧客プロファイル',
          description: null,
          isSystem: true,
          isActive: true,
        },
      ]);

      const result = await controller.list(
        user,
        {},
        { headers: { 'accept-language': 'zh-Hant-TW,zh;q=0.9' } } as never,
      );

      expect(result.data[0].name).toBe('客户档案');
    });
  });

  describe('checkPermissions', () => {
    it('normalizes alias actions before refreshing stale denied snapshot checks', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      (mockSnapshotService.refreshAndCheckPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const result = await controller.checkPermissions(user, {
        checks: [{ resource: 'report.mfr', action: 'export' }],
      });

      expect(mockSnapshotService.checkPermission).toHaveBeenCalledWith(
        'tenant_test',
        'user-1',
        'report.mfr',
        'execute',
        undefined,
        undefined,
      );
      expect(mockSnapshotService.refreshAndCheckPermission).toHaveBeenCalledWith(
        'tenant_test',
        'user-1',
        'report.mfr',
        'execute',
        undefined,
        undefined,
      );

      expect(result).toEqual({
        success: true,
        data: {
          results: [
            {
              resource: 'report.mfr',
              action: 'export',
              checkedAction: 'execute',
              allowed: true,
            },
          ],
        },
      });
    });

    it('does not force refresh when the existing snapshot already allows the check', async () => {
      (mockSnapshotService.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const result = await controller.checkPermissions(user, {
        checks: [{ resource: 'system_user', action: 'admin' }],
      });

      expect(mockSnapshotService.refreshAndCheckPermission).not.toHaveBeenCalled();
      expect(result.data.results[0]).toMatchObject({
        resource: 'system_user',
        action: 'admin',
        checkedAction: 'admin',
        allowed: true,
      });
    });

    it('rejects unsupported resource/action combinations with bad request', async () => {
      await expect(controller.checkPermissions(user, {
        checks: [{ resource: 'log.search', action: 'delete' as const }],
      })).rejects.toThrow(BadRequestException);

      expect(mockSnapshotService.checkPermission).not.toHaveBeenCalled();
      expect(mockSnapshotService.refreshAndCheckPermission).not.toHaveBeenCalled();
    });

    it('rejects unknown resource codes even if DTO validation is bypassed', async () => {
      await expect(controller.checkPermissions(user, {
        checks: [{ resource: 'config.unknown' as never, action: 'read' }],
      })).rejects.toThrow(BadRequestException);

      expect(mockSnapshotService.checkPermission).not.toHaveBeenCalled();
      expect(mockSnapshotService.refreshAndCheckPermission).not.toHaveBeenCalled();
    });
  });
});
