// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { RedisService } from '../../redis';
import { ProfanityFilterApplicationService } from '../application/profanity-filter.service';
import type {
  FilterOptions,
  FilterResult,
} from '../domain/profanity-filter.policy';
import { ProfanityFilterRepository } from '../infrastructure/profanity-filter.repository';

@Injectable()
export class ProfanityFilterService {
  constructor(
    databaseService: DatabaseService,
    redisService: RedisService,
    private readonly profanityFilterApplicationService: ProfanityFilterApplicationService = new ProfanityFilterApplicationService(
      new ProfanityFilterRepository(databaseService, redisService),
    ),
  ) {}

  async filter(
    content: string,
    talentId: string,
    options: FilterOptions,
  ): Promise<FilterResult> {
    return this.profanityFilterApplicationService.filter(content, talentId, options);
  }
}

export type { FilterOptions, FilterResult };
