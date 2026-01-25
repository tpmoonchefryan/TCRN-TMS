// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RedisService } from '../../redis/redis.service';
import { PermissionSnapshotService } from '../permission-snapshot.service';

describe('PermissionSnapshotService', () => {
  let service: PermissionSnapshotService;
  let redisService: Partial<RedisService>;
  let redisHashes: Map<string, Record<string, string>>;

  beforeEach(() => {
    redisHashes = new Map();

    redisService = {
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
      }),
      keys: vi.fn().mockImplementation(async (pattern: string) => {
        const prefix = pattern.replace('*', '');
        return Array.from(redisHashes.keys()).filter(k => k.startsWith(prefix));
      }),
      expire: vi.fn(),
    };

    service = new PermissionSnapshotService(redisService as RedisService);
  });

  describe('checkPermission', () => {
    it('should allow permission when user has it', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}`, {
        'customer.profile:read': 'grant',
        'customer.profile:write': 'grant',
      });

      const result = await service.checkPermission(
        tenantSchema,
        userId,
        'customer.profile',
        'read'
      );

      expect(result).toBe(true);
    });

    it('should deny permission when user does not have it', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}`, {
        'customer.profile:read': 'grant',
      });

      const result = await service.checkPermission(
        tenantSchema,
        userId,
        'customer.profile',
        'write'
      );

      expect(result).toBe(false);
    });

    it('should deny permission for non-existent resource', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}`, {});

      const result = await service.checkPermission(
        tenantSchema,
        userId,
        'unknown.resource',
        'read'
      );

      expect(result).toBe(false);
    });

    it('should allow all actions when user has admin permission', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}`, {
        'customer.profile:admin': 'grant',
      });

      const result = await service.checkPermission(
        tenantSchema,
        userId,
        'customer.profile',
        'write'
      );

      expect(result).toBe(true);
    });

    it('should allow all resources when user has global admin', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}`, {
        '*:admin': 'grant',
      });

      const result = await service.checkPermission(
        tenantSchema,
        userId,
        'any.resource',
        'delete'
      );

      expect(result).toBe(true);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all user permissions', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}`, {
        'customer.profile:read': 'grant',
        'customer.profile:write': 'grant',
        'customer.pii:read': 'deny',
      });

      const result = await service.getUserPermissions(tenantSchema, userId);

      expect(result).toEqual({
        'customer.profile:read': 'grant',
        'customer.profile:write': 'grant',
        'customer.pii:read': 'deny',
      });
    });

    it('should return empty object for user without permissions', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-2';

      const result = await service.getUserPermissions(tenantSchema, userId);

      expect(result).toEqual({});
    });
  });

  describe('scope-based permissions', () => {
    it('should check permissions for subsidiary scope', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';
      const subsidiaryId = 'sub-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}:subsidiary:${subsidiaryId}`, {
        'customer.profile:read': 'grant',
      });

      const result = await service.checkPermission(
        tenantSchema,
        userId,
        'customer.profile',
        'read',
        'subsidiary',
        subsidiaryId
      );

      expect(result).toBe(true);
    });

    it('should check permissions for talent scope', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';
      const talentId = 'talent-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}:talent:${talentId}`, {
        'customer.profile:read': 'grant',
        'customer.profile:write': 'grant',
      });

      const result = await service.checkPermission(
        tenantSchema,
        userId,
        'customer.profile',
        'write',
        'talent',
        talentId
      );

      expect(result).toBe(true);
    });

    it('should deny permission for different scope', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';

      // User has permission for talent-1
      redisHashes.set(`perm:${tenantSchema}:${userId}:talent:talent-1`, {
        'customer.profile:read': 'grant',
      });

      // Check permission for talent-2 (no permissions set)
      const result = await service.checkPermission(
        tenantSchema,
        userId,
        'customer.profile',
        'read',
        'talent',
        'talent-2'
      );

      expect(result).toBe(false);
    });
  });

  describe('deleteUserSnapshots', () => {
    it('should delete all snapshots for a user', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';

      // Set up some snapshot data
      redisHashes.set(`perm:${tenantSchema}:${userId}`, { 'resource:read': 'grant' });
      redisHashes.set(`perm:${tenantSchema}:${userId}:talent:t1`, { 'resource:read': 'grant' });
      redisHashes.set(`perm:${tenantSchema}:${userId}:subsidiary:s1`, { 'resource:read': 'grant' });

      await service.deleteUserSnapshots(tenantSchema, userId);

      expect(redisService.keys).toHaveBeenCalledWith(`perm:${tenantSchema}:${userId}:*`);
      expect(redisService.del).toHaveBeenCalled();
    });
  });

  describe('getUserPermissions with scope', () => {
    it('should return permissions for specific subsidiary scope', async () => {
      const tenantSchema = 'tenant_test';
      const userId = 'user-1';
      const subsidiaryId = 'sub-1';

      redisHashes.set(`perm:${tenantSchema}:${userId}:subsidiary:${subsidiaryId}`, {
        'customer.profile:read': 'grant',
        'customer.profile:write': 'deny',
      });

      const result = await service.getUserPermissions(
        tenantSchema,
        userId,
        'subsidiary',
        subsidiaryId
      );

      expect(result).toEqual({
        'customer.profile:read': 'grant',
        'customer.profile:write': 'deny',
      });
    });
  });
});
