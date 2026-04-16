// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, LogSeverity, TechEventScope, TechEventType } from '@tcrn/shared';

import { TechEventLogService } from '../../log';
import {
  buildReportJobTransitionUpdates,
  canDownloadReportJob,
  canTransitionReportJob,
  getReportJobProgressPercentage,
} from '../domain/report-job-state.policy';
import { ReportJobStatus } from '../dto/report.dto';
import { ReportJobStateRepository } from '../infrastructure/report-job-state.repository';

@Injectable()
export class ReportJobStateApplicationService {
  constructor(
    private readonly reportJobStateRepository: ReportJobStateRepository,
    private readonly techEventLog: TechEventLogService,
  ) {}

  async transition(
    jobId: string,
    targetStatus: ReportJobStatus,
    updates?: Record<string, unknown>,
  ) {
    const job = await this.reportJobStateRepository.findJobById(jobId);

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: `Report job ${jobId} not found`,
      });
    }

    const currentStatus = job.status as ReportJobStatus;

    if (!canTransitionReportJob(currentStatus, targetStatus)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Cannot transition from ${currentStatus} to ${targetStatus}`,
      });
    }

    return this.reportJobStateRepository.updateJob(
      jobId,
      buildReportJobTransitionUpdates(
        {
          retryCount: job.retryCount,
          downloadedAt: job.downloadedAt,
        },
        targetStatus,
        updates,
      ),
    );
  }

  updateProgress(
    jobId: string,
    processedRows: number,
    totalRows: number,
  ) {
    return this.reportJobStateRepository.updateJob(jobId, {
      processedRows,
      progressPercentage: getReportJobProgressPercentage(processedRows, totalRows),
    });
  }

  async checkAndExpireJobs(): Promise<number> {
    const result = await this.reportJobStateRepository.updateExpiredJobs(new Date());

    if (result.count > 0) {
      await this.techEventLog.log({
        eventType: TechEventType.SCHEDULED_TASK_COMPLETED,
        scope: TechEventScope.SCHEDULED,
        severity: LogSeverity.INFO,
        payload: {
          task: 'report_expiry_check',
          expiredCount: result.count,
        },
      });
    }

    return result.count;
  }

  async canDownload(jobId: string): Promise<boolean> {
    const job = await this.reportJobStateRepository.findDownloadState(jobId);

    if (!job) {
      return false;
    }

    return canDownloadReportJob({
      status: job.status as ReportJobStatus,
      expiresAt: job.expiresAt,
    });
  }
}
