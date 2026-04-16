// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { BUCKETS, MinioService } from '../../minio';
import {
  canDownloadExportJob,
  EXPORT_JOB_DOWNLOAD_URL_EXPIRY_SECONDS,
  type ExportJobPagination,
  mapExportJobResponse,
} from '../domain/export-job.policy';
import type { ExportJobQueryDto } from '../dto/export.dto';
import { ExportJobReadRepository } from '../infrastructure/export-job-read.repository';

@Injectable()
export class ExportJobReadApplicationService {
  constructor(
    private readonly exportJobReadRepository: ExportJobReadRepository,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly minioService: MinioService,
  ) {}

  async findById(jobId: string, context: RequestContext) {
    const job = await this.exportJobReadRepository.findById(context.tenantSchema, jobId);

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    return mapExportJobResponse(job);
  }

  async findMany(
    talentId: string,
    query: ExportJobQueryDto,
    context: RequestContext,
  ): Promise<{ items: ReturnType<typeof mapExportJobResponse>[]; total: number }> {
    let archiveTarget: { profileStoreId: string };
    try {
      archiveTarget =
        await this.customerArchiveAccessService.requireTalentArchiveTarget(
          talentId,
          context,
        );
    } catch {
      return { items: [], total: 0 };
    }

    const pagination = this.buildPagination(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.exportJobReadRepository.findMany(
        context.tenantSchema,
        {
          profileStoreId: archiveTarget.profileStoreId,
          status: query.status,
        },
        pagination,
      ),
      this.exportJobReadRepository.countMany(context.tenantSchema, {
        profileStoreId: archiveTarget.profileStoreId,
        status: query.status,
      }),
    ]);

    return {
      items: items.map((job) => mapExportJobResponse(job)),
      total,
    };
  }

  async getDownloadUrl(jobId: string, context: RequestContext): Promise<string> {
    const job = await this.exportJobReadRepository.findDownloadTarget(context.tenantSchema, jobId);

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    if (!canDownloadExportJob(job)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Export not ready for download',
      });
    }

    const filePath = job.file_path;
    if (!filePath) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Export not ready for download',
      });
    }

    return this.minioService.getPresignedUrl(
      BUCKETS.TEMP_REPORTS,
      filePath,
      EXPORT_JOB_DOWNLOAD_URL_EXPIRY_SECONDS,
    );
  }

  private buildPagination(page: number = 1, pageSize: number = 20): ExportJobPagination {
    return {
      take: pageSize,
      skip: (page - 1) * pageSize,
    };
  }
}
