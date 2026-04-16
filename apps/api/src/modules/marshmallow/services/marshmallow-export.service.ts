// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';
import type { Queue } from 'bullmq';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { MinioService } from '../../minio';
import { QUEUE_NAMES } from '../../queue';
import { MarshmallowExportReadApplicationService } from '../application/marshmallow-export-read.service';
import { MarshmallowExportStateApplicationService } from '../application/marshmallow-export-state.service';
import { MarshmallowExportWriteApplicationService } from '../application/marshmallow-export-write.service';
import {
  type MarshmallowExportJobCreateResponse,
  type MarshmallowExportJobData,
  type MarshmallowExportJobResponse,
  MarshmallowExportStatus,
} from '../domain/marshmallow-export.policy';
import type { ExportMessagesDto } from '../dto/marshmallow.dto';
import { MarshmallowExportReadRepository } from '../infrastructure/marshmallow-export-read.repository';
import { MarshmallowExportStateRepository } from '../infrastructure/marshmallow-export-state.repository';
import { MarshmallowExportWriteRepository } from '../infrastructure/marshmallow-export-write.repository';

@Injectable()
export class MarshmallowExportService {
  constructor(
    databaseService: DatabaseService,
    minioService: MinioService,
    techEventLogService: TechEventLogService,
    @InjectQueue(QUEUE_NAMES.MARSHMALLOW_EXPORT)
    private readonly marshmallowExportQueue: Queue,
    private readonly marshmallowExportReadApplicationService: MarshmallowExportReadApplicationService = new MarshmallowExportReadApplicationService(
      new MarshmallowExportReadRepository(databaseService),
      minioService,
    ),
    private readonly marshmallowExportWriteApplicationService: MarshmallowExportWriteApplicationService = new MarshmallowExportWriteApplicationService(
      new MarshmallowExportWriteRepository(databaseService),
      techEventLogService,
      marshmallowExportQueue,
    ),
    private readonly marshmallowExportStateApplicationService: MarshmallowExportStateApplicationService = new MarshmallowExportStateApplicationService(
      new MarshmallowExportStateRepository(databaseService),
      techEventLogService,
    ),
  ) {}

  async createExportJob(
    talentId: string,
    dto: ExportMessagesDto,
    context: RequestContext,
  ): Promise<MarshmallowExportJobCreateResponse> {
    return this.marshmallowExportWriteApplicationService.createJob(talentId, dto, context);
  }

  async getExportJob(
    jobId: string,
    talentId: string,
    tenantSchema: string,
  ): Promise<MarshmallowExportJobResponse> {
    return this.marshmallowExportReadApplicationService.findById(jobId, talentId, tenantSchema);
  }

  async getDownloadUrl(
    jobId: string,
    talentId: string,
    tenantSchema: string,
  ): Promise<string> {
    return this.marshmallowExportReadApplicationService.getDownloadUrl(
      jobId,
      talentId,
      tenantSchema,
    );
  }

  async updateProgress(
    jobId: string,
    tenantSchema: string,
    totalRecords: number,
    processedRecords: number,
  ): Promise<void> {
    await this.marshmallowExportStateApplicationService.updateProgress(
      jobId,
      tenantSchema,
      totalRecords,
      processedRecords,
    );
  }

  async completeJob(
    jobId: string,
    tenantSchema: string,
    filePath: string,
    fileName: string,
    totalRecords: number,
  ): Promise<void> {
    await this.marshmallowExportStateApplicationService.completeJob(
      jobId,
      tenantSchema,
      filePath,
      fileName,
      totalRecords,
    );
  }

  async failJob(
    jobId: string,
    tenantSchema: string,
    errorMessage: string,
  ): Promise<void> {
    await this.marshmallowExportStateApplicationService.failJob(
      jobId,
      tenantSchema,
      errorMessage,
    );
  }
}

export type {
  MarshmallowExportJobCreateResponse,
  MarshmallowExportJobData,
  MarshmallowExportJobResponse,
};
export { MarshmallowExportStatus };
