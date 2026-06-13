// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { RedisService } from '../../redis';
import { ProfanityFilterApplicationService } from '../application/profanity-filter.service';
import type { FilterOptions, FilterResult } from '../domain/profanity-filter.policy';
import { ProfanityFilterRepository } from '../infrastructure/profanity-filter.repository';

@Injectable()
export class ProfanityFilterService {
  constructor(
    databaseService: DatabaseService,
    redisService: RedisService,
    private readonly profanityFilterApplicationService: ProfanityFilterApplicationService = new ProfanityFilterApplicationService(
      new ProfanityFilterRepository(databaseService, redisService)
    )
  ) {}

  async filter(content: string, talentId: string, options: FilterOptions): Promise<FilterResult> {
    return this.profanityFilterApplicationService.filter(content, talentId, options);
  }
}

export type { FilterOptions, FilterResult };
