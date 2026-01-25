// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Service
 * Provides Redis connection and common operations
 * PRD §12.6: Permission snapshot storage
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 200, 1000);
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.ping();
      this.logger.log('Redis connected');
    } catch (error) {
      this.logger.error('Redis connection failed', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Get the Redis client instance
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Permission Snapshot Operations (PRD §12.6)
  // Key format: perm:{tenant_schema}:{user_id}:{scope_type}:{scope_id}
  // ==========================================================================

  /**
   * Get permission key
   */
  private getPermissionKey(
    tenantSchema: string,
    userId: string,
    scopeType: string,
    scopeId: string
  ): string {
    return `perm:${tenantSchema}:${userId}:${scopeType}:${scopeId}`;
  }

  /**
   * Set permission snapshot for a user
   * PRD §12.6: No TTL, Worker refreshes every 6h
   */
  async setPermissionSnapshot(
    tenantSchema: string,
    userId: string,
    scopeType: string,
    scopeId: string,
    permissions: Record<string, 'allow' | 'deny'>
  ): Promise<void> {
    const key = this.getPermissionKey(tenantSchema, userId, scopeType, scopeId);
    
    // Use HSET to store permissions as hash
    const pipeline = this.client.pipeline();
    pipeline.del(key); // Clear existing
    
    for (const [resourceAction, effect] of Object.entries(permissions)) {
      pipeline.hset(key, resourceAction, effect);
    }
    
    await pipeline.exec();
  }

  /**
   * Get permission snapshot for a user
   */
  async getPermissionSnapshot(
    tenantSchema: string,
    userId: string,
    scopeType: string,
    scopeId: string
  ): Promise<Record<string, 'allow' | 'deny'> | null> {
    const key = this.getPermissionKey(tenantSchema, userId, scopeType, scopeId);
    const result = await this.client.hgetall(key);
    
    if (Object.keys(result).length === 0) {
      return null;
    }
    
    return result as Record<string, 'allow' | 'deny'>;
  }

  /**
   * Check a specific permission
   */
  async checkPermission(
    tenantSchema: string,
    userId: string,
    scopeType: string,
    scopeId: string,
    resourceAction: string
  ): Promise<'allow' | 'deny' | null> {
    const key = this.getPermissionKey(tenantSchema, userId, scopeType, scopeId);
    const result = await this.client.hget(key, resourceAction);
    return result as 'allow' | 'deny' | null;
  }

  /**
   * Delete permission snapshot
   */
  async deletePermissionSnapshot(
    tenantSchema: string,
    userId: string,
    scopeType: string,
    scopeId: string
  ): Promise<void> {
    const key = this.getPermissionKey(tenantSchema, userId, scopeType, scopeId);
    await this.client.del(key);
  }

  // ==========================================================================
  // Session Operations
  // ==========================================================================

  /**
   * Set session data
   */
  async setSession(
    sessionId: string,
    data: Record<string, string>,
    ttlSeconds: number
  ): Promise<void> {
    const key = `session:${sessionId}`;
    const pipeline = this.client.pipeline();
    pipeline.hset(key, data);
    pipeline.expire(key, ttlSeconds);
    await pipeline.exec();
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<Record<string, string> | null> {
    const key = `session:${sessionId}`;
    const result = await this.client.hgetall(key);
    
    if (Object.keys(result).length === 0) {
      return null;
    }
    
    return result;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.client.del(key);
  }

  /**
   * Update session last activity
   */
  async touchSession(sessionId: string, ttlSeconds: number): Promise<boolean> {
    const key = `session:${sessionId}`;
    const exists = await this.client.exists(key);
    if (exists) {
      await this.client.hset(key, 'last_active_at', new Date().toISOString());
      await this.client.expire(key, ttlSeconds);
      return true;
    }
    return false;
  }

  // ==========================================================================
  // Rate Limiting Operations
  // ==========================================================================

  /**
   * Increment rate limit counter
   * Returns current count after increment
   */
  async incrementRateLimit(
    key: string,
    windowSeconds: number
  ): Promise<number> {
    const fullKey = `ratelimit:${key}`;
    const pipeline = this.client.pipeline();
    pipeline.incr(fullKey);
    pipeline.expire(fullKey, windowSeconds);
    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 0;
  }

  /**
   * Get current rate limit count
   */
  async getRateLimitCount(key: string): Promise<number> {
    const fullKey = `ratelimit:${key}`;
    const result = await this.client.get(fullKey);
    return result ? parseInt(result, 10) : 0;
  }

  // ==========================================================================
  // Generic Operations
  // ==========================================================================

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ==========================================================================
  // Hash Operations
  // ==========================================================================

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hmset(key: string, data: Record<string, string>): Promise<void> {
    if (Object.keys(data).length > 0) {
      await this.client.hset(key, data);
    }
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    if (fields.length > 0) {
      await this.client.hdel(key, ...fields);
    }
  }

  // ==========================================================================
  // Key Operations
  // ==========================================================================

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  // ==========================================================================
  // List Operations
  // ==========================================================================

  /**
   * Push value to the head of a list
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  /**
   * Push value to the tail of a list
   */
  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  /**
   * Get a range of elements from a list
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  /**
   * Trim a list to the specified range
   */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop);
  }

  /**
   * Get the length of a list
   */
  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // ==========================================================================
  // Set Operations
  // ==========================================================================

  /**
   * Add members to a set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  /**
   * Remove members from a set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  /**
   * Check if a member exists in a set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  /**
   * Get the number of members in a set
   */
  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }
}
