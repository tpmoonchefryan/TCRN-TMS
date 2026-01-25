// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ErrorCodes, type RequestContext, LogSeverity, TechEventType } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { MinioService } from '../../minio';
import { TechEventLogService } from '../../log';
import { QUEUE_NAMES } from '../../queue';
import { ExportMessagesDto } from '../dto/marshmallow.dto';

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

@Injectable()
export class MarshmallowExportService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly minioService: MinioService,
    private readonly techEventLogService: TechEventLogService,
    @InjectQueue(QUEUE_NAMES.EXPORT) private readonly exportQueue: Queue,
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

    // Get talent's profile store (required for export_job table)
    const talents = await prisma.$queryRawUnsafe<Array<{ profileStoreId: string | null }>>(
      `SELECT profile_store_id as "profileStoreId" FROM "${tenantSchema}".talent WHERE id = $1::uuid`,
      talentId,
    );
    const talent = talents[0];
    
    // Use a default profile store ID if talent doesn't have one
    // For marshmallow exports, we don't really need it but the schema requires it
    const profileStoreId = talent?.profileStoreId || '00000000-0000-0000-0000-000000000000';

    // Create job record using raw SQL for multi-tenant support
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".export_job (
        id,
        talent_id,
        profile_store_id,
        job_type,
        format,
        status,
        filters,
        total_records,
        processed_records,
        created_at,
        created_by
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4,
        $5,
        $6,
        $7::jsonb,
        0,
        0,
        $8::timestamptz,
        $9::uuid
      )`,
      jobId,
      talentId,
      profileStoreId,
      'marshmallow_export',
      dto.format,
      MarshmallowExportStatus.PENDING,
      JSON.stringify({
        status: dto.status,
        startDate: dto.startDate,
        endDate: dto.endDate,
        includeRejected: dto.includeRejected,
      }),
      now,
      context.userId,
    );

    // Queue for processing
    await this.exportQueue.add('marshmallow-export', {
      jobId,
      talentId,
      tenantSchema,
      format: dto.format,
      filters: {
        status: dto.status,
        startDate: dto.startDate,
        endDate: dto.endDate,
        includeRejected: dto.includeRejected,
      },
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
    });

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
    tenantSchema: string,
  ): Promise<MarshmallowExportJobResponse> {
    const prisma = this.databaseService.getPrisma();

    const jobs = await prisma.$queryRawUnsafe<Array<{
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
    }>>(
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
      FROM "${tenantSchema}".export_job
      WHERE id = $1::uuid AND job_type = 'marshmallow_export'`,
      jobId,
    );

    const job = jobs[0];
    if (!job) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    return {
      id: job.id,
      status: job.status as MarshmallowExportStatus,
      format: job.format,
      fileName: job.fileName,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      downloadUrl: job.status === MarshmallowExportStatus.SUCCESS && job.filePath
        ? `/api/v1/talents/${jobId}/marshmallow/export/${jobId}/download`
        : null,
      expiresAt: job.expiresAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  /**
   * Get download URL for export
   */
  async getDownloadUrl(
    jobId: string,
    tenantSchema: string,
  ): Promise<string> {
    const prisma = this.databaseService.getPrisma();

    const jobs = await prisma.$queryRawUnsafe<Array<{
      status: string;
      filePath: string | null;
    }>>(
      `SELECT status, file_path as "filePath"
      FROM "${tenantSchema}".export_job
      WHERE id = $1::uuid AND job_type = 'marshmallow_export'`,
      jobId,
    );

    const job = jobs[0];
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
    const url = await this.minioService.getPresignedUrl('temp-reports', job.filePath, 3600);
    return url;
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

    await prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".export_job
      SET 
        status = $2,
        total_records = $3,
        processed_records = $4,
        started_at = COALESCE(started_at, NOW())
      WHERE id = $1::uuid`,
      jobId,
      MarshmallowExportStatus.RUNNING,
      totalRecords,
      processedRecords,
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

    await prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".export_job
      SET 
        status = $2,
        file_path = $3,
        file_name = $4,
        total_records = $5,
        processed_records = $5,
        completed_at = NOW(),
        expires_at = $6::timestamptz
      WHERE id = $1::uuid`,
      jobId,
      MarshmallowExportStatus.SUCCESS,
      filePath,
      fileName,
      totalRecords,
      expiresAt.toISOString(),
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

    await prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".export_job
      SET 
        status = $2,
        error_message = $3,
        completed_at = NOW()
      WHERE id = $1::uuid`,
      jobId,
      MarshmallowExportStatus.FAILED,
      errorMessage,
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
}
