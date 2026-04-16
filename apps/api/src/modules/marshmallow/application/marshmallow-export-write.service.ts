// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ErrorCodes, LogSeverity, type RequestContext, TechEventType } from '@tcrn/shared';
import type { Queue } from 'bullmq';

import { TechEventLogService } from '../../log';
import { QUEUE_NAMES } from '../../queue';
import {
  buildMarshmallowExportFilters,
  MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
  type MarshmallowExportJobCreateResponse,
  type MarshmallowExportJobData,
  MarshmallowExportStatus,
} from '../domain/marshmallow-export.policy';
import type { ExportMessagesDto } from '../dto/marshmallow.dto';
import { MarshmallowExportWriteRepository } from '../infrastructure/marshmallow-export-write.repository';

@Injectable()
export class MarshmallowExportWriteApplicationService {
  constructor(
    private readonly marshmallowExportWriteRepository: MarshmallowExportWriteRepository,
    private readonly techEventLogService: TechEventLogService,
    @InjectQueue(QUEUE_NAMES.MARSHMALLOW_EXPORT)
    private readonly marshmallowExportQueue: Queue,
  ) {}

  async createJob(
    talentId: string,
    dto: ExportMessagesDto,
    context: RequestContext,
  ): Promise<MarshmallowExportJobCreateResponse> {
    const talent = await this.marshmallowExportWriteRepository.findTalentForCreation(
      context.tenantSchema,
      talentId,
    );

    if (!talent) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid talent',
      });
    }

    const jobId = crypto.randomUUID();
    const filters = buildMarshmallowExportFilters(dto);
    const job = await this.marshmallowExportWriteRepository.createJob(context.tenantSchema, {
      jobId,
      talentId,
      format: dto.format,
      status: MarshmallowExportStatus.PENDING,
      filtersJson: JSON.stringify(filters),
      createdAt: new Date(),
      userId: context.userId ?? '',
    });

    await this.marshmallowExportQueue.add(MARSHMALLOW_EXPORT_QUEUE_JOB_NAME, {
      jobId: job.id,
      talentId,
      tenantSchema: context.tenantSchema,
      format: dto.format,
      filters,
    } satisfies MarshmallowExportJobData);

    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_STARTED,
      scope: 'marshmallow',
      severity: LogSeverity.INFO,
      traceId: job.id,
      payload: {
        job_id: job.id,
        talent_id: talentId,
        format: dto.format,
      },
    }, context);

    return {
      jobId: job.id,
      status: job.status,
    };
  }
}
