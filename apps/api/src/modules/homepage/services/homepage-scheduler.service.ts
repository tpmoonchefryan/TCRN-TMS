// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { HomepageSchedulerApplicationService } from '../application/homepage-scheduler.service';
import type { HomepageDraftArchivalResult } from '../domain/homepage-scheduler.policy';

/**
 * Homepage Scheduler Service
 * Handles automatic archiving of old draft versions
 */
@Injectable()
export class HomepageSchedulerService {
  constructor(
    private readonly homepageSchedulerApplicationService: HomepageSchedulerApplicationService,
  ) {}

  /**
   * Archive draft versions older than 30 days
   * Runs daily at 3:00 AM UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async archiveOldDrafts(): Promise<void> {
    await this.homepageSchedulerApplicationService.archiveOldDrafts();
  }

  /**
   * Process archival of old drafts
   */
  processArchival(): Promise<HomepageDraftArchivalResult> {
    return this.homepageSchedulerApplicationService.processArchival();
  }

  /**
   * Manual trigger for archival (for admin use)
   */
  triggerArchival(): Promise<HomepageDraftArchivalResult> {
    return this.homepageSchedulerApplicationService.triggerArchival();
  }
}
