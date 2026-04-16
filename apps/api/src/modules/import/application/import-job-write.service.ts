// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, LogSeverity, type RequestContext, TechEventType } from '@tcrn/shared';

import { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { TechEventLogService } from '../../log';
import { type CreatedImportJobResult } from '../domain/import-job.policy';
import { canCancelImportJob } from '../domain/import-job-state.policy';
import { ImportJobStatus, type ImportJobType } from '../dto/import.dto';
import { ImportJobWriteRepository } from '../infrastructure/import-job-write.repository';

@Injectable()
export class ImportJobWriteApplicationService {
  constructor(
    private readonly importJobWriteRepository: ImportJobWriteRepository,
    private readonly techEventLogService: TechEventLogService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
  ) {}

  async createJob(
    jobType: ImportJobType,
    talentId: string,
    fileName: string,
    fileSize: number,
    totalRows: number,
    consumerCode: string | undefined,
    context: RequestContext,
  ): Promise<CreatedImportJobResult> {
    const archiveTarget =
      await this.customerArchiveAccessService.requireTalentArchiveTarget(
        talentId,
        context,
        {
          missingArchiveMessage: 'Invalid talent or no profile store configured',
        },
      );

    const consumer = consumerCode
      ? await this.importJobWriteRepository.findConsumerByCode(context.tenantSchema, consumerCode)
      : null;

    const job = await this.importJobWriteRepository.createJob(context.tenantSchema, {
      talentId,
      profileStoreId: archiveTarget.profileStoreId,
      jobType,
      status: ImportJobStatus.PENDING,
      fileName,
      fileSize,
      consumerId: consumer?.id ?? null,
      totalRows,
      userId: context.userId,
    });

    await this.techEventLogService.log({
      eventType: TechEventType.IMPORT_JOB_STARTED,
      scope: 'import',
      severity: LogSeverity.INFO,
      traceId: job.id,
      payload: {
        job_id: job.id,
        job_type: jobType,
        file_name: fileName,
        total_rows: totalRows,
        talent_id: talentId,
      },
    }, context);

    return {
      id: job.id,
      status: job.status as ImportJobStatus,
      fileName: job.file_name,
      totalRows: job.total_rows,
      createdAt: job.created_at,
      profileStoreId: archiveTarget.profileStoreId,
    };
  }

  async cancelJob(jobId: string, talentId: string, context: RequestContext): Promise<void> {
    const job = await this.importJobWriteRepository.findCancelableJob(
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

    if (!canCancelImportJob(job.status)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only cancel pending or running jobs',
      });
    }

    await this.importJobWriteRepository.cancelJob(context.tenantSchema, jobId);
  }
}
