// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import { BUCKETS, MinioService } from '../../minio';
import {
  canDownloadMarshmallowExportJob,
  mapMarshmallowExportJobResponse,
  MARSHMALLOW_EXPORT_DOWNLOAD_URL_EXPIRY_SECONDS,
} from '../domain/marshmallow-export.policy';
import { MarshmallowExportReadRepository } from '../infrastructure/marshmallow-export-read.repository';

@Injectable()
export class MarshmallowExportReadApplicationService {
  constructor(
    private readonly marshmallowExportReadRepository: MarshmallowExportReadRepository,
    private readonly minioService: MinioService,
  ) {}

  async findById(
    jobId: string,
    talentId: string,
    tenantSchema: string,
  ) {
    const job = await this.marshmallowExportReadRepository.findById(
      tenantSchema,
      talentId,
      jobId,
    );

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    return mapMarshmallowExportJobResponse(job, talentId);
  }

  async getDownloadUrl(
    jobId: string,
    talentId: string,
    tenantSchema: string,
  ): Promise<string> {
    const job = await this.marshmallowExportReadRepository.findDownloadTarget(
      tenantSchema,
      talentId,
      jobId,
    );

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    if (!canDownloadMarshmallowExportJob(job)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Export not ready for download',
      });
    }

    if (!job.file_path) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Export not ready for download',
      });
    }

    return this.minioService.getPresignedUrl(
      BUCKETS.TEMP_REPORTS,
      job.file_path,
      MARSHMALLOW_EXPORT_DOWNLOAD_URL_EXPIRY_SECONDS,
    );
  }
}
