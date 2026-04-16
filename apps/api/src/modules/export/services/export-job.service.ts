// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
} from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';
import type { Queue } from 'bullmq';

import { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { CustomerArchiveRepository } from '../../customer/infrastructure/customer-archive.repository';
import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { MinioService } from '../../minio';
import { QUEUE_NAMES } from '../../queue';
import { ExportJobReadApplicationService } from '../application/export-job-read.service';
import { ExportJobStateApplicationService } from '../application/export-job-state.service';
import { ExportJobWriteApplicationService } from '../application/export-job-write.service';
import {
  type CreateExportJobDto,
  type ExportJobQueryDto,
  type ExportJobResponse,
} from '../dto/export.dto';
import { ExportJobReadRepository } from '../infrastructure/export-job-read.repository';
import {
  ExportJobStateRepository,
} from '../infrastructure/export-job-state.repository';
import { ExportJobWriteRepository } from '../infrastructure/export-job-write.repository';

@Injectable()
export class ExportJobService {
  constructor(
    databaseService: DatabaseService,
    minioService: MinioService,
    techEventLogService: TechEventLogService,
    @InjectQueue(QUEUE_NAMES.EXPORT) private readonly exportQueue: Queue,
    private readonly exportJobReadApplicationService: ExportJobReadApplicationService = new ExportJobReadApplicationService(
      new ExportJobReadRepository(databaseService),
      new CustomerArchiveAccessService(
        new CustomerArchiveRepository(databaseService),
      ),
      minioService,
    ),
    private readonly exportJobWriteApplicationService: ExportJobWriteApplicationService = new ExportJobWriteApplicationService(
      new ExportJobWriteRepository(databaseService),
      techEventLogService,
      new CustomerArchiveAccessService(
        new CustomerArchiveRepository(databaseService),
      ),
      exportQueue,
    ),
    private readonly exportJobStateApplicationService: ExportJobStateApplicationService = new ExportJobStateApplicationService(
      new ExportJobStateRepository(databaseService),
      techEventLogService,
    ),
  ) {}

  /**
   * Create export job (multi-tenant aware)
   */
  async createJob(
    talentId: string,
    dto: CreateExportJobDto,
    context: RequestContext,
  ): Promise<ExportJobResponse> {
    return this.exportJobWriteApplicationService.createJob(talentId, dto, context);
  }

  /**
   * Get export job by ID (multi-tenant aware)
   */
  async findById(jobId: string, context: RequestContext): Promise<ExportJobResponse> {
    return this.exportJobReadApplicationService.findById(jobId, context);
  }

  /**
   * Get export jobs list (multi-tenant aware)
   */
  async findMany(
    talentId: string,
    query: ExportJobQueryDto,
    context: RequestContext,
  ): Promise<{ items: ExportJobResponse[]; total: number }> {
    return this.exportJobReadApplicationService.findMany(talentId, query, context);
  }

  /**
   * Get download URL for completed export (multi-tenant aware)
   */
  async getDownloadUrl(jobId: string, context: RequestContext): Promise<string> {
    return this.exportJobReadApplicationService.getDownloadUrl(jobId, context);
  }

  /**
   * Cancel export job (multi-tenant aware)
   */
  async cancelJob(jobId: string, context: RequestContext): Promise<void> {
    await this.exportJobWriteApplicationService.cancelJob(jobId, context);
  }

  /**
   * Update job progress (called by worker) - needs tenantSchema from job data
   */
  async updateProgress(
    jobId: string,
    totalRecords: number,
    processedRecords: number,
    tenantSchema: string,
  ): Promise<void> {
    await this.exportJobStateApplicationService.updateProgress(
      jobId,
      totalRecords,
      processedRecords,
      tenantSchema,
    );
  }

  /**
   * Complete job (called by worker) - needs tenantSchema from job data
   */
  async completeJob(
    jobId: string,
    filePath: string,
    fileName: string,
    totalRecords: number,
    tenantSchema: string,
  ): Promise<void> {
    await this.exportJobStateApplicationService.completeJob(
      jobId,
      filePath,
      fileName,
      totalRecords,
      tenantSchema,
    );
  }

  /**
   * Mark job as failed (called by worker) - needs tenantSchema from job data
   */
  async failJob(jobId: string, errorMessage: string, tenantSchema: string): Promise<void> {
    await this.exportJobStateApplicationService.failJob(jobId, errorMessage, tenantSchema);
  }
}
