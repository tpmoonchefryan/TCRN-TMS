// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, LogSeverity, type RequestContext, TechEventType } from '@tcrn/shared';
import type { Queue } from 'bullmq';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { MinioService } from '../../minio';
import { QUEUE_NAMES } from '../../queue';
import { ExportMessagesDto } from '../dto/marshmallow.dto';

const MARSHMALLOW_EXPORT_QUEUE_JOB_NAME = 'marshmallow_export';
const CURRENT_MARSHMALLOW_EXPORT_TABLE = 'marshmallow_export_job';
const LEGACY_MARSHMALLOW_EXPORT_TABLE = 'export_job';

export enum MarshmallowExportStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface MarshmallowExportJobData {
  jobId: string;
  talentId: string;
  tenantSchema: string;
  format: 'csv' | 'json' | 'xlsx';
  filters: {
    status?: string[];
    startDate?: string;
    endDate?: string;
    includeRejected?: boolean;
  };
}

export interface MarshmallowExportJobResponse {
  id: string;
  status: MarshmallowExportStatus;
  format: string;
  fileName: string | null;
  totalRecords: number;
  processedRecords: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface MarshmallowExportJobRecord {
  id: string;
  status: string;
  format: string;
  fileName: string | null;
  filePath: string | null;
  totalRecords: number;
  processedRecords: number;
  expiresAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class MarshmallowExportService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly minioService: MinioService,
    private readonly techEventLogService: TechEventLogService,
    @InjectQueue(QUEUE_NAMES.MARSHMALLOW_EXPORT)
    private readonly marshmallowExportQueue: Queue,
  ) {}

