// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
 

import { prisma } from '@tcrn/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RedisService } from '../../redis/redis.service';

// Mock prisma before imports
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { PermissionSnapshotService } from '../permission-snapshot.service';

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('PermissionSnapshotService', () => {
  let service: PermissionSnapshotService;
  let mockRedisService: Partial<RedisService>;
  let redisHashes: Map<string, Record<string, string>>;

  const testTenantSchema = 'tenant_abc123';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testRoleId = '550e8400-e29b-41d4-a716-446655440002';
  const testScopeId = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(() => {
    vi.clearAllMocks();
    redisHashes = new Map();

    mockRedisService = {
      hget: vi.fn().mockImplementation(async (key: string, field: string) => {
        const hash = redisHashes.get(key);
        return hash?.[field] || null;
      }),
      hgetall: vi.fn().mockImplementation(async (key: string) => {
        return redisHashes.get(key) || {};
      }),
      hmset: vi.fn().mockImplementation(async (key: string, data: Record<string, string>) => {
        redisHashes.set(key, { ...redisHashes.get(key), ...data });
      }),
      del: vi.fn().mockImplementation(async (key: string) => {
        redisHashes.delete(key);
        return 1;
      }),
      keys: vi.fn().mockImplementation(async (pattern: string) => {
        const prefix = pattern.replace('*', '');
        return Array.from(redisHashes.keys()).filter(k => k.startsWith(prefix));
      }),
      expire: vi.fn().mockResolvedValue(1),
    };

    service = new PermissionSnapshotService(mockRedisService as RedisService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkPermission', () => {
    it('should return true when permission is granted', async () => {
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}`, {
        'customer.profile:read': 'grant',
      });

      const result = await service.checkPermission(
        testTenantSchema,
        testUserId,
        'customer.profile',
        'read'
      );

      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}`, {
        'customer.profile:delete': 'deny',
      });

      const result = await service.checkPermission(
        testTenantSchema,
        testUserId,
        'customer.profile',
        'delete'
      );

      expect(result).toBe(false);
    });

    it('should return false when permission does not exist', async () => {
      // No permissions set
      const result = await service.checkPermission(
        testTenantSchema,
        testUserId,
        'unknown.resource',
        'read'
      );

      expect(result).toBe(false);
    });

    it('should return true when user has admin permission for resource', async () => {
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}`, {
        'customer.profile:admin': 'grant',
      });

      const result = await service.checkPermission(
        testTenantSchema,
        testUserId,
        'customer.profile',
        'write'
      );

      expect(result).toBe(true);
    });

    it('should return true when user has global admin permission', async () => {
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}`, {
        '*:admin': 'grant',
      });

      const result = await service.checkPermission(
        testTenantSchema,
        testUserId,
        'any.resource',
        'any'
      );

      expect(result).toBe(true);
    });

    it('should use scope-specific key when scope is provided', async () => {
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}:talent:${testScopeId}`, {
        'customer.profile:read': 'grant',
      });

      const result = await service.checkPermission(
        testTenantSchema,
        testUserId,
        'customer.profile',
        'read',
        'talent',
        testScopeId
      );

      expect(result).toBe(true);
      expect(mockRedisService.hget).toHaveBeenCalledWith(
        `perm:${testTenantSchema}:${testUserId}:talent:${testScopeId}`,
        'customer.profile:read'
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for a user', async () => {
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}`, {
        'customer.profile:read': 'grant',
        'customer.profile:write': 'grant',
        'customer.pii:read': 'deny',
      });

      const result = await service.getUserPermissions(testTenantSchema, testUserId);

      expect(result).toEqual({
        'customer.profile:read': 'grant',
        'customer.profile:write': 'grant',
        'customer.pii:read': 'deny',
      });
    });

    it('should return empty object when no permissions exist', async () => {
      const result = await service.getUserPermissions(testTenantSchema, testUserId);

      expect(result).toEqual({});
    });

    it('should filter out invalid permission values', async () => {
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}`, {
        'valid.resource:read': 'grant',
        'invalid.resource:read': 'invalid_value',
        'another.resource:write': 'deny',
      });

      const result = await service.getUserPermissions(testTenantSchema, testUserId);

      expect(result).toEqual({
        'valid.resource:read': 'grant',
        'another.resource:write': 'deny',
      });
    });
  });

  describe('calculateAndStoreSnapshot', () => {
    it('should delete existing snapshot and store new one', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ roleId: testRoleId, scopeType: 'tenant', scopeId: null, inherit: true }]) // getUserRoleAssignments
        .mockResolvedValueOnce([{ resourceCode: 'customer', action: 'read', effect: 'grant' }]); // getRolePermissions

      await service.calculateAndStoreSnapshot(testTenantSchema, testUserId, 'tenant', null);

      expect(mockRedisService.del).toHaveBeenCalled();
      expect(mockRedisService.hmset).toHaveBeenCalled();
      expect(mockRedisService.expire).toHaveBeenCalledWith(
        expect.any(String),
        86400
      );
    });

    it('should not store empty permissions', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]); // No role assignments

      await service.calculateAndStoreSnapshot(testTenantSchema, testUserId, 'tenant', null);

      expect(mockRedisService.del).toHaveBeenCalled();
      expect(mockRedisService.hmset).not.toHaveBeenCalled();
    });
  });

  describe('refreshUserSnapshots', () => {
    it('should refresh all snapshots for a user', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]); // Return empty for all queries

      await service.refreshUserSnapshots(testTenantSchema, testUserId);

      // Should query for user's scopes
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('user_role'),
        testUserId
      );
    });
  });

  describe('refreshRoleSnapshots', () => {
    it('should refresh snapshots for all users with the role', async () => {
      const mockUsers = [
        { userId: testUserId },
        { userId: '550e8400-e29b-41d4-a716-446655440004' },
      ];

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce(mockUsers) // Get users with role
        .mockResolvedValue([]); // For subsequent calls

      const count = await service.refreshRoleSnapshots(testTenantSchema, testRoleId);

      expect(count).toBe(2);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('role_id'),
        testRoleId
      );
    });

    it('should return 0 when no users have the role', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      const count = await service.refreshRoleSnapshots(testTenantSchema, testRoleId);

      expect(count).toBe(0);
    });
  });

  describe('deleteUserSnapshots', () => {
    it('should delete all snapshots for a user', async () => {
      // Set up some keys to be found
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}:tenant:null`, { 'test:read': 'grant' });
      redisHashes.set(`perm:${testTenantSchema}:${testUserId}:subsidiary:${testScopeId}`, { 'test:write': 'grant' });

      await service.deleteUserSnapshots(testTenantSchema, testUserId);

      expect(mockRedisService.keys).toHaveBeenCalledWith(
        expect.stringContaining(testUserId)
      );
      // Should call del for the 2 pattern keys + 1 base key
      expect(mockRedisService.del).toHaveBeenCalled();
    });

    it('should delete base key even when no pattern keys found', async () => {
      await service.deleteUserSnapshots(testTenantSchema, testUserId);

      expect(mockRedisService.del).toHaveBeenCalledWith(
        `perm:${testTenantSchema}:${testUserId}`
      );
    });
  });

  describe('Snapshot Key Generation', () => {
    it('should generate correct key for tenant scope', async () => {
      await service.checkPermission(
        testTenantSchema,
        testUserId,
        'resource',
        'action',
        'tenant',
        null
      );

      expect(mockRedisService.hget).toHaveBeenCalledWith(
        `perm:${testTenantSchema}:${testUserId}:tenant:null`,
        'resource:action'
      );
    });

    it('should generate correct key for subsidiary scope', async () => {
      await service.checkPermission(
        testTenantSchema,
        testUserId,
        'resource',
        'action',
        'subsidiary',
        testScopeId
      );

      expect(mockRedisService.hget).toHaveBeenCalledWith(
        `perm:${testTenantSchema}:${testUserId}:subsidiary:${testScopeId}`,
        'resource:action'
      );
    });

    it('should generate correct key for talent scope', async () => {
      await service.checkPermission(
        testTenantSchema,
        testUserId,
        'resource',
        'action',
        'talent',
        testScopeId
      );

      expect(mockRedisService.hget).toHaveBeenCalledWith(
        `perm:${testTenantSchema}:${testUserId}:talent:${testScopeId}`,
        'resource:action'
      );
    });
  });
});
