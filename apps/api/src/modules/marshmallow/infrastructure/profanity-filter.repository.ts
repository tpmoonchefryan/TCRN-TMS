// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { RedisService } from '../../redis';
import type {
  CustomBlocklistPattern,
  ExternalPattern,
} from '../domain/profanity-filter.policy';

@Injectable()
export class ProfanityFilterRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  async getExternalPatterns(talentId: string): Promise<ExternalPattern[]> {
    const cacheKey = `external_blocklist:${talentId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ExternalPattern[];
    }

    const prisma = this.databaseService.getPrisma();
    const patterns = await prisma.externalBlocklistPattern.findMany({
      where: {
        isActive: true,
        OR: [
          { ownerType: 'tenant', ownerId: null, inherit: true },
          { ownerType: 'talent', ownerId: talentId },
        ],
      },
      orderBy: { severity: 'desc' },
    });

    const result: ExternalPattern[] = patterns.map((pattern) => ({
      id: pattern.id,
      pattern: pattern.pattern,
      patternType: pattern.patternType as ExternalPattern['patternType'],
      action: pattern.action as ExternalPattern['action'],
      replacement: pattern.replacement,
      severity: pattern.severity,
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getCustomBlocklistEntries(talentId: string): Promise<CustomBlocklistPattern[]> {
    const prisma = this.databaseService.getPrisma();
    const entries = await prisma.blocklistEntry.findMany({
      where: {
        isActive: true,
        OR: [
          { ownerType: 'tenant', ownerId: null },
          { ownerType: 'talent', ownerId: talentId },
        ],
      },
    });

    return entries.map((entry) => ({
      pattern: entry.pattern,
      patternType: entry.patternType as CustomBlocklistPattern['patternType'],
      action: entry.action as CustomBlocklistPattern['action'],
      severity: entry.severity,
    }));
  }
}
