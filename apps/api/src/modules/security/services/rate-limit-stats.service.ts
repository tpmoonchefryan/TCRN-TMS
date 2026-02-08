// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../redis';

interface EndpointStats {
  endpoint: string;
  method: string;
  current: number;
  limit: number;
  resetIn: number;
}

interface BlockedIP {
  ip: string;
  requests: number;
  blocked: boolean;
  lastSeen: string;
}

interface RateLimitSummary {
  totalRequests24h: number;
  blockedRequests24h: number;
  uniqueIPs24h: number;
  currentlyBlocked: number;
}

export interface RateLimitStatsResponse {
  summary: RateLimitSummary;
  topEndpoints: EndpointStats[];
  topIPs: BlockedIP[];
  lastUpdated: string;
}

/**
 * Rate Limit Stats Service
 * Provides statistics about rate limiting activity from Redis
 */
@Injectable()
export class RateLimitStatsService {
  private readonly logger = new Logger(RateLimitStatsService.name);

  // Default rate limit configurations (should match RateLimitService)
  private readonly limiterConfigs: Record<string, { points: number; duration: number }> = {
    global_api: { points: 100, duration: 60 },
    admin_api: { points: 200, duration: 60 },
    public_page: { points: 60, duration: 60 },
    login_attempt: { points: 5, duration: 300 },
    marshmallow_submit: { points: 5, duration: 3600 },
    password_reset: { points: 3, duration: 3600 },
  };

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get comprehensive rate limit statistics
   */
  async getStats(): Promise<RateLimitStatsResponse> {
    try {
      const [summary, topEndpoints, topIPs] = await Promise.all([
        this.getSummary(),
        this.getTopEndpoints(),
        this.getTopIPs(),
      ]);

      return {
        summary,
        topEndpoints,
        topIPs,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit stats', error);
      return {
        summary: {
          totalRequests24h: 0,
          blockedRequests24h: 0,
          uniqueIPs24h: 0,
          currentlyBlocked: 0,
        },
        topEndpoints: [],
        topIPs: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get summary statistics
   */
  private async getSummary(): Promise<RateLimitSummary> {
    // Get all rate limit keys
    const allRlKeys = await this.redisService.keys('rl:*');
    const blockedKeys = await this.redisService.keys('blocked:*');
    const uniqueIPsSet = new Set<string>();
    
    let totalRequests = 0;
    let blockedRequests = 0;

    // Process rate limit keys
    for (const key of allRlKeys) {
      const value = await this.redisService.get(key);
      if (value) {
        const count = parseInt(value, 10);
        totalRequests += count;
        
        // Extract IP from key if present
        const parts = key.split(':');
        if (parts.length >= 3) {
          const possibleIp = parts[parts.length - 1];
          if (this.isValidIP(possibleIp)) {
            uniqueIPsSet.add(possibleIp);
          }
        }
      }
    }

    // Count blocked IPs
    for (const key of blockedKeys) {
      if (key.includes(':ip:')) {
        blockedRequests++;
      }
    }

    return {
      totalRequests24h: totalRequests,
      blockedRequests24h: blockedRequests,
      uniqueIPs24h: uniqueIPsSet.size,
      currentlyBlocked: blockedKeys.length,
    };
  }

  /**
   * Get top endpoints by request count
   */
  private async getTopEndpoints(): Promise<EndpointStats[]> {
    const endpoints: EndpointStats[] = [];

    for (const [limiterName, config] of Object.entries(this.limiterConfigs)) {
      const pattern = `rl:${limiterName}:*`;
      const keys = await this.redisService.keys(pattern);
      
      let totalCurrent = 0;
      let maxTtl = 0;

      for (const key of keys.slice(0, 100)) {
        const value = await this.redisService.get(key);
        if (value) {
          totalCurrent += parseInt(value, 10);
        }
        const ttl = await this.redisService.ttl(key);
        maxTtl = Math.max(maxTtl, ttl);
      }

      if (keys.length > 0) {
        endpoints.push({
          endpoint: `/api/v1/${limiterName.replace('_', '/')}`,
          method: limiterName.includes('submit') || limiterName.includes('login') ? 'POST' : 'GET',
          current: Math.round(totalCurrent / keys.length),
          limit: config.points,
          resetIn: maxTtl > 0 ? maxTtl : config.duration,
        });
      }
    }

    return endpoints.sort((a, b) => b.current - a.current).slice(0, 5);
  }

  /**
   * Get top IPs by request count
   */
  private async getTopIPs(): Promise<BlockedIP[]> {
    const ipStats = new Map<string, { requests: number; blocked: boolean }>();

    // Get all rate limit keys and extract IPs
    const allKeys = await this.redisService.keys('rl:*');
    
    for (const key of allKeys) {
      const parts = key.split(':');
      const possibleIp = parts[parts.length - 1];
      
      if (this.isValidIP(possibleIp)) {
        const value = await this.redisService.get(key);
        const requests = value ? parseInt(value, 10) : 0;
        
        const existing = ipStats.get(possibleIp) || { requests: 0, blocked: false };
        existing.requests += requests;
        ipStats.set(possibleIp, existing);
      }
    }

    // Check which IPs are blocked
    const blockedKeys = await this.redisService.keys('blocked:ip:*');
    for (const key of blockedKeys) {
      const parts = key.split(':');
      const ip = parts[parts.length - 1];
      const existingStats = ipStats.get(ip);
      if (existingStats) {
        existingStats.blocked = true;
      } else {
        ipStats.set(ip, { requests: 0, blocked: true });
      }
    }

    // Convert to array and sort
    const result: BlockedIP[] = [];
    for (const [ip, stats] of ipStats.entries()) {
      result.push({
        ip,
        requests: stats.requests,
        blocked: stats.blocked,
        lastSeen: 'recently', // Would need additional tracking for accurate time
      });
    }

    return result.sort((a, b) => b.requests - a.requests).slice(0, 10);
  }

  /**
   * Check if string is valid IP address
   */
  private isValidIP(str: string): boolean {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^[0-9a-fA-F:]+$/;
    
    if (ipv4Pattern.test(str)) {
      const parts = str.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }
    
    return ipv6Pattern.test(str) && str.includes(':');
  }
}
