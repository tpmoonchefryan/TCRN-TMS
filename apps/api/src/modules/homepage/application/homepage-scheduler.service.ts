// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';

import { TechEventLogService } from '../../log';
import {
  accumulateArchivedDraftCount,
  buildHomepageDraftArchivalCompletedMessage,
  buildHomepageDraftArchivalCompletedPayload,
  calculateHomepageDraftArchivalCutoff,
  HOMEPAGE_DRAFT_ARCHIVAL_COMPLETED_EVENT,
  HOMEPAGE_DRAFT_ARCHIVAL_FAILED_EVENT,
  type HomepageDraftArchivalResult,
} from '../domain/homepage-scheduler.policy';
import { HomepageSchedulerRepository } from '../infrastructure/homepage-scheduler.repository';

@Injectable()
export class HomepageSchedulerApplicationService {
  private readonly logger = new Logger(HomepageSchedulerApplicationService.name);

  constructor(
    private readonly homepageSchedulerRepository: HomepageSchedulerRepository,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  async archiveOldDrafts(): Promise<void> {
    this.logger.log('Starting draft version archival task');

    try {
      const result = await this.processArchival();

      if (result.archived > 0) {
        await this.techEventLogService.info(
          HOMEPAGE_DRAFT_ARCHIVAL_COMPLETED_EVENT,
          buildHomepageDraftArchivalCompletedMessage(result.archived),
          buildHomepageDraftArchivalCompletedPayload(result),
        );
      }

      this.logger.log(`Archival completed: ${result.archived} versions archived`);
    } catch (error) {
      this.logger.error(
        `Draft archival failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.techEventLogService.error(
        HOMEPAGE_DRAFT_ARCHIVAL_FAILED_EVENT,
        'Failed to archive old draft versions',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async processArchival(): Promise<HomepageDraftArchivalResult> {
    const cutoffDate = calculateHomepageDraftArchivalCutoff();
    const tenantSchemas = await this.homepageSchedulerRepository.listActiveTenantSchemas();

    let archived = 0;
    for (const tenantSchema of tenantSchemas) {
      archived = accumulateArchivedDraftCount(
        archived,
        await this.homepageSchedulerRepository.archiveOldDraftVersions(
          tenantSchema,
          cutoffDate,
        ),
      );
    }

    return {
      archived,
      cutoffDate,
    };
  }

  async triggerArchival(): Promise<HomepageDraftArchivalResult> {
    this.logger.log('Manual archival triggered');
    return this.processArchival();
  }
}
