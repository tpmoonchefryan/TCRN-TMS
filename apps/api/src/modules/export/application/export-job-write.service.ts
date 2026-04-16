// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, LogSeverity, type RequestContext, TechEventType } from '@tcrn/shared';
import type { Queue } from 'bullmq';

import { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { TechEventLogService } from '../../log';
import { QUEUE_NAMES } from '../../queue';
import {
  buildExportJobFilters,
  GENERIC_EXPORT_JOB_TYPE,
  getRequestedExportFormat,
  mapExportJobResponse,
} from '../domain/export-job.policy';
import { canCancelExportJob } from '../domain/export-job-state.policy';
import {
  type CreateExportJobDto,
  type ExportJobResponse,
  ExportJobStatus,
} from '../dto/export.dto';
import { ExportJobWriteRepository } from '../infrastructure/export-job-write.repository';

@Injectable()
export class ExportJobWriteApplicationService {
  constructor(
    private readonly exportJobWriteRepository: ExportJobWriteRepository,
    private readonly techEventLogService: TechEventLogService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    @InjectQueue(QUEUE_NAMES.EXPORT)
    private readonly exportQueue: Queue,
  ) {}

  async createJob(
    talentId: string,
    dto: CreateExportJobDto,
    context: RequestContext,
  ): Promise<ExportJobResponse> {
    if (dto.jobType !== GENERIC_EXPORT_JOB_TYPE) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Generic /exports currently supports customer_export only',
      });
    }

    const archiveTarget =
      await this.customerArchiveAccessService.requireTalentArchiveTarget(
        talentId,
        context,
        {
          missingArchiveMessage: 'Invalid talent or no profile store configured',
        },
      );

    const format = getRequestedExportFormat(dto.format);
    const filters = buildExportJobFilters({
      customerIds: dto.customerIds,
      tags: dto.tags,
      membershipClassCode: dto.membershipClassCode,
      fields: dto.fields,
    });

    const job = await this.exportJobWriteRepository.createJob(context.tenantSchema, {
      talentId,
      profileStoreId: archiveTarget.profileStoreId,
      jobType: dto.jobType,
      format,
      status: ExportJobStatus.PENDING,
      filtersJson: JSON.stringify(filters),
      userId: context.userId,
    });

    await this.exportQueue.add(dto.jobType, {
      jobId: job.id,
      jobType: dto.jobType,
      talentId,
      profileStoreId: archiveTarget.profileStoreId,
      format,
      filters,
      tenantSchema: context.tenantSchema,
    });

    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_STARTED,
      scope: 'export',
      severity: LogSeverity.INFO,
      traceId: job.id,
      payload: {
        job_id: job.id,
        job_type: dto.jobType,
        format,
        talent_id: talentId,
      },
    }, context);

    return mapExportJobResponse(job);
  }

  async cancelJob(jobId: string, context: RequestContext): Promise<void> {
    const job = await this.exportJobWriteRepository.findCancelableJob(
      context.tenantSchema,
      jobId,
    );

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    if (!canCancelExportJob(job.status)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only cancel pending or running jobs',
      });
    }

    await this.exportJobWriteRepository.cancelJob(context.tenantSchema, jobId);
  }
}
