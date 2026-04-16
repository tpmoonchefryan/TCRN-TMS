// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import {
  type ImportJobPagination,
  mapImportErrors,
  mapImportJobResponse,
} from '../domain/import-job.policy';
import { type ImportJobQueryDto } from '../dto/import.dto';
import { ImportJobReadRepository } from '../infrastructure/import-job-read.repository';

@Injectable()
export class ImportJobReadApplicationService {
  constructor(
    private readonly importJobReadRepository: ImportJobReadRepository,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
  ) {}

  async findById(jobId: string, talentId: string, context: RequestContext) {
    const job = await this.importJobReadRepository.findById(
      context.tenantSchema,
      jobId,
      talentId,
    );

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Import job not found',
      });
    }

    return mapImportJobResponse(job);
  }

  async findMany(
    talentId: string,
    query: ImportJobQueryDto,
    context: RequestContext,
  ): Promise<{ items: ReturnType<typeof mapImportJobResponse>[]; total: number }> {
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
      this.importJobReadRepository.findMany(
        context.tenantSchema,
        {
          profileStoreId: archiveTarget.profileStoreId,
          status: query.status,
        },
        pagination,
      ),
      this.importJobReadRepository.countMany(context.tenantSchema, {
        profileStoreId: archiveTarget.profileStoreId,
        status: query.status,
      }),
    ]);

    return {
      items: items.map((job) => mapImportJobResponse(job)),
      total,
    };
  }

  async getErrors(jobId: string, talentId: string, context: RequestContext) {
    const errors = await this.importJobReadRepository.getErrors(
      context.tenantSchema,
      jobId,
      talentId,
    );

    return mapImportErrors(errors);
  }

  private buildPagination(page: number = 1, pageSize: number = 20): ImportJobPagination {
    return {
      take: pageSize,
      skip: (page - 1) * pageSize,
    };
  }
}
