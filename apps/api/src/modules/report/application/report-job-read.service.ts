// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCodes,
  LogSeverity,
  type RequestContext,
  TechEventType,
} from '@tcrn/shared';

import { TechEventLogService } from '../../log';
import { BUCKETS, MinioService } from '../../minio';
import {
  mapReportJobDetail,
  mapReportJobListItem,
  REPORT_JOB_DOWNLOAD_URL_EXPIRY_SECONDS,
  type ReportJobPagination,
  type ReportJobReadFilters,
} from '../domain/report-job-read.policy';
import { ReportJobListQueryDto, ReportJobStatus } from '../dto/report.dto';
import { ReportJobReadRepository } from '../infrastructure/report-job-read.repository';
import { ReportJobStateService } from '../services/report-job-state.service';

@Injectable()
export class ReportJobReadApplicationService {
  constructor(
    private readonly reportJobReadRepository: ReportJobReadRepository,
    private readonly reportJobStateService: ReportJobStateService,
    private readonly techEventLog: TechEventLogService,
    private readonly minioService: MinioService,
  ) {}

  async findById(
    jobId: string,
    talentId: string,
    context: RequestContext,
  ) {
    const job = await this.reportJobReadRepository.findById(
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

    return mapReportJobDetail(job);
  }

  async findMany(
    query: ReportJobListQueryDto,
    context: RequestContext,
  ): Promise<{ items: ReturnType<typeof mapReportJobListItem>[]; total: number }> {
    const filters = this.buildFilters(query);
    const pagination = this.buildPagination(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.reportJobReadRepository.findMany(context.tenantSchema, filters, pagination),
      this.reportJobReadRepository.countMany(context.tenantSchema, filters),
    ]);

    return {
      items: items.map((job) => mapReportJobListItem(job)),
      total,
    };
  }

  async getDownloadUrl(
    jobId: string,
    talentId: string,
    context: RequestContext,
  ) {
    const job = await this.reportJobReadRepository.findDownloadTarget(
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

    const canDownload = await this.reportJobStateService.canDownload(jobId);
    if (!canDownload) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Report is not available for download',
      });
    }

    if (!job.file_path) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Report file not found',
      });
    }

    if (job.status === ReportJobStatus.SUCCESS) {
      await this.reportJobStateService.transition(jobId, ReportJobStatus.CONSUMED);
    }

    const downloadUrl = await this.minioService.getPresignedUrl(
      BUCKETS.TEMP_REPORTS,
      job.file_path,
      REPORT_JOB_DOWNLOAD_URL_EXPIRY_SECONDS,
    );

    await this.techEventLog.log({
      eventType: TechEventType.SYSTEM_INFO,
      scope: 'export',
      severity: LogSeverity.INFO,
      traceId: jobId,
      payload: {
        action: 'report_downloaded',
        jobId,
        fileName: job.file_name,
      },
    }, context);

    return {
      downloadUrl,
      expiresIn: REPORT_JOB_DOWNLOAD_URL_EXPIRY_SECONDS,
      fileName: job.file_name,
    };
  }

  private buildFilters(query: ReportJobListQueryDto): ReportJobReadFilters {
    return {
      talentId: query.talentId,
      statuses: query.status ? query.status.split(',') : undefined,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
    };
  }

  private buildPagination(page: number = 1, pageSize: number = 20): ReportJobPagination {
    return {
      take: pageSize,
      skip: (page - 1) * pageSize,
    };
  }
}
