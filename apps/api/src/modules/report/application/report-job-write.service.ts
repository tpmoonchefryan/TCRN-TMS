// SPDX-License-Identifier: Apache-2.0
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';

import { ErrorCodes, LogSeverity, type RequestContext, TechEventType } from '@tcrn/shared';

import { TechEventLogService } from '../../log';
import { QUEUE_NAMES } from '../../queue';
import { canCancelReportJob, exceedsReportJobRowLimit } from '../domain/report-job.policy';
import {
  MfrFilterCriteriaDto,
  ReportCreateResponse,
  ReportFormat,
  ReportJobStatus,
  ReportType,
} from '../dto/report.dto';
import { ReportJobWriteRepository } from '../infrastructure/report-job-write.repository';
import { ReportPiiPlatformApplicationService } from './report-pii-platform.service';

interface ReportQueuePayload {
  jobId: string;
  reportType: ReportType;
  format: ReportFormat;
  tenantId: string;
  tenantSchemaName: string;
  userId: string;
  talentId: string;
  profileStoreId: string;
  filters: MfrFilterCriteriaDto;
}

@Injectable()
export class ReportJobWriteApplicationService {
  constructor(
    private readonly reportJobWriteRepository: ReportJobWriteRepository,
    private readonly techEventLog: TechEventLogService,
    @InjectQueue(QUEUE_NAMES.REPORT)
    private readonly reportQueue: Queue,
    private readonly reportPiiPlatformApplicationService?: ReportPiiPlatformApplicationService
  ) {}

  async create(
    reportType: ReportType,
    talentId: string,
    filters: MfrFilterCriteriaDto,
    format: ReportFormat,
    estimatedRows: number,
    context: RequestContext
  ): Promise<ReportCreateResponse> {
    if (exceedsReportJobRowLimit(estimatedRows)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Report cannot exceed 50,000 rows. Please narrow your filter criteria.',
      });
    }

    const piiPlatformResult =
      await this.reportPiiPlatformApplicationService?.createMfrReportRequest(
        reportType,
        talentId,
        filters,
        format,
        estimatedRows,
        context
      );

    if (piiPlatformResult) {
      return piiPlatformResult;
    }

    const talent = await this.reportJobWriteRepository.findTalentForCreation(
      context.tenantSchema,
      talentId
    );

    if (!talent?.profile_store_id) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found or has no profile store',
      });
    }

    const job = await this.reportJobWriteRepository.createJob(context.tenantSchema, {
      talentId,
      profileStoreId: talent.profile_store_id,
      reportType,
      filtersJson: JSON.stringify(filters),
      format,
      status: ReportJobStatus.PENDING,
      estimatedRows,
      userId: context.userId,
    });

    const queuePayload: ReportQueuePayload = {
      jobId: job.id,
      reportType,
      format,
      tenantId: context.tenantId ?? context.tenantSchema ?? 'unknown',
      tenantSchemaName: context.tenantSchema,
      userId: context.userId,
      talentId,
      profileStoreId: talent.profile_store_id,
      filters,
    };

    try {
      await this.reportQueue.add(reportType, queuePayload, {
        jobId: job.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown report queue error';
      await this.reportJobWriteRepository.markJobFailed(context.tenantSchema, job.id, {
        errorCode: 'REPORT_QUEUE_ENQUEUE_FAILED',
        errorMessage,
      });
      throw new InternalServerErrorException({
        code: ErrorCodes.SYS_ERROR,
        message: 'Failed to enqueue report job',
      });
    }

    await this.techEventLog.log(
      {
        eventType: TechEventType.SYSTEM_INFO,
        scope: 'export',
        severity: LogSeverity.INFO,
        traceId: job.id,
        payload: {
          action: 'report_job_created',
          jobId: job.id,
          reportType,
          estimatedRows,
          filters,
        },
      },
      context
    );

    return {
      deliveryMode: 'tms_job',
      jobId: job.id,
      status: job.status as ReportJobStatus,
      estimatedRows,
      createdAt: job.created_at.toISOString(),
    };
  }

  async cancel(jobId: string, talentId: string, context: RequestContext) {
    const job = await this.reportJobWriteRepository.findCancelableJob(
      context.tenantSchema,
      jobId,
      talentId
    );

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Report job not found',
      });
    }

    const status = job.status as ReportJobStatus;
    if (!canCancelReportJob(status)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only cancel pending or failed jobs',
      });
    }

    await this.reportJobWriteRepository.cancelJob(context.tenantSchema, jobId);
    await this.reportJobWriteRepository.insertCancellationChangeLog(context.tenantSchema, {
      jobId,
      oldStatus: job.status,
      operatorId: context.userId,
      ipAddress: context.ipAddress || '0.0.0.0',
      cancelledStatus: ReportJobStatus.CANCELLED,
    });

    return {
      id: jobId,
      status: ReportJobStatus.CANCELLED,
    };
  }
}
