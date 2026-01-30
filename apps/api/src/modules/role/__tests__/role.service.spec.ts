// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @tcrn/database before importing service
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { PermissionSnapshotService } from '../../permission/permission-snapshot.service';
import { RoleData, RoleService } from '../role.service';

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
    nameEn: 'Administrator',
    nameZh: '管理员',
    nameJa: '管理者',
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

  beforeEach(() => {
    vi.clearAllMocks();

    mockSnapshotService = {
      refreshRoleSnapshots: vi.fn().mockResolvedValue(5),
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

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        '%admin%',
      );
    });

    it('should filter by isSystem', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ count: BigInt(0) }]);

      await service.list(testSchema, { isSystem: true });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('is_system'),
        true,
      );
    });

    it('should filter by isActive', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await service.list(testSchema, { isActive: false });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('is_active'),
        false,
      );
    });

    it('should support sorting', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await service.list(testSchema, { sort: '-name' });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('name_en DESC'),
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
    it('should return role permissions', async () => {
      const mockPermissions = [
        { id: 'perm-1', resourceCode: 'CUSTOMER', action: 'READ', effect: 'grant', name: 'Customer Read' },
        { id: 'perm-2', resourceCode: 'CUSTOMER', action: 'WRITE', effect: 'grant', name: 'Customer Write' },
      ];
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(mockPermissions);

      const result = await service.getRolePermissions('role-123', testSchema);

      expect(result).toHaveLength(2);
      expect(result[0].resourceCode).toBe('CUSTOMER');
    });

    it('should support different languages', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await service.getRolePermissions('role-123', testSchema, 'zh');

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('name_zh'),
        'role-123',
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
          nameEn: 'New Role',
          permissionIds: [],
        },
        'user-123',
      );

      expect(result).toBeDefined();
      expect(result.code).toBe('ADMIN');
    });

    it('should throw when code already exists', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]); // Code taken

      await expect(
        service.create(testSchema, { code: 'ADMIN', nameEn: 'Test', permissionIds: [] }, 'user-123'),
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
          nameEn: 'New Role',
          permissionIds: ['perm-1', 'perm-2'],
        },
        'user-123',
      );

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    it('should update role', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockRole]) // findById
        .mockResolvedValueOnce([{ ...mockRole, nameEn: 'Updated' }]); // Update

      const result = await service.update(
        'role-123',
        testSchema,
        { nameEn: 'Updated', version: 1 },
        'user-123',
      );

      expect(result.nameEn).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.update('nonexistent', testSchema, { version: 1 }, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on version mismatch', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]); // Version 1

      await expect(
        service.update('role-123', testSchema, { version: 2 }, 'user-123'), // Wrong version
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setPermissions', () => {
    it('should replace role permissions', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockRole]) // findById before
        .mockResolvedValueOnce([{ ...mockRole, version: 2 }]); // findById after
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      const result = await service.setPermissions(
        'role-123',
        testSchema,
        ['perm-1', 'perm-2'],
        1,
        'user-123',
      );

      expect(result.affectedUsers).toBe(5);
      expect(mockSnapshotService.refreshRoleSnapshots).toHaveBeenCalledWith(testSchema, 'role-123');
    });

    it('should throw ForbiddenException for system role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockSystemRole]);

      await expect(
        service.setPermissions('system-role-123', testSchema, [], 1, 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw on version mismatch', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]);

      await expect(
        service.setPermissions('role-123', testSchema, [], 999, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate role and refresh snapshots', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockRole]) // findById before
        .mockResolvedValueOnce([{ ...mockRole, isActive: false }]); // findById after
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      const result = await service.deactivate('role-123', testSchema, 1, 'user-123');

      expect(result.isActive).toBe(false);
      expect(mockSnapshotService.refreshRoleSnapshots).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for system role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockSystemRole]);

      await expect(
        service.deactivate('system-role-123', testSchema, 1, 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.deactivate('nonexistent', testSchema, 1, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on version mismatch', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]);

      await expect(
        service.deactivate('role-123', testSchema, 999, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reactivate', () => {
    it('should reactivate role and refresh snapshots', async () => {
      const inactiveRole = { ...mockRole, isActive: false };
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([inactiveRole]) // findById before
        .mockResolvedValueOnce([mockRole]); // findById after
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);

      const result = await service.reactivate('role-123', testSchema, 1, 'user-123');

      expect(result.isActive).toBe(true);
      expect(mockSnapshotService.refreshRoleSnapshots).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.reactivate('nonexistent', testSchema, 1, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on version mismatch', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockRole]);

      await expect(
        service.reactivate('role-123', testSchema, 999, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
