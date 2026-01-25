// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LogSeverity } from '@tcrn/shared';
import { ErrorCodes, TechEventType, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { MinioService, BUCKETS } from '../../minio';
import {
  ReportType,
  ReportJobStatus,
  ReportJobListQueryDto,
  MfrFilterCriteriaDto,
} from '../dto/report.dto';

import { ReportJobStateService } from './report-job-state.service';

@Injectable()
export class ReportJobService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stateService: ReportJobStateService,
    private readonly techEventLog: TechEventLogService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Create a new report job (multi-tenant aware)
   */
  async create(
    reportType: ReportType,
    talentId: string,
    filters: MfrFilterCriteriaDto,
    format: string,
    estimatedRows: number,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Validate row limit
    if (estimatedRows > 50000) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Report cannot exceed 50,000 rows. Please narrow your filter criteria.',
      });
    }

    // Get talent with profile store using raw SQL
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      subsidiary_id: string | null;
      profile_store_id: string | null;
    }>>(`
      SELECT id, subsidiary_id, profile_store_id
      FROM "${schema}".talent
      WHERE id = $1::uuid
    `, talentId);

    if (!talents.length || !talents[0].profile_store_id) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found or has no profile store',
      });
    }
    const talent = talents[0];

    // Create job using raw SQL
    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      created_at: Date;
    }>>(`
      INSERT INTO "${schema}".report_job (
        id, talent_id, profile_store_id, report_type, filter_criteria, format,
        status, total_rows, queued_at, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::jsonb, $5,
        $6, $7, NOW(), $8::uuid, NOW(), NOW()
      )
      RETURNING id, status, created_at
    `,
      talentId,
      talent.profile_store_id,
      reportType,
      JSON.stringify(filters),
      format,
      ReportJobStatus.PENDING,
      estimatedRows,
      context.userId,
    );

    const job = jobs[0];

    // Log event
    await this.techEventLog.log({
      eventType: TechEventType.SYSTEM_INFO,
      scope: 'export',
      severity: LogSeverity.INFO,
      traceId: job.id,
      payload: {
        action: 'report_job_created',
        jobId: job.id,
        reportType,
        estimatedRows,
        filters,
      },
    }, context);

    return {
      jobId: job.id,
      status: job.status,
      estimatedRows,
      createdAt: job.created_at.toISOString(),
    };
  }

  /**
   * Get job by ID (multi-tenant aware)
   */
  async findById(jobId: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Query job with creator using raw SQL
    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      report_type: string;
      status: string;
      total_rows: number;
      processed_rows: number;
      progress_percentage: number;
      error_code: string | null;
      error_message: string | null;
      file_name: string | null;
      file_size_bytes: bigint | null;
      queued_at: Date | null;
      started_at: Date | null;
      completed_at: Date | null;
      expires_at: Date | null;
      created_at: Date;
      creator_id: string;
      creator_username: string;
    }>>(`
      SELECT 
        rj.id, rj.report_type, rj.status, rj.total_rows, rj.processed_rows, rj.progress_percentage,
        rj.error_code, rj.error_message, rj.file_name, rj.file_size_bytes,
        rj.queued_at, rj.started_at, rj.completed_at, rj.expires_at, rj.created_at,
        su.id as creator_id, su.username as creator_username
      FROM "${schema}".report_job rj
      JOIN "${schema}".system_user su ON su.id = rj.created_by
      WHERE rj.id = $1::uuid AND rj.talent_id = $2::uuid
    `, jobId, talentId);

    if (!jobs.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Report job not found',
      });
    }
    const job = jobs[0];

    return {
      id: job.id,
      reportType: job.report_type,
      status: job.status,
      progress: {
        totalRows: job.total_rows,
        processedRows: job.processed_rows,
        percentage: job.progress_percentage,
      },
      error: job.error_code
        ? { code: job.error_code, message: job.error_message || '' }
        : undefined,
      fileName: job.file_name,
      fileSizeBytes: job.file_size_bytes ? Number(job.file_size_bytes) : null,
      queuedAt: job.queued_at?.toISOString() ?? null,
      startedAt: job.started_at?.toISOString() ?? null,
      completedAt: job.completed_at?.toISOString() ?? null,
      expiresAt: job.expires_at?.toISOString() ?? null,
      createdAt: job.created_at.toISOString(),
      createdBy: {
        id: job.creator_id,
        username: job.creator_username,
      },
    };
  }

  /**
   * List jobs for talent (multi-tenant aware)
   */
  async findMany(query: ReportJobListQueryDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;
    const { talentId, status, createdFrom, createdTo, page = 1, pageSize = 20 } = query;

    const pagination = this.databaseService.buildPagination(page, pageSize);

    // Build where conditions
    const conditions: string[] = ['talent_id = $1::uuid'];
    const params: unknown[] = [talentId];
    let paramIndex = 2;

    if (status) {
      const statuses = status.split(',');
      conditions.push(`status = ANY($${paramIndex}::text[])`);
      params.push(statuses);
      paramIndex++;
    }

    if (createdFrom) {
      conditions.push(`created_at >= $${paramIndex}::timestamptz`);
      params.push(new Date(createdFrom));
      paramIndex++;
    }

    if (createdTo) {
      conditions.push(`created_at <= $${paramIndex}::timestamptz`);
      params.push(new Date(createdTo));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Query jobs using raw SQL
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      report_type: string;
      status: string;
      total_rows: number;
      file_name: string | null;
      created_at: Date;
      completed_at: Date | null;
      expires_at: Date | null;
    }>>(`
      SELECT id, report_type, status, total_rows, file_name, created_at, completed_at, expires_at
      FROM "${schema}".report_job
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);

    // Count total
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${schema}".report_job WHERE ${whereClause}
    `, ...params);
    const total = Number(totalResult[0]?.count || 0);

    return {
      items: items.map((job) => ({
        id: job.id,
        reportType: job.report_type,
        status: job.status,
        totalRows: job.total_rows,
        fileName: job.file_name,
        createdAt: job.created_at.toISOString(),
        completedAt: job.completed_at?.toISOString() ?? null,
        expiresAt: job.expires_at?.toISOString() ?? null,
      })),
      total,
    };
  }

  /**
   * Cancel a job (multi-tenant aware)
   */
  async cancel(jobId: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get job using raw SQL
    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
    }>>(`
      SELECT id, status FROM "${schema}".report_job
      WHERE id = $1::uuid AND talent_id = $2::uuid
    `, jobId, talentId);

    if (!jobs.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Report job not found',
      });
    }
    const job = jobs[0];

    const status = job.status as ReportJobStatus;
    if (status !== ReportJobStatus.PENDING && status !== ReportJobStatus.FAILED) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only cancel pending or failed jobs',
      });
    }

    await this.stateService.transition(jobId, ReportJobStatus.CANCELLED);

    // Record change log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'cancel', 'report_job', $1::uuid, 'Report job', $2::jsonb, $3::uuid, $4::inet, NOW()
      )
    `,
      jobId,
      JSON.stringify({
        old: { status: job.status },
        new: { status: ReportJobStatus.CANCELLED },
      }),
      context.userId,
      context.ipAddress || '0.0.0.0',
    );

    return { id: jobId, status: ReportJobStatus.CANCELLED };
  }

  /**
   * Get download URL (multi-tenant aware)
   */
  async getDownloadUrl(jobId: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get job using raw SQL
    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      file_path: string | null;
      file_name: string | null;
    }>>(`
      SELECT id, status, file_path, file_name FROM "${schema}".report_job
      WHERE id = $1::uuid AND talent_id = $2::uuid
    `, jobId, talentId);

    if (!jobs.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Report job not found',
      });
    }
    const job = jobs[0];

    const canDownload = await this.stateService.canDownload(jobId);
    if (!canDownload) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Report is not available for download',
      });
    }

    if (!job.file_path) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Report file not found',
      });
    }

    // Mark as consumed on first download
    if (job.status === ReportJobStatus.SUCCESS) {
      await this.stateService.transition(jobId, ReportJobStatus.CONSUMED);
    }

    // Generate presigned URL (5 minutes expiry)
    const expirySeconds = 300;
    const downloadUrl = await this.minioService.getPresignedUrl(
      BUCKETS.TEMP_REPORTS,
      job.file_path,
      expirySeconds,
    );

    // Log download event
    await this.techEventLog.log({
      eventType: TechEventType.SYSTEM_INFO,
      scope: 'export',
      severity: LogSeverity.INFO,
      traceId: jobId,
      payload: {
        action: 'report_downloaded',
        jobId,
        fileName: job.file_name,
      },
    }, context);

    return {
      downloadUrl,
      expiresIn: expirySeconds,
      fileName: job.file_name,
    };
  }
}
