// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';
import { PublicPresenceWorkflowService } from './public-presence-workflow.service';

@Injectable()
export class PublicPresencePublishSchedulerService {
  constructor(
    private readonly publicHomepageReadRepository: PublicHomepageReadRepository,
    private readonly publicPresenceWorkflowService: PublicPresenceWorkflowService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDueVersions(): Promise<void> {
    const tenantSchemas = await this.publicHomepageReadRepository.listActiveTenantSchemas();

    for (const tenantSchema of tenantSchemas) {
      await this.publicPresenceWorkflowService.executeDueScheduledPublishes(tenantSchema);
    }
  }
}
