// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { LogSeverity, TechEventType } from '@tcrn/shared';

import { TechEventLogService } from '../../log';
import { getExportJobExpiryAt } from '../domain/export-job-state.policy';
import { ExportJobStatus } from '../dto/export.dto';
import { ExportJobStateRepository } from '../infrastructure/export-job-state.repository';

@Injectable()
export class ExportJobStateApplicationService {
  constructor(
    private readonly exportJobStateRepository: ExportJobStateRepository,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  async updateProgress(
    jobId: string,
    totalRecords: number,
    processedRecords: number,
    tenantSchema: string,
  ): Promise<void> {
    await this.exportJobStateRepository.updateProgress(tenantSchema, {
      jobId,
      totalRecords,
      processedRecords,
      status: ExportJobStatus.RUNNING,
    });
  }

  async completeJob(
    jobId: string,
    filePath: string,
    fileName: string,
    totalRecords: number,
    tenantSchema: string,
  ): Promise<void> {
    await this.exportJobStateRepository.completeJob(tenantSchema, {
      jobId,
      status: ExportJobStatus.SUCCESS,
      filePath,
      fileName,
      totalRecords,
      expiresAt: getExportJobExpiryAt(),
    });

    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_COMPLETED,
      scope: 'export',
      severity: LogSeverity.INFO,
      traceId: jobId,
      payload: {
        job_id: jobId,
        file_path: filePath,
        total_records: totalRecords,
      },
    });
  }

  async failJob(
    jobId: string,
    errorMessage: string,
    tenantSchema: string,
  ): Promise<void> {
    await this.exportJobStateRepository.failJob(tenantSchema, {
      jobId,
      status: ExportJobStatus.FAILED,
      errorMessage,
    });

    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_FAILED,
      scope: 'export',
      severity: LogSeverity.ERROR,
      traceId: jobId,
      payload: {
        job_id: jobId,
        error: errorMessage,
      },
    });
  }
}
