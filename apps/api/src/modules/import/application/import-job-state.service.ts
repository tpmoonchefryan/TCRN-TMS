// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { LogSeverity, TechEventType } from '@tcrn/shared';

import { TechEventLogService } from '../../log';
import { resolveImportJobCompletionStatus } from '../domain/import-job-state.policy';
import { ImportJobStatus } from '../dto/import.dto';
import { ImportJobStateRepository } from '../infrastructure/import-job-state.repository';

@Injectable()
export class ImportJobStateApplicationService {
  constructor(
    private readonly importJobStateRepository: ImportJobStateRepository,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  async updateProgress(
    jobId: string,
    processedRows: number,
    successRows: number,
    failedRows: number,
    warningRows: number,
    tenantSchema: string,
  ): Promise<void> {
    await this.importJobStateRepository.updateProgress(tenantSchema, {
      jobId,
      processedRows,
      successRows,
      failedRows,
      warningRows,
      status: ImportJobStatus.RUNNING,
    });
  }

  async completeJob(
    jobId: string,
    successRows: number,
    failedRows: number,
    warningRows: number,
    tenantSchema: string,
  ): Promise<void> {
    const status = resolveImportJobCompletionStatus(successRows, failedRows);
    const processedRows = successRows + failedRows;

    await this.importJobStateRepository.completeJob(tenantSchema, {
      jobId,
      status,
      processedRows,
      successRows,
      failedRows,
      warningRows,
    });

    await this.techEventLogService.log({
      eventType: TechEventType.IMPORT_JOB_COMPLETED,
      scope: 'import',
      severity: status === ImportJobStatus.FAILED ? LogSeverity.ERROR : LogSeverity.INFO,
      traceId: jobId,
      payload: {
        job_id: jobId,
        status,
        success_rows: successRows,
        failed_rows: failedRows,
        warning_rows: warningRows,
      },
    });
  }

  async addError(
    jobId: string,
    rowNumber: number,
    errorCode: string,
    errorMessage: string,
    originalData: string,
    tenantSchema: string,
  ): Promise<void> {
    await this.importJobStateRepository.addError(tenantSchema, {
      jobId,
      rowNumber,
      errorCode,
      errorMessage,
      originalData,
    });
  }
}
