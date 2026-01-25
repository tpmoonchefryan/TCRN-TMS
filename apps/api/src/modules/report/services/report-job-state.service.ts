// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogSeverity } from '@tcrn/shared';
import { ErrorCodes } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { ReportJobStatus } from '../dto/report.dto';

const STATUS_TRANSITIONS: Record<ReportJobStatus, ReportJobStatus[]> = {
  [ReportJobStatus.PENDING]: [ReportJobStatus.RUNNING, ReportJobStatus.CANCELLED],
  [ReportJobStatus.RUNNING]: [ReportJobStatus.SUCCESS, ReportJobStatus.FAILED],
  [ReportJobStatus.SUCCESS]: [ReportJobStatus.CONSUMED, ReportJobStatus.EXPIRED],
  [ReportJobStatus.CONSUMED]: [ReportJobStatus.EXPIRED],
  [ReportJobStatus.EXPIRED]: [],
  [ReportJobStatus.FAILED]: [ReportJobStatus.RETRYING, ReportJobStatus.CANCELLED],
  [ReportJobStatus.RETRYING]: [ReportJobStatus.RUNNING, ReportJobStatus.FAILED],
  [ReportJobStatus.CANCELLED]: [],
};

@Injectable()
export class ReportJobStateService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly techEventLog: TechEventLogService,
  ) {}

  /**
   * Transition job to a new status
   */
  async transition(
    jobId: string,
    targetStatus: ReportJobStatus,
    updates?: Record<string, unknown>,
  ) {
    const prisma = this.databaseService.getPrisma();

    const job = await prisma.reportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: `Report job ${jobId} not found`,
      });
    }

    const currentStatus = job.status as ReportJobStatus;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Cannot transition from ${currentStatus} to ${targetStatus}`,
      });
    }

    const now = new Date();
    const statusUpdates: Record<string, unknown> = { status: targetStatus };

    // Status-specific updates
    switch (targetStatus) {
      case ReportJobStatus.RUNNING:
        statusUpdates.startedAt = now;
        break;
      case ReportJobStatus.SUCCESS:
        statusUpdates.completedAt = now;
        statusUpdates.expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
        break;
      case ReportJobStatus.CONSUMED:
        if (!job.downloadedAt) {
          statusUpdates.downloadedAt = now;
        }
        break;
      case ReportJobStatus.FAILED:
        statusUpdates.completedAt = now;
        break;
      case ReportJobStatus.RETRYING:
        statusUpdates.retryCount = job.retryCount + 1;
        break;
      case ReportJobStatus.CANCELLED:
        statusUpdates.completedAt = now;
        break;
    }

    const updated = await prisma.reportJob.update({
      where: { id: jobId },
      data: { ...statusUpdates, ...updates },
    });

    return updated;
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string,
    processedRows: number,
    totalRows: number,
  ) {
    const prisma = this.databaseService.getPrisma();

    const percentage = Math.min(Math.round((processedRows / totalRows) * 100), 100);

    await prisma.reportJob.update({
      where: { id: jobId },
      data: {
        processedRows,
        progressPercentage: percentage,
      },
    });
  }

  /**
   * Check and expire jobs - runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndExpireJobs(): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const now = new Date();

    const result = await prisma.reportJob.updateMany({
      where: {
        status: { in: ['success', 'consumed'] },
        expiresAt: { lt: now },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      await this.techEventLog.log({
        eventType: 'SCHEDULED_TASK_COMPLETED' as any,
        scope: 'scheduled',
        severity: LogSeverity.INFO,
        payload: {
          task: 'report_expiry_check',
          expiredCount: result.count,
        },
      });
    }

    return result.count;
  }

  /**
   * Check if job can be downloaded
   */
  async canDownload(jobId: string): Promise<boolean> {
    const prisma = this.databaseService.getPrisma();

    const job = await prisma.reportJob.findUnique({
      where: { id: jobId },
      select: { status: true, expiresAt: true },
    });

    if (!job) return false;

    const status = job.status as ReportJobStatus;
    if (status !== ReportJobStatus.SUCCESS && status !== ReportJobStatus.CONSUMED) {
      return false;
    }

    if (job.expiresAt && job.expiresAt < new Date()) {
      return false;
    }

    return true;
  }
}
