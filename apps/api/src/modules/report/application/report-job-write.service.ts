// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, LogSeverity, type RequestContext, TechEventType } from '@tcrn/shared';

import { TechEventLogService } from '../../log';
import {
  canCancelReportJob,
  exceedsReportJobRowLimit,
} from '../domain/report-job.policy';
import {
  MfrFilterCriteriaDto,
  ReportCreateResponse,
  ReportFormat,
  ReportJobStatus,
  ReportType,
} from '../dto/report.dto';
import { ReportJobWriteRepository } from '../infrastructure/report-job-write.repository';
import { ReportJobStateService } from '../services/report-job-state.service';
import { ReportPiiPlatformApplicationService } from './report-pii-platform.service';

@Injectable()
export class ReportJobWriteApplicationService {
  constructor(
    private readonly reportJobWriteRepository: ReportJobWriteRepository,
    private readonly reportJobStateService: ReportJobStateService,
    private readonly techEventLog: TechEventLogService,
    private readonly reportPiiPlatformApplicationService?: ReportPiiPlatformApplicationService,
  ) {}

  async create(
    reportType: ReportType,
    talentId: string,
    filters: MfrFilterCriteriaDto,
    format: ReportFormat,
    estimatedRows: number,
    context: RequestContext,
  ): Promise<ReportCreateResponse> {
    if (exceedsReportJobRowLimit(estimatedRows)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Report cannot exceed 50,000 rows. Please narrow your filter criteria.',
      });
    }

    const piiPlatformResult = await this.reportPiiPlatformApplicationService?.createMfrReportRequest(
      reportType,
      talentId,
      filters,
      format,
      estimatedRows,
      context,
    );

    if (piiPlatformResult) {
      return piiPlatformResult;
    }

    const talent = await this.reportJobWriteRepository.findTalentForCreation(
      context.tenantSchema,
      talentId,
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

    await this.techEventLog.log({
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
    }, context);

    return {
      deliveryMode: 'tms_job',
      jobId: job.id,
      status: job.status as ReportJobStatus,
      estimatedRows,
      createdAt: job.created_at.toISOString(),
    };
  }

  async cancel(
    jobId: string,
    talentId: string,
    context: RequestContext,
  ) {
    const job = await this.reportJobWriteRepository.findCancelableJob(
      context.tenantSchema,
      jobId,
      talentId,
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

    await this.reportJobStateService.transition(jobId, ReportJobStatus.CANCELLED);
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
