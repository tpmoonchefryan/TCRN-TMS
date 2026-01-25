// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log/services/tech-event-log.service';

/**
 * Homepage Scheduler Service
 * Handles automatic archiving of old draft versions
 */
@Injectable()
export class HomepageSchedulerService {
  private readonly logger = new Logger(HomepageSchedulerService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  /**
   * Archive draft versions older than 30 days
   * Runs daily at 3:00 AM UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async archiveOldDrafts(): Promise<void> {
    this.logger.log('Starting draft version archival task');

    try {
      const result = await this.processArchival();

      if (result.archived > 0) {
        await this.techEventLogService.info(
          'HOMEPAGE_DRAFT_ARCHIVAL_COMPLETED',
          `Archived ${result.archived} old draft versions`,
          {
            archivedCount: result.archived,
            cutoffDate: result.cutoffDate,
          },
        );
      }

      this.logger.log(`Archival completed: ${result.archived} versions archived`);
    } catch (error) {
      this.logger.error(`Draft archival failed: ${error}`);
      await this.techEventLogService.error(
        'HOMEPAGE_DRAFT_ARCHIVAL_FAILED',
        'Failed to archive old draft versions',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Process archival of old drafts
   */
  async processArchival(): Promise<{ archived: number; cutoffDate: Date }> {
    const prisma = this.databaseService.getPrisma();
    
    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Find and update old draft versions
    // Only archive drafts that are not currently pointed to by any homepage
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "public"."homepage_version" hv
      SET 
        status = 'archived',
        archived_at = NOW()
      WHERE hv.status = 'draft'
        AND hv.created_at < $1
        AND NOT EXISTS (
          SELECT 1 FROM "public"."talent_homepage" th
          WHERE th.draft_version_id = hv.id
             OR th.published_version_id = hv.id
        )
    `, cutoffDate);

    return {
      archived: result as number,
      cutoffDate,
    };
  }

  /**
   * Manual trigger for archival (for admin use)
   */
  async triggerArchival(): Promise<{ archived: number; cutoffDate: Date }> {
    this.logger.log('Manual archival triggered');
    return this.processArchival();
  }
}
