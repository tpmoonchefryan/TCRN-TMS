// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@tcrn/database';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { RedisService } from '../../redis';
import { IpRuleListQueryDto, CreateIpRuleDto, IpRuleType, IpRuleScope } from '../dto/security.dto';

interface IpRule {
  id: string;
  ruleType: 'whitelist' | 'blacklist';
  ipPattern: string;
  scope: string;
  reason?: string;
}

@Injectable()
export class IpAccessService implements OnModuleInit {
  private readonly logger = new Logger(IpAccessService.name);
  private whitelistCache: Map<string, IpRule[]> = new Map();
  private blacklistCache: Map<string, IpRule[]> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly changeLogService: ChangeLogService,
  ) {}

  async onModuleInit() {
    await this.loadRules();
  }

  /**
   * Check if IP is allowed
   */
  async checkAccess(
    ip: string,
    scope: 'global' | 'admin' | 'public' | 'api',
  ): Promise<{ allowed: boolean; reason?: string; matchedRule?: IpRule }> {
    // Check Redis cache first
    const cacheKey = `ip_access:${scope}:${ip}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Check whitelist first (whitelist takes precedence)
    const whitelistRules = this.whitelistCache.get(scope) || [];
    for (const rule of whitelistRules) {
      if (this.matchIp(ip, rule.ipPattern)) {
        const result = { allowed: true, matchedRule: rule };
        await this.cacheResult(cacheKey, result);
        await this.updateHitCount(rule.id);
        return result;
      }
    }

    // Check blacklist
    const blacklistRules = this.blacklistCache.get(scope) || [];
    for (const rule of blacklistRules) {
      if (this.matchIp(ip, rule.ipPattern)) {
        const result = { allowed: false, reason: rule.reason, matchedRule: rule };
        await this.cacheResult(cacheKey, result);
        await this.updateHitCount(rule.id);
        return result;
      }
    }

    // Default allow
    const result = { allowed: true };
    await this.cacheResult(cacheKey, result);
    return result;
  }

  /**
   * List IP rules
   */
  async findMany(query: IpRuleListQueryDto) {
    const prisma = this.databaseService.getPrisma();
    const { page = 1, pageSize = 20, ruleType, scope, isActive } = query;

    const pagination = this.databaseService.buildPagination(page, pageSize);

    const where: Prisma.IpAccessRuleWhereInput = {};

    if (ruleType) where.ruleType = ruleType;
    if (scope) where.scope = scope;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      prisma.ipAccessRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.ipAccessRule.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        ruleType: r.ruleType,
        ipPattern: r.ipPattern,
        scope: r.scope,
        reason: r.reason,
        source: r.source,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        hitCount: r.hitCount,
        lastHitAt: r.lastHitAt?.toISOString() ?? null,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
        createdBy: r.createdBy,
      })),
      total,
    };
  }

  /**
   * Add IP rule
   */
  async addRule(dto: CreateIpRuleDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    // Validate IP pattern
    this.validateIpPattern(dto.ipPattern);

    const rule = await prisma.$transaction(async (tx) => {
      const newRule = await tx.ipAccessRule.create({
        data: {
          ruleType: dto.ruleType,
          ipPattern: dto.ipPattern,
          scope: dto.scope,
          reason: dto.reason,
          source: 'manual',
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          isActive: true,
          hitCount: 0,
          createdBy: context.userId!,
        },
      });

      await this.changeLogService.create(tx, {
        action: 'create',
        objectType: 'ip_access_rule',
        objectId: newRule.id,
        objectName: dto.ipPattern,
        newValue: { ruleType: dto.ruleType, ipPattern: dto.ipPattern },
      }, context);

      return newRule;
    });

    // Reload rules and clear cache
    await this.loadRules();
    await this.clearAccessCache();

    return {
      id: rule.id,
      ruleType: rule.ruleType,
      ipPattern: rule.ipPattern,
      scope: rule.scope,
      reason: rule.reason ?? undefined,
      createdAt: rule.createdAt.toISOString(),
    };
  }

  /**
   * Remove IP rule
   */
  async removeRule(id: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const rule = await prisma.ipAccessRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'IP rule not found',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.ipAccessRule.update({
        where: { id },
        data: { isActive: false },
      });

      await this.changeLogService.create(tx, {
        action: 'delete',
        objectType: 'ip_access_rule',
        objectId: id,
        objectName: rule.ipPattern,
      }, context);
    });

    await this.loadRules();
    await this.clearAccessCache();

    return { id, deleted: true };
  }

  /**
   * Cleanup expired rules - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredRules(): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    const now = new Date();

    const result = await prisma.ipAccessRule.updateMany({
      where: {
        isActive: true,
        expiresAt: { lte: now },
      },
      data: { isActive: false },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired IP rules`);
      await this.loadRules();
      await this.clearAccessCache();
    }
  }

  /**
   * Load rules into memory cache
   */
  private async loadRules(): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    const rules = await prisma.ipAccessRule.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    this.whitelistCache.clear();
    this.blacklistCache.clear();

    for (const rule of rules) {
      const ipRule: IpRule = {
        id: rule.id,
        ruleType: rule.ruleType as 'whitelist' | 'blacklist',
        ipPattern: rule.ipPattern,
        scope: rule.scope,
        reason: rule.reason ?? undefined,
      };

      const cache = rule.ruleType === 'whitelist' ? this.whitelistCache : this.blacklistCache;

      if (!cache.has(rule.scope)) {
        cache.set(rule.scope, []);
      }
      cache.get(rule.scope)!.push(ipRule);

      // Global rules apply to all scopes
      if (rule.scope === 'global') {
        for (const scope of ['admin', 'public', 'api']) {
          if (!cache.has(scope)) {
            cache.set(scope, []);
          }
          cache.get(scope)!.push(ipRule);
        }
      }
    }

    this.logger.log(`Loaded ${rules.length} IP rules into cache`);
  }

  /**
   * Match IP against pattern
   */
  private matchIp(ip: string, pattern: string): boolean {
    if (pattern.includes('/')) {
      // CIDR matching (simplified)
      return this.matchCidr(ip, pattern);
    }
    // Exact match
    return ip === pattern;
  }

  /**
   * Simple CIDR matching
   */
  private matchCidr(ip: string, cidr: string): boolean {
    const [network, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);

    if (ipParts.length !== 4 || networkParts.length !== 4) {
      return false;
    }

    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
    const mask = ~((1 << (32 - prefix)) - 1);

    return (ipNum & mask) === (networkNum & mask);
  }

  /**
   * Validate IP pattern
   */
  private validateIpPattern(pattern: string): void {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipv4Regex.test(pattern)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Invalid IP pattern: ${pattern}`,
      });
    }

    const parts = pattern.split('/');
    const ipParts = parts[0].split('.');

    for (const part of ipParts) {
      const num = parseInt(part, 10);
      if (num < 0 || num > 255) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Invalid IP pattern: ${pattern}`,
        });
      }
    }

    if (parts[1]) {
      const prefix = parseInt(parts[1], 10);
      if (prefix < 0 || prefix > 32) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Invalid CIDR prefix: ${parts[1]}`,
        });
      }
    }
  }

  private async cacheResult(key: string, result: unknown): Promise<void> {
    await this.redisService.set(key, JSON.stringify(result), 300); // 5 min cache
  }

  private async clearAccessCache(): Promise<void> {
    const keys = await this.redisService.keys('ip_access:*');
    if (keys.length > 0) {
      for (const key of keys) {
        await this.redisService.del(key);
      }
    }
  }

  private async updateHitCount(ruleId: string): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    prisma.ipAccessRule.update({
      where: { id: ruleId },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date(),
      },
    }).catch(() => {});
  }
}
