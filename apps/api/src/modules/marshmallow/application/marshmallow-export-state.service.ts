// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { LogSeverity, TechEventType } from '@tcrn/shared';

import { TechEventLogService } from '../../log';
import { MarshmallowExportStatus } from '../domain/marshmallow-export.policy';
import {
  getMarshmallowExportJobExpiryAt,
} from '../domain/marshmallow-export-state.policy';
import { MarshmallowExportStateRepository } from '../infrastructure/marshmallow-export-state.repository';

@Injectable()
export class MarshmallowExportStateApplicationService {
  constructor(
    private readonly marshmallowExportStateRepository: MarshmallowExportStateRepository,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  async updateProgress(
    jobId: string,
    tenantSchema: string,
    totalRecords: number,
    processedRecords: number,
  ): Promise<void> {
    await this.marshmallowExportStateRepository.updateProgress(tenantSchema, {
      jobId,
      totalRecords,
      processedRecords,
      status: MarshmallowExportStatus.RUNNING,
    });
  }

  async completeJob(
    jobId: string,
    tenantSchema: string,
    filePath: string,
    fileName: string,
    totalRecords: number,
  ): Promise<void> {
    await this.marshmallowExportStateRepository.completeJob(tenantSchema, {
      jobId,
      status: MarshmallowExportStatus.SUCCESS,
      filePath,
      fileName,
      totalRecords,
      expiresAt: getMarshmallowExportJobExpiryAt(),
    });

    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_COMPLETED,
      scope: 'marshmallow',
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
    tenantSchema: string,
    errorMessage: string,
  ): Promise<void> {
    await this.marshmallowExportStateRepository.failJob(tenantSchema, {
      jobId,
      status: MarshmallowExportStatus.FAILED,
      errorMessage,
    });

    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_FAILED,
      scope: 'marshmallow',
      severity: LogSeverity.ERROR,
      traceId: jobId,
      payload: {
        job_id: jobId,
        error: errorMessage,
      },
    });
  }
}
