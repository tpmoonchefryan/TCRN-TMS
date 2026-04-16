// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';
import type { Queue } from 'bullmq';
import { Readable } from 'stream';

import { BUCKETS, MinioService } from '../../minio';
import { QUEUE_NAMES } from '../../queue';
import { ImportJobType } from '../dto/import.dto';
import { ImportJobWriteApplicationService } from './import-job-write.service';

@Injectable()
export class ImportJobSubmissionApplicationService {
  constructor(
    private readonly importJobWriteApplicationService: ImportJobWriteApplicationService,
    private readonly minioService: MinioService,
    @InjectQueue(QUEUE_NAMES.IMPORT)
    private readonly importQueue: Queue,
  ) {}

  async submitCustomerCreateJob(params: {
    jobType: ImportJobType;
    talentId: string;
    fileName: string;
    fileBuffer: Buffer;
    fileSize: number;
    totalRows: number;
    consumerCode?: string;
    defaultProfileType: 'individual' | 'company';
    context: RequestContext;
  }) {
    const job = await this.importJobWriteApplicationService.createJob(
      params.jobType,
      params.talentId,
      params.fileName,
      params.fileSize,
      params.totalRows,
      params.consumerCode,
      params.context,
    );

    const objectName = `${params.context.tenantSchema}/${job.id}.csv`;
    await this.minioService.uploadStream(
      BUCKETS.IMPORTS,
      objectName,
      Readable.from(params.fileBuffer),
      params.fileSize,
      'text/csv',
    );

    await this.importQueue.add('process-import', {
      jobId: job.id,
      tenantId: params.context.tenantId,
      tenantSchemaName: params.context.tenantSchema,
      jobType: 'customer_create',
      consumerCode: params.consumerCode,
      totalRows: params.totalRows,
      filePath: objectName,
      talentId: params.talentId,
      profileStoreId: job.profileStoreId,
      userId: params.context.userId,
      defaultProfileType: params.defaultProfileType,
    });

    return {
      id: job.id,
      status: job.status,
      fileName: job.fileName,
      totalRows: params.totalRows,
      createdAt: job.createdAt,
    };
  }
}