  /**
   * Create marshmallow export job
   */
  async createExportJob(
    talentId: string,
    tenantSchema: string,
    dto: ExportMessagesDto,
    context: RequestContext,
  ): Promise<{ jobId: string; status: string }> {
    const prisma = this.databaseService.getPrisma();
    await this.ensureTalentExists(prisma, tenantSchema, talentId);

    // Create job record using raw SQL for multi-tenant support
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    const filters = this.buildFilters(dto);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".marshmallow_export_job (
        id,
        talent_id,
        format,
        status,
        filters,
        total_records,
        processed_records,
        created_at,
        updated_at,
        created_by
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5::jsonb,
        0,
        0,
        $6::timestamptz,
        $6::timestamptz,
        $7::uuid
      )`,
      jobId,
      talentId,
      dto.format,
      MarshmallowExportStatus.PENDING,
      JSON.stringify(filters),
      now,
      context.userId,
    );

    await this.marshmallowExportQueue.add(MARSHMALLOW_EXPORT_QUEUE_JOB_NAME, {
      jobId,
      talentId,
      tenantSchema,
      format: dto.format,
      filters,
    } as MarshmallowExportJobData);

    // Log event
    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_STARTED,
      scope: 'marshmallow',
      severity: LogSeverity.INFO,
      traceId: jobId,
      payload: {
        job_id: jobId,
        talent_id: talentId,
        format: dto.format,
      },
    }, context);

    return {
      jobId,
      status: MarshmallowExportStatus.PENDING,
    };
  }

  /**
   * Get export job status
   */
  async getExportJob(
    jobId: string,
    talentId: string,
    tenantSchema: string,
  ): Promise<MarshmallowExportJobResponse> {
    const prisma = this.databaseService.getPrisma();
    const job = await this.findJobRecord(prisma, tenantSchema, jobId);

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    return this.formatJobResponse(job, talentId);
  }

  /**
   * Get download URL for export
   */
  async getDownloadUrl(
    jobId: string,
    tenantSchema: string,
  ): Promise<string> {
    const prisma = this.databaseService.getPrisma();
    const job = await this.findJobRecord(prisma, tenantSchema, jobId);

    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    if (job.status !== MarshmallowExportStatus.SUCCESS || !job.filePath) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Export not ready for download',
      });
    }

    // Generate presigned URL (valid for 1 hour)
    return this.minioService.getPresignedUrl('temp-reports', job.filePath, 3600);
  }

  /**
   * Update job progress (called by worker)
   */
  async updateProgress(
    jobId: string,
    tenantSchema: string,
    totalRecords: number,
    processedRecords: number,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await this.executeJobUpdate(
      prisma,
      `UPDATE "${tenantSchema}".${CURRENT_MARSHMALLOW_EXPORT_TABLE}
       SET status = $1,
           total_records = $2,
           processed_records = $3,
           started_at = COALESCE(started_at, NOW()),
           updated_at = NOW()
       WHERE id = $4::uuid`,
      [
        MarshmallowExportStatus.RUNNING,
        totalRecords,
        processedRecords,
        jobId,
      ],
      `UPDATE "${tenantSchema}".${LEGACY_MARSHMALLOW_EXPORT_TABLE}
       SET status = $1,
           total_records = $2,
           processed_records = $3,
           started_at = COALESCE(started_at, NOW()),
           updated_at = NOW()
       WHERE id = $4::uuid
         AND job_type = $5`,
      [
        MarshmallowExportStatus.RUNNING,
        totalRecords,
        processedRecords,
        jobId,
        MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
      ],
    );
  }

  /**
   * Complete job (called by worker)
   */
  async completeJob(
    jobId: string,
    tenantSchema: string,
    filePath: string,
    fileName: string,
    totalRecords: number,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.executeJobUpdate(
      prisma,
      `UPDATE "${tenantSchema}".${CURRENT_MARSHMALLOW_EXPORT_TABLE}
       SET status = $1,
           file_path = $2,
           file_name = $3,
           total_records = $4,
           processed_records = $4,
           completed_at = NOW(),
           expires_at = $5::timestamptz,
           updated_at = NOW()
       WHERE id = $6::uuid`,
      [
        MarshmallowExportStatus.SUCCESS,
        filePath,
        fileName,
        totalRecords,
        expiresAt.toISOString(),
        jobId,
      ],
      `UPDATE "${tenantSchema}".${LEGACY_MARSHMALLOW_EXPORT_TABLE}
       SET status = $1,
           file_path = $2,
           file_name = $3,
           total_records = $4,
           processed_records = $4,
           completed_at = NOW(),
           expires_at = $5::timestamptz,
           updated_at = NOW()
       WHERE id = $6::uuid
         AND job_type = $7`,
      [
        MarshmallowExportStatus.SUCCESS,
        filePath,
        fileName,
        totalRecords,
        expiresAt.toISOString(),
        jobId,
        MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
      ],
    );

    // Log completion
    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_COMPLETED,
      scope: 'marshmallow',
      severity: LogSeverity.INFO,
      traceId: jobId,
      payload: {
        job_id: jobId,
        file_path: filePath,
        total_records: totalRecords,
      },
    });
  }

  /**
   * Mark job as failed (called by worker)
   */
  async failJob(
    jobId: string,
    tenantSchema: string,
    errorMessage: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await this.executeJobUpdate(
      prisma,
      `UPDATE "${tenantSchema}".${CURRENT_MARSHMALLOW_EXPORT_TABLE}
       SET status = $1,
           error_message = $2,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3::uuid`,
      [
        MarshmallowExportStatus.FAILED,
        errorMessage,
        jobId,
      ],
      `UPDATE "${tenantSchema}".${LEGACY_MARSHMALLOW_EXPORT_TABLE}
       SET status = $1,
           error_message = $2,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3::uuid
         AND job_type = $4`,
      [
        MarshmallowExportStatus.FAILED,
        errorMessage,
        jobId,
        MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
      ],
    );

    // Log failure
    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_FAILED,
      scope: 'marshmallow',
      severity: LogSeverity.ERROR,
      traceId: jobId,
      payload: {
        job_id: jobId,
        error: errorMessage,
      },
    });
  }

  private buildFilters(dto: ExportMessagesDto): MarshmallowExportJobData['filters'] {
    return {
      status: dto.status,
      startDate: dto.startDate,
      endDate: dto.endDate,
      includeRejected: dto.includeRejected,
    };
  }

  private async ensureTalentExists(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    talentId: string,
  ): Promise<void> {
    const talents = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${tenantSchema}".talent WHERE id = $1::uuid`,
      talentId,
    );

    if (talents.length > 0) {
      return;
    }

    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Invalid talent',
    });
  }

  private async findJobRecord(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    jobId: string,
  ): Promise<MarshmallowExportJobRecord | null> {
    const currentJobs = await prisma.$queryRawUnsafe<Array<MarshmallowExportJobRecord>>(
      `SELECT
         id,
         status,
         format,
         file_name as "fileName",
         file_path as "filePath",
         total_records as "totalRecords",
         processed_records as "processedRecords",
         expires_at as "expiresAt",
         created_at as "createdAt",
         completed_at as "completedAt"
       FROM "${tenantSchema}".${CURRENT_MARSHMALLOW_EXPORT_TABLE}
       WHERE id = $1::uuid`,
      jobId,
    );

    if (currentJobs[0]) {
      return currentJobs[0];
    }

    const legacyJobs = await prisma.$queryRawUnsafe<Array<MarshmallowExportJobRecord>>(
      `SELECT
         id,
         status,
         format,
         file_name as "fileName",
         file_path as "filePath",
         total_records as "totalRecords",
         processed_records as "processedRecords",
         expires_at as "expiresAt",
         created_at as "createdAt",
         completed_at as "completedAt"
       FROM "${tenantSchema}".${LEGACY_MARSHMALLOW_EXPORT_TABLE}
       WHERE id = $1::uuid
         AND job_type = $2`,
      jobId,
      MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
    );

    return legacyJobs[0] ?? null;
  }

  private async executeJobUpdate(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    currentSql: string,
    currentParams: unknown[],
    legacySql: string,
    legacyParams: unknown[],
  ): Promise<void> {
    const currentUpdated = await prisma.$executeRawUnsafe(currentSql, ...currentParams);
    if (currentUpdated > 0) {
      return;
    }

    await prisma.$executeRawUnsafe(legacySql, ...legacyParams);
  }

  private formatJobResponse(
    job: MarshmallowExportJobRecord,
    talentId: string,
  ): MarshmallowExportJobResponse {
    return {
      id: job.id,
      status: job.status as MarshmallowExportStatus,
      format: job.format,
      fileName: job.fileName,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      downloadUrl: job.status === MarshmallowExportStatus.SUCCESS && job.filePath
        ? `/api/v1/talents/${talentId}/marshmallow/export/${job.id}/download`
        : null,
      expiresAt: job.expiresAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }
}
