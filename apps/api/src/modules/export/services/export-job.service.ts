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
import {
  ExportJobType,
  ExportFormat,
  ExportJobStatus,
  CreateExportJobDto,
  ExportJobQueryDto,
  ExportJobResponse,
} from '../dto/export.dto';

@Injectable()
export class ExportJobService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly minioService: MinioService,
    private readonly techEventLogService: TechEventLogService,
    @InjectQueue(QUEUE_NAMES.EXPORT) private readonly exportQueue: Queue,
  ) {}

  /**
   * Create export job (multi-tenant aware)
   */
  async createJob(
    talentId: string,
    dto: CreateExportJobDto,
    context: RequestContext,
  ): Promise<ExportJobResponse> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get talent's profile store using raw SQL
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_store_id: string | null;
    }>>(`
      SELECT id, profile_store_id FROM "${schema}".talent WHERE id = $1::uuid
    `, talentId);

    if (!talents.length || !talents[0].profile_store_id) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid talent or no profile store configured',
      });
    }
    const talent = talents[0];

    // Create job record using raw SQL
    const filters = {
      customerIds: dto.customerIds,
      tags: dto.tags,
      membershipClassCode: dto.membershipClassCode,
      includePii: dto.includePii,
      fields: dto.fields,
    };

    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      job_type: string;
      format: string;
      status: string;
      file_name: string | null;
      file_path: string | null;
      total_records: number;
      processed_records: number;
      expires_at: Date | null;
      created_at: Date;
      completed_at: Date | null;
    }>>(`
      INSERT INTO "${schema}".export_job (
        id, talent_id, profile_store_id, job_type, format, status, filters,
        total_records, processed_records, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb,
        0, 0, $7::uuid, NOW(), NOW()
      )
      RETURNING id, job_type, format, status, file_name, file_path, total_records, processed_records, expires_at, created_at, completed_at
    `,
      talentId,
      talent.profile_store_id,
      dto.jobType,
      dto.format || ExportFormat.CSV,
      ExportJobStatus.PENDING,
      JSON.stringify(filters),
      context.userId,
    );

    const job = jobs[0];

    // Queue for processing
    await this.exportQueue.add('process-export', {
      jobId: job.id,
      jobType: dto.jobType,
      talentId,
      profileStoreId: talent.profile_store_id,
      format: dto.format || ExportFormat.CSV,
      filters,
      tenantSchema: schema,
    });

    // Log event
    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_STARTED,
      scope: 'export',
      severity: LogSeverity.INFO,
      traceId: job.id,
      payload: {
        job_id: job.id,
        job_type: dto.jobType,
        format: dto.format,
        talent_id: talentId,
      },
    }, context);

    return this.formatJobResponse(job);
  }

  /**
   * Get export job by ID (multi-tenant aware)
   */
  async findById(jobId: string, context: RequestContext): Promise<ExportJobResponse> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      job_type: string;
      format: string;
      status: string;
      file_name: string | null;
      file_path: string | null;
      total_records: number;
      processed_records: number;
      expires_at: Date | null;
      created_at: Date;
      completed_at: Date | null;
    }>>(`
      SELECT id, job_type, format, status, file_name, file_path, total_records, processed_records, expires_at, created_at, completed_at
      FROM "${schema}".export_job WHERE id = $1::uuid
    `, jobId);

    if (!jobs.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }

    return this.formatJobResponse(jobs[0]);
  }

  /**
   * Get export jobs list (multi-tenant aware)
   */
  async findMany(
    talentId: string,
    query: ExportJobQueryDto,
    context: RequestContext,
  ): Promise<{ items: ExportJobResponse[]; total: number }> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;
    const { status, page = 1, pageSize = 20 } = query;
    const pagination = this.databaseService.buildPagination(page, pageSize);

    // Get talent's profile store using raw SQL
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_store_id: string | null;
    }>>(`
      SELECT id, profile_store_id FROM "${schema}".talent WHERE id = $1::uuid
    `, talentId);

    if (!talents.length || !talents[0].profile_store_id) {
      return { items: [], total: 0 };
    }
    const profileStoreId = talents[0].profile_store_id;

    // Build where conditions
    const conditions: string[] = ['profile_store_id = $1::uuid'];
    const params: unknown[] = [profileStoreId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Query jobs using raw SQL
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      job_type: string;
      format: string;
      status: string;
      file_name: string | null;
      file_path: string | null;
      total_records: number;
      processed_records: number;
      expires_at: Date | null;
      created_at: Date;
      completed_at: Date | null;
    }>>(`
      SELECT id, job_type, format, status, file_name, file_path, total_records, processed_records, expires_at, created_at, completed_at
      FROM "${schema}".export_job
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);

    // Count total
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${schema}".export_job WHERE ${whereClause}
    `, ...params);
    const total = Number(totalResult[0]?.count || 0);

    return {
      items: items.map((job) => this.formatJobResponse(job)),
      total,
    };
  }

  /**
   * Get download URL for completed export (multi-tenant aware)
   */
  async getDownloadUrl(jobId: string, context: RequestContext): Promise<string> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      file_path: string | null;
    }>>(`
      SELECT id, status, file_path FROM "${schema}".export_job WHERE id = $1::uuid
    `, jobId);

    if (!jobs.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }
    const job = jobs[0];

    if (job.status !== ExportJobStatus.SUCCESS || !job.file_path) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Export not ready for download',
      });
    }

    // Generate presigned URL (valid for 1 hour)
    const url = await this.minioService.getPresignedUrl('temp-reports', job.file_path, 3600);
    return url;
  }

  /**
   * Cancel export job (multi-tenant aware)
   */
  async cancelJob(jobId: string, context: RequestContext): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
    }>>(`
      SELECT id, status FROM "${schema}".export_job WHERE id = $1::uuid
    `, jobId);

    if (!jobs.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Export job not found',
      });
    }
    const job = jobs[0];

    if (job.status !== ExportJobStatus.PENDING && job.status !== ExportJobStatus.RUNNING) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only cancel pending or running jobs',
      });
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${schema}".export_job
      SET status = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2::uuid
    `, ExportJobStatus.CANCELLED, jobId);
  }

  /**
   * Update job progress (called by worker) - needs tenantSchema from job data
   */
  async updateProgress(
    jobId: string,
    totalRecords: number,
    processedRecords: number,
    tenantSchema: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".export_job
      SET total_records = $1, processed_records = $2, status = $3, started_at = COALESCE(started_at, NOW()), updated_at = NOW()
      WHERE id = $4::uuid
    `, totalRecords, processedRecords, ExportJobStatus.RUNNING, jobId);
  }

  /**
   * Complete job (called by worker) - needs tenantSchema from job data
   */
  async completeJob(
    jobId: string,
    filePath: string,
    fileName: string,
    totalRecords: number,
    tenantSchema: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".export_job
      SET status = $1, file_path = $2, file_name = $3, total_records = $4, processed_records = $4,
          completed_at = NOW(), expires_at = $5::timestamptz, updated_at = NOW()
      WHERE id = $6::uuid
    `, ExportJobStatus.SUCCESS, filePath, fileName, totalRecords, expiresAt, jobId);

    // Log completion
    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_COMPLETED,
      scope: 'export',
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
   * Mark job as failed (called by worker) - needs tenantSchema from job data
   */
  async failJob(jobId: string, errorMessage: string, tenantSchema: string): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".export_job
      SET status = $1, error_message = $2, completed_at = NOW(), updated_at = NOW()
      WHERE id = $3::uuid
    `, ExportJobStatus.FAILED, errorMessage, jobId);

    // Log failure
    await this.techEventLogService.log({
      eventType: TechEventType.EXPORT_JOB_FAILED,
      scope: 'export',
      severity: LogSeverity.ERROR,
      traceId: jobId,
      payload: {
        job_id: jobId,
        error: errorMessage,
      },
    });
  }

  /**
   * Format job response
   */
  private formatJobResponse(job: {
    id: string;
    job_type: string;
    format: string;
    status: string;
    file_name: string | null;
    file_path: string | null;
    total_records: number;
    processed_records: number;
    expires_at: Date | null;
    created_at: Date;
    completed_at: Date | null;
  }): ExportJobResponse {
    return {
      id: job.id,
      jobType: job.job_type as ExportJobType,
      format: job.format as ExportFormat,
      status: job.status as ExportJobStatus,
      fileName: job.file_name,
      totalRecords: job.total_records,
      processedRecords: job.processed_records,
      downloadUrl: job.status === ExportJobStatus.SUCCESS && job.file_path
        ? `/api/v1/exports/${job.id}/download`
        : null,
      expiresAt: job.expires_at?.toISOString() ?? null,
      createdAt: job.created_at.toISOString(),
      completedAt: job.completed_at?.toISOString() ?? null,
    };
  }
}
