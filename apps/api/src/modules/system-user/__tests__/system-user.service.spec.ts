// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock @tcrn/database before importing service
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { SystemUserService, SystemUserData } from '../system-user.service';
import { PasswordService } from '../../auth/password.service';
import { PermissionSnapshotService } from '../../permission/permission-snapshot.service';
import { prisma } from '@tcrn/database';

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('SystemUserService', () => {
  let service: SystemUserService;
  let mockPasswordService: Partial<PasswordService>;
  let mockSnapshotService: Partial<PermissionSnapshotService>;

  const testSchema = 'tenant_test123';

  const mockUser: SystemUserData = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    phone: '+81-90-1234-5678',
    avatarUrl: null,
    preferredLanguage: 'en',
    isActive: true,
    isTotpEnabled: false,
    forceReset: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPasswordService = {
      validate: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
      hash: vi.fn().mockResolvedValue('hashed_password'),
    };

    mockSnapshotService = {
      deleteUserSnapshots: vi.fn().mockResolvedValue(undefined),
      refreshUserSnapshots: vi.fn().mockResolvedValue(undefined),
    };

    service = new SystemUserService(
      mockPasswordService as PasswordService,
      mockSnapshotService as PermissionSnapshotService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('list', () => {
    it('should return paginated users', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(1) }]) // Count query
        .mockResolvedValueOnce([mockUser]); // Data query

      const result = await service.list(testSchema);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by search term', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockUser]);

      await service.list(testSchema, { search: 'test' });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        '%test%',
      );
    });

    it('should filter by isActive', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([]);

      await service.list(testSchema, { isActive: true });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('is_active'),
        true,
      );
    });

    it('should filter by roleId', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([]);

      await service.list(testSchema, { roleId: 'role-123' });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('user_role'),
        'role-123',
      );
    });

    it('should support sorting', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(1) }])
        .mockResolvedValueOnce([mockUser]);

      await service.list(testSchema, { sort: '-username' });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('username DESC'),
      );
    });

    it('should support pagination', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(50) }])
        .mockResolvedValueOnce([mockUser]);

      await service.list(testSchema, { page: 2, pageSize: 10 });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET 10'),
      );
    });
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);

      const result = await service.findById('user-123', testSchema);

      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const result = await service.findById('nonexistent', testSchema);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new user', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // Username check - not taken
        .mockResolvedValueOnce([]) // Email check - not taken
        .mockResolvedValueOnce([mockUser]); // Insert query

      const result = await service.create(testSchema, {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePassword123!',
      });

      expect(result).toBeDefined();
      expect(mockPasswordService.hash).toHaveBeenCalled();
    });

    it('should throw when username is taken', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'existing-user' }]);

      await expect(
        service.create(testSchema, {
          username: 'existinguser',
          email: 'new@example.com',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when email is taken', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // Username not taken
        .mockResolvedValueOnce([{ id: 'existing-user' }]); // Email taken

      await expect(
        service.create(testSchema, {
          username: 'newuser',
          email: 'existing@example.com',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when password is weak', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // Username not taken
        .mockResolvedValueOnce([]); // Email not taken
      
      (mockPasswordService.validate as ReturnType<typeof vi.fn>).mockReturnValue({
        isValid: false,
        errors: ['Password too short'],
      });

      await expect(
        service.create(testSchema, {
          username: 'newuser',
          email: 'new@example.com',
          password: 'weak',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set forceReset to true by default', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockUser]);

      await service.create(testSchema, {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePassword123!',
      });

      // Verify forceReset is true in the query
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenLastCalledWith(
        expect.any(String),
        'newuser', 'new@example.com', 'hashed_password',
        null, null, 'en', true,
      );
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockUser]) // findById
        .mockResolvedValueOnce([{ ...mockUser, displayName: 'Updated Name' }]); // Update

      const result = await service.update('user-123', testSchema, {
        displayName: 'Updated Name',
      });

      expect(result.displayName).toBe('Updated Name');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]); // User not found

      await expect(
        service.update('nonexistent', testSchema, { displayName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return current user if no updates provided', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);

      const result = await service.update('user-123', testSchema, {});

      expect(result).toEqual(mockUser);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1); // Only findById
    });
  });

  describe('resetPassword', () => {
    it('should reset password with provided password', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      const result = await service.resetPassword('user-123', testSchema, {
        newPassword: 'NewSecure123!',
      });

      expect(result.tempPassword).toBeUndefined();
      expect(mockPasswordService.hash).toHaveBeenCalledWith('NewSecure123!');
    });

    it('should generate temp password when not provided', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockUser]);
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      const result = await service.resetPassword('user-123', testSchema, {});

      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword!.length).toBe(16);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.resetPassword('nonexistent', testSchema, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user and delete snapshots', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockUser]) // findById before
        .mockResolvedValueOnce([{ ...mockUser, isActive: false }]); // findById after
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      const result = await service.deactivate('user-123', testSchema);

      expect(result.isActive).toBe(false);
      expect(mockSnapshotService.deleteUserSnapshots).toHaveBeenCalledWith(testSchema, 'user-123');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.deactivate('nonexistent', testSchema),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivate', () => {
    it('should reactivate user and refresh snapshots', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ ...mockUser, isActive: false }]) // findById before
        .mockResolvedValueOnce([mockUser]); // findById after
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      const result = await service.reactivate('user-123', testSchema);

      expect(result.isActive).toBe(true);
      expect(mockSnapshotService.refreshUserSnapshots).toHaveBeenCalledWith(testSchema, 'user-123');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.reactivate('nonexistent', testSchema),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('forceTotp', () => {
    it('should enable force TOTP for user', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockUser]) // findById before
        .mockResolvedValueOnce([{ ...mockUser, isTotpEnabled: true }]); // findById after
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      const result = await service.forceTotp('user-123', testSchema);

      expect(result).toBeDefined();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('force_totp = true'),
        'user-123',
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.forceTotp('nonexistent', testSchema),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
