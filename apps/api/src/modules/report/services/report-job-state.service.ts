// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Injectable,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { ReportJobStateApplicationService } from '../application/report-job-state.service';
import { ReportJobStatus } from '../dto/report.dto';
import { ReportJobStateRepository } from '../infrastructure/report-job-state.repository';

@Injectable()
export class ReportJobStateService {
  constructor(
    databaseService: DatabaseService,
    techEventLog: TechEventLogService,
    private readonly reportJobStateApplicationService: ReportJobStateApplicationService = new ReportJobStateApplicationService(
      new ReportJobStateRepository(databaseService),
      techEventLog,
    ),
  ) {}

  /**
   * Transition job to a new status
   */
  async transition(
    jobId: string,
    targetStatus: ReportJobStatus,
    updates?: Record<string, unknown>,
  ) {
    return this.reportJobStateApplicationService.transition(
      jobId,
      targetStatus,
      updates,
    );
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string,
    processedRows: number,
    totalRows: number,
  ) {
    await this.reportJobStateApplicationService.updateProgress(
      jobId,
      processedRows,
      totalRows,
    );
  }

  /**
   * Check and expire jobs - runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndExpireJobs(): Promise<number> {
    return this.reportJobStateApplicationService.checkAndExpireJobs();
  }

  /**
   * Check if job can be downloaded
   */
  async canDownload(jobId: string): Promise<boolean> {
    return this.reportJobStateApplicationService.canDownload(jobId);
  }
}
