// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LogSeverity } from '@tcrn/shared';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';
import { TechEventType } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { MinioService } from '../../minio';
import {
  ImportJobQueryDto,
  ImportJobResponse,
  ImportJobStatus,
  ImportJobType,
  ImportProgress,
} from '../dto/import.dto';

@Injectable()
export class ImportJobService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly minioService: MinioService,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  /**
   * Create import job (multi-tenant aware)
   */
  async createJob(
    jobType: ImportJobType,
    talentId: string,
    fileName: string,
    fileSize: number,
    totalRows: number,
    consumerCode: string | undefined,
    context: RequestContext,
  ) {
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

    // Get consumer if provided using raw SQL
    let consumerId: string | null = null;
    if (consumerCode) {
      const consumers = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${schema}".consumer WHERE code = $1 AND is_active = true
      `, consumerCode);
      if (consumers.length) {
        consumerId = consumers[0].id;
      }
    }

    // Create job using raw SQL
    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      job_type: string;
      status: string;
      file_name: string;
      total_rows: number;
      processed_rows: number;
      success_rows: number;
      failed_rows: number;
      warning_rows: number;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
      created_by: string | null;
    }>>(`
      INSERT INTO "${schema}".import_job (
        id, talent_id, profile_store_id, job_type, status, file_name, file_size, consumer_id,
        total_rows, processed_rows, success_rows, failed_rows, warning_rows, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid,
        $8, 0, 0, 0, 0, $9::uuid, NOW(), NOW()
      )
      RETURNING id, job_type, status, file_name, total_rows, processed_rows, success_rows, failed_rows, warning_rows, started_at, completed_at, created_at, created_by
    `,
      talentId,
      talent.profile_store_id,
      jobType,
      ImportJobStatus.PENDING,
      fileName,
      fileSize,
      consumerId,
      totalRows,
      context.userId,
    );

    const job = jobs[0];

    // Log event
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

    // Return camelCase formatted result
    return {
      id: job.id,
      status: job.status,
      fileName: job.file_name,
      totalRows: job.total_rows,
      createdAt: job.created_at,
    };
  }

  /**
   * Get import job by ID (multi-tenant aware)
   */
  async findById(jobId: string, context: RequestContext): Promise<ImportJobResponse> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      job_type: string;
      status: string;
      file_name: string;
      total_rows: number;
      processed_rows: number;
      success_rows: number;
      failed_rows: number;
      warning_rows: number;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
      created_by: string | null;
      consumer_code: string | null;
    }>>(`
      SELECT ij.id, ij.job_type, ij.status, ij.file_name, ij.total_rows, ij.processed_rows,
             ij.success_rows, ij.failed_rows, ij.warning_rows, ij.started_at, ij.completed_at,
             ij.created_at, ij.created_by, c.code as consumer_code
      FROM "${schema}".import_job ij
      LEFT JOIN "${schema}".consumer c ON c.id = ij.consumer_id
      WHERE ij.id = $1::uuid
    `, jobId);

    if (!jobs.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Import job not found',
      });
    }

    return this.formatJobResponse(jobs[0]);
  }

  /**
   * Get import jobs list (multi-tenant aware)
   */
  async findMany(
    talentId: string,
    query: ImportJobQueryDto,
    context: RequestContext,
  ): Promise<{ items: ImportJobResponse[]; total: number }> {
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
    const conditions: string[] = ['ij.profile_store_id = $1::uuid'];
    const params: unknown[] = [profileStoreId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`ij.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Query jobs using raw SQL
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      job_type: string;
      status: string;
      file_name: string;
      total_rows: number;
      processed_rows: number;
      success_rows: number;
      failed_rows: number;
      warning_rows: number;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
      created_by: string | null;
      consumer_code: string | null;
    }>>(`
      SELECT ij.id, ij.job_type, ij.status, ij.file_name, ij.total_rows, ij.processed_rows,
             ij.success_rows, ij.failed_rows, ij.warning_rows, ij.started_at, ij.completed_at,
             ij.created_at, ij.created_by, c.code as consumer_code
      FROM "${schema}".import_job ij
      LEFT JOIN "${schema}".consumer c ON c.id = ij.consumer_id
      WHERE ${whereClause}
      ORDER BY ij.created_at DESC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);

    // Count total
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${schema}".import_job ij WHERE ${whereClause}
    `, ...params);
    const total = Number(totalResult[0]?.count || 0);

    return {
      items: items.map((job) => this.formatJobResponse(job)),
      total,
    };
  }

  /**
   * Update job progress (called by worker) - needs tenantSchema from job data
   */
  async updateProgress(
    jobId: string,
    processedRows: number,
    successRows: number,
    failedRows: number,
    warningRows: number,
    tenantSchema: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".import_job
      SET processed_rows = $1, success_rows = $2, failed_rows = $3, warning_rows = $4,
          status = $5, started_at = COALESCE(started_at, NOW()), updated_at = NOW()
      WHERE id = $6::uuid
    `, processedRows, successRows, failedRows, warningRows, ImportJobStatus.RUNNING, jobId);
  }

  /**
   * Complete job (called by worker) - needs tenantSchema from job data
   */
  async completeJob(
    jobId: string,
    successRows: number,
    failedRows: number,
    warningRows: number,
    tenantSchema: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    const totalProcessed = successRows + failedRows;
    let status: ImportJobStatus;

    if (failedRows === 0) {
      status = ImportJobStatus.SUCCESS;
    } else if (successRows === 0) {
      status = ImportJobStatus.FAILED;
    } else {
      status = ImportJobStatus.PARTIAL;
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".import_job
      SET status = $1, processed_rows = $2, success_rows = $3, failed_rows = $4, warning_rows = $5,
          completed_at = NOW(), updated_at = NOW()
      WHERE id = $6::uuid
    `, status, totalProcessed, successRows, failedRows, warningRows, jobId);

    // Log completion
    await this.techEventLogService.log({
      eventType: TechEventType.IMPORT_JOB_COMPLETED,
      scope: 'import',
      severity: status === ImportJobStatus.FAILED ? LogSeverity.ERROR : LogSeverity.INFO,
      traceId: jobId,
      payload: {
        job_id: jobId,
        status,
        success_rows: successRows,
        failed_rows: failedRows,
        warning_rows: warningRows,
      },
    });
  }

  /**
   * Cancel job (multi-tenant aware)
   */
  async cancelJob(jobId: string, context: RequestContext): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
    }>>(`
      SELECT id, status FROM "${schema}".import_job WHERE id = $1::uuid
    `, jobId);

    if (!jobs.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Import job not found',
      });
    }
    const job = jobs[0];

    if (job.status !== ImportJobStatus.PENDING && job.status !== ImportJobStatus.RUNNING) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only cancel pending or running jobs',
      });
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${schema}".import_job
      SET status = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2::uuid
    `, ImportJobStatus.CANCELLED, jobId);
  }

  /**
   * Add error to job (called by worker) - needs tenantSchema from job data
   */
  async addError(
    jobId: string,
    rowNumber: number,
    errorCode: string,
    errorMessage: string,
    originalData: string,
    tenantSchema: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".import_job_error (
        id, import_job_id, row_number, error_code, error_message, original_data, created_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2, $3, $4, $5, NOW()
      )
    `, jobId, rowNumber, errorCode, errorMessage, originalData);
  }

  /**
   * Get job errors (multi-tenant aware)
   */
  async getErrors(jobId: string, context: RequestContext): Promise<Array<{
    rowNumber: number;
    errorCode: string;
    errorMessage: string;
    originalData: string;
  }>> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    const errors = await prisma.$queryRawUnsafe<Array<{
      row_number: number;
      error_code: string;
      error_message: string;
      original_data: string;
    }>>(`
      SELECT row_number, error_code, error_message, original_data
      FROM "${schema}".import_job_error
      WHERE import_job_id = $1::uuid
      ORDER BY row_number ASC
    `, jobId);

    return errors.map((e) => ({
      rowNumber: e.row_number,
      errorCode: e.error_code,
      errorMessage: e.error_message,
      originalData: e.original_data,
    }));
  }

  /**
   * Format job response
   */
  private formatJobResponse(job: {
    id: string;
    job_type: string;
    status: string;
    file_name: string;
    total_rows: number;
    processed_rows: number;
    success_rows: number;
    failed_rows: number;
    warning_rows: number;
    started_at: Date | null;
    completed_at: Date | null;
    created_at: Date;
    created_by: string | null;
    consumer_code?: string | null;
  }): ImportJobResponse {
    const progress: ImportProgress = {
      totalRows: job.total_rows,
      processedRows: job.processed_rows,
      successRows: job.success_rows,
      failedRows: job.failed_rows,
      warningRows: job.warning_rows,
      percentage: job.total_rows > 0
        ? Math.round((job.processed_rows / job.total_rows) * 100)
        : 0,
    };

    let estimatedRemainingSeconds: number | null = null;
    if (job.started_at && job.processed_rows > 0 && job.status === ImportJobStatus.RUNNING) {
      const elapsedMs = Date.now() - job.started_at.getTime();
      const rowsPerMs = job.processed_rows / elapsedMs;
      const remainingRows = job.total_rows - job.processed_rows;
      estimatedRemainingSeconds = Math.ceil(remainingRows / rowsPerMs / 1000);
    }

    return {
      id: job.id,
      jobType: job.job_type as ImportJobType,
      status: job.status as ImportJobStatus,
      fileName: job.file_name,
      consumerCode: job.consumer_code ?? null,
      progress,
      startedAt: job.started_at?.toISOString() ?? null,
      completedAt: job.completed_at?.toISOString() ?? null,
      estimatedRemainingSeconds,
      createdAt: job.created_at.toISOString(),
      createdBy: {
        id: job.created_by ?? 'unknown',
        username: 'unknown', // Would need join in real implementation
      },
    };
  }
}
