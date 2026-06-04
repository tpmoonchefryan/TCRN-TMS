// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PermissionSnapshotService } from '../../permission/permission-snapshot.service';
import { RoleData, RoleService } from '../role.service';

// Mock @tcrn/database before importing service
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('RoleService', () => {
  let service: RoleService;
  let mockSnapshotService: Partial<PermissionSnapshotService>;

  const testSchema = 'tenant_test123';

  const mockRole: RoleData = {
    id: 'role-123',
    code: 'ADMIN',
    name: {
      en: 'Administrator',
      zh_HANS: '管理员',
      zh_HANT: '管理員',
      ja: '管理者',
      ko: 'Administrator',
      fr: 'Administrator',
    },
    description: 'Full system access',
    isSystem: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const mockSystemRole: RoleData = {
    ...mockRole,
    id: 'system-role-123',
    code: 'GLOBAL_ADMIN',
    isSystem: true,
  };

  const newRoleName = {
    en: 'New Role',
    zh_HANS: 'New Role',
    zh_HANT: 'New Role',
    ja: 'New Role',
    ko: 'New Role',
    fr: 'New Role',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSnapshotService = {
      refreshRoleSnapshots: vi.fn().mockResolvedValue(5),
      getCurrentPermissionVersion: vi.fn().mockResolvedValue(0),
      incrementPermissionVersion: vi.fn().mockResolvedValue(7),
    };

    service = new RoleService(mockSnapshotService as PermissionSnapshotService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('list', () => {
    it('should return roles with permission and user counts', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockRole]) // Roles query
        .mockResolvedValueOnce([{ count: BigInt(5) }]) // Permission count
        .mockResolvedValueOnce([{ count: BigInt(3) }]); // User count

      const result = await service.list(testSchema);

      expect(result).toHaveLength(1);
      expect(result[0].permissionCount).toBe(5);
      expect(result[0].userCount).toBe(3);
    });

    it('should filter by search term', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockRole])
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.list(testSchema, { search: 'admin' });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('ILIKE'),
        '%admin%',
        expect.arrayContaining(['ADMIN', 'PLATFORM_ADMIN', 'TENANT_ADMIN'])
      );
    });

    it('should filter by isSystem', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ count: BigInt(0) }]);

      await service.list(testSchema, { isSystem: true });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('is_system'),
        true,
        expect.arrayContaining(['ADMIN', 'PLATFORM_ADMIN', 'TENANT_ADMIN'])
      );
    });

    it('does not expose role active/inactive filtering in the canonical list path', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await service.list(testSchema);

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
        1,
        expect.not.stringContaining('AND is_active'),
        expect.arrayContaining(['ADMIN', 'PLATFORM_ADMIN', 'TENANT_ADMIN'])
      );
    });

    it('should support sorting', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await service.list(testSchema, { sort: '-name' });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("name->>'en' DESC"),
        expect.arrayContaining(['ADMIN', 'PLATFORM_ADMIN', 'TENANT_ADMIN'])
      );
    });
  });

  describe('findById', () => {
    it('should return role by ID', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]);

      const result = await service.findById('role-123', testSchema);

      expect(result).toEqual(mockRole);
    });

    it('should return null for non-existent role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await service.findById('nonexistent', testSchema);

      expect(result).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('should return role by code', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]);

      const result = await service.findByCode('ADMIN', testSchema);

      expect(result).toEqual(mockRole);
    });
  });

  describe('getRolePermissions', () => {
    it('returns only catalog-backed canonical role permissions', async () => {
      const mockPermissions = [
        {
          id: 'perm-1',
          resourceCode: 'customer.profile',
          action: 'read',
          effect: 'grant',
          name: 'Customer Profile',
        },
        {
          id: 'perm-2',
          resourceCode: 'legacy.unknown',
          action: 'read',
          effect: 'grant',
          name: 'Legacy Unknown',
        },
        {
          id: 'perm-3',
          resourceCode: 'log.search',
          action: 'delete',
          effect: 'grant',
          name: 'Log Search Delete',
        },
        {
          id: 'perm-4',
          resourceCode: 'customer.profile',
          action: 'create',
          effect: 'grant',
          name: 'Customer Create',
        },
      ];
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(mockPermissions);

      const result = await service.getRolePermissions('role-123', testSchema);

      expect(result).toEqual([
        {
          id: 'perm-1',
          resourceCode: 'customer.profile',
          action: 'read',
          effect: 'grant',
          name: 'Customer Profile',
        },
      ]);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('rp.effect as effect'),
        'role-123'
      );
    });

    it('should support different supported UI locale tags', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await service.getRolePermissions('role-123', testSchema, 'zh-Hant-TW');

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('r.name as name'),
        'role-123'
      );
    });

    it('uses the catalog LocalizedText source for non-English UI locales', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await service.getRolePermissions('role-123', testSchema, 'fr-FR');

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('r.name as name'),
        'role-123'
      );
    });
  });

  describe('create', () => {
    it('should create new role', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // Code not taken
        .mockResolvedValueOnce([mockRole]); // Insert

      const result = await service.create(
        testSchema,
        {
          code: 'NEW_ROLE',
          name: newRoleName,
          permissionIds: [],
        },
        'user-123'
      );

      expect(result).toBeDefined();
      expect(result.code).toBe('ADMIN');
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('roleDefinitionRecord'),
        'role-123',
        expect.any(String)
      );
    });

    it('should throw when code already exists', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]); // Code taken

      await expect(
        service.create(
          testSchema,
          { code: 'ADMIN', name: newRoleName, permissionIds: [] },
          'user-123'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should add permissions when provided', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // Code not taken
        .mockResolvedValueOnce([mockRole]); // Insert
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      await service.create(
        testSchema,
        {
          code: 'NEW_ROLE',
          name: newRoleName,
          permissionIds: ['perm-1', 'perm-2'],
        },
        'user-123'
      );

      expect(mockSnapshotService.incrementPermissionVersion).toHaveBeenCalledWith(testSchema);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(4);
    });

    it('should insert role code as text instead of uuid-casting it', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // Code not taken
        .mockResolvedValueOnce([mockRole]); // Insert

      await service.create(
        testSchema,
        {
          code: 'NEW_ROLE',
          name: newRoleName,
          permissionIds: [],
        },
        'user-123'
      );

      const insertQuery = mockPrisma.$queryRawUnsafe.mock.calls[1]?.[0];
      expect(insertQuery).toContain(
        '(gen_random_uuid(), $1, $2::jsonb, $3, false, true, now(), now(), $4, $4, 1)'
      );
      expect(insertQuery).not.toContain('$1::uuid');
    });
  });

  describe('update', () => {
    it('should update role', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockRole]) // findById
        .mockResolvedValueOnce([{ ...mockRole, name: { ...mockRole.name, en: 'Updated' } }]) // Update
        .mockResolvedValueOnce([{ ...mockRole, name: { ...mockRole.name, en: 'Updated' } }]); // findById after

      const result = await service.update(
        'role-123',
        testSchema,
        { name: { en: 'Updated' }, version: 1 },
        'user-123'
      );

      expect(result.name.en).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.update('nonexistent', testSchema, { version: 1 }, 'user-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on version mismatch', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]); // Version 1

      await expect(
        service.update('role-123', testSchema, { version: 2 }, 'user-123') // Wrong version
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setPermissions', () => {
    it('should replace role permissions', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockRole]) // findById before
        .mockResolvedValueOnce([]) // permission audit snapshot before
        .mockResolvedValueOnce([]) // permission audit snapshot after
        .mockResolvedValueOnce([{ ...mockRole, version: 2 }]); // findById after
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      const result = await service.setPermissions(
        'role-123',
        testSchema,
        ['perm-1', 'perm-2'],
        1,
        'user-123'
      );

      expect(result.affectedUsers).toBe(5);
      expect(mockSnapshotService.incrementPermissionVersion).toHaveBeenCalledWith(testSchema);
      expect(mockSnapshotService.refreshRoleSnapshots).toHaveBeenCalledWith(testSchema, 'role-123');
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('permission_governance_role'),
        'user-123',
        'role_permission_change',
        'role-123',
        'ADMIN',
        expect.stringContaining('"permissionVersionAfter":7')
      );
    });

    it('should throw ForbiddenException for system role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockSystemRole]);

      await expect(
        service.setPermissions('system-role-123', testSchema, [], 1, 'user-123')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw on version mismatch', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]);

      await expect(
        service.setPermissions('role-123', testSchema, [], 999, 'user-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('returns Gone because roles do not have an active/inactive lifecycle', async () => {
      await expect(service.deactivate('role-123', testSchema, 1, 'user-123')).rejects.toThrow(
        GoneException
      );
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(mockSnapshotService.refreshRoleSnapshots).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('returns Gone because roles do not have an active/inactive lifecycle', async () => {
      await expect(service.reactivate('role-123', testSchema, 1, 'user-123')).rejects.toThrow(
        GoneException
      );
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(mockSnapshotService.refreshRoleSnapshots).not.toHaveBeenCalled();
    });
  });
});
