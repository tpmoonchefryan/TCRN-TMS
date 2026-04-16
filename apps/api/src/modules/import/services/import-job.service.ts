// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { CustomerArchiveRepository } from '../../customer/infrastructure/customer-archive.repository';
import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { MinioService } from '../../minio';
import { ImportJobReadApplicationService } from '../application/import-job-read.service';
import { ImportJobStateApplicationService } from '../application/import-job-state.service';
import { ImportJobWriteApplicationService } from '../application/import-job-write.service';
import { type CreatedImportJobResult } from '../domain/import-job.policy';
import {
  type ImportError,
  ImportJobQueryDto,
  type ImportJobResponse,
  ImportJobType,
} from '../dto/import.dto';
import { ImportJobReadRepository } from '../infrastructure/import-job-read.repository';
import { ImportJobStateRepository } from '../infrastructure/import-job-state.repository';
import { ImportJobWriteRepository } from '../infrastructure/import-job-write.repository';

@Injectable()
export class ImportJobService {
  constructor(
    databaseService: DatabaseService,
    minioService: MinioService,
    techEventLogService: TechEventLogService,
    private readonly importJobReadApplicationService: ImportJobReadApplicationService = new ImportJobReadApplicationService(
      new ImportJobReadRepository(databaseService),
      new CustomerArchiveAccessService(
        new CustomerArchiveRepository(databaseService),
      ),
    ),
    private readonly importJobWriteApplicationService: ImportJobWriteApplicationService = new ImportJobWriteApplicationService(
      new ImportJobWriteRepository(databaseService),
      techEventLogService,
      new CustomerArchiveAccessService(
        new CustomerArchiveRepository(databaseService),
      ),
    ),
    private readonly importJobStateApplicationService: ImportJobStateApplicationService = new ImportJobStateApplicationService(
      new ImportJobStateRepository(databaseService),
      techEventLogService,
    ),
  ) {
    void minioService;
  }

  /**
   * Create import job (multi-tenant aware)
   */
  async createJob(
    jobType: ImportJobType,
    talentId: string,
    fileName: string,
    fileSize: number,
    totalRows: number,
    consumerCode: string | undefined,
    context: RequestContext,
  ): Promise<CreatedImportJobResult> {
    return this.importJobWriteApplicationService.createJob(
      jobType,
      talentId,
      fileName,
      fileSize,
      totalRows,
      consumerCode,
      context,
    );
  }

  /**
   * Get import job by ID (multi-tenant aware)
   */
  async findById(jobId: string, talentId: string, context: RequestContext): Promise<ImportJobResponse> {
    return this.importJobReadApplicationService.findById(jobId, talentId, context);
  }

  /**
   * Get import jobs list (multi-tenant aware)
   */
  async findMany(
    talentId: string,
    query: ImportJobQueryDto,
    context: RequestContext,
  ): Promise<{ items: ImportJobResponse[]; total: number }> {
    return this.importJobReadApplicationService.findMany(talentId, query, context);
  }

  /**
   * Update job progress (called by worker) - needs tenantSchema from job data
   */
  async updateProgress(
    jobId: string,
    processedRows: number,
    successRows: number,
    failedRows: number,
    warningRows: number,
    tenantSchema: string,
  ): Promise<void> {
    await this.importJobStateApplicationService.updateProgress(
      jobId,
      processedRows,
      successRows,
      failedRows,
      warningRows,
      tenantSchema,
    );
  }

  /**
   * Complete job (called by worker) - needs tenantSchema from job data
   */
  async completeJob(
    jobId: string,
    successRows: number,
    failedRows: number,
    warningRows: number,
    tenantSchema: string,
  ): Promise<void> {
    await this.importJobStateApplicationService.completeJob(
      jobId,
      successRows,
      failedRows,
      warningRows,
      tenantSchema,
    );
  }

  /**
   * Cancel job (multi-tenant aware)
   */
  async cancelJob(jobId: string, talentId: string, context: RequestContext): Promise<void> {
    await this.importJobWriteApplicationService.cancelJob(jobId, talentId, context);
  }

  /**
   * Add error to job (called by worker) - needs tenantSchema from job data
   */
  async addError(
    jobId: string,
    rowNumber: number,
    errorCode: string,
    errorMessage: string,
    originalData: string,
    tenantSchema: string,
  ): Promise<void> {
    await this.importJobStateApplicationService.addError(
      jobId,
      rowNumber,
      errorCode,
      errorMessage,
      originalData,
      tenantSchema,
    );
  }

  /**
   * Get job errors (multi-tenant aware)
   */
  async getErrors(jobId: string, talentId: string, context: RequestContext): Promise<ImportError[]> {
    return this.importJobReadApplicationService.getErrors(jobId, talentId, context);
  }
}
