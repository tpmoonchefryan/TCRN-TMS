// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { GENERIC_EXPORT_JOB_TYPE } from '../domain/export-job.policy';

@Injectable()
export class ExportJobStateRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  updateProgress(
    tenantSchema: string,
    params: {
      jobId: string;
      totalRecords: number;
      processedRecords: number;
      status: string;
    },
  ) {
    return this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".export_job
      SET total_records = $1, processed_records = $2, status = $3,
          started_at = COALESCE(started_at, NOW()), updated_at = NOW()
      WHERE id = $4::uuid
        AND job_type = $5
    `,
      params.totalRecords,
      params.processedRecords,
      params.status,
      params.jobId,
      GENERIC_EXPORT_JOB_TYPE,
    );
  }

  completeJob(
    tenantSchema: string,
    params: {
      jobId: string;
      status: string;
      filePath: string;
      fileName: string;
      totalRecords: number;
      expiresAt: Date;
    },
  ) {
    return this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".export_job
      SET status = $1, file_path = $2, file_name = $3, total_records = $4, processed_records = $4,
          completed_at = NOW(), expires_at = $5::timestamptz, updated_at = NOW()
      WHERE id = $6::uuid
        AND job_type = $7
    `,
      params.status,
      params.filePath,
      params.fileName,
      params.totalRecords,
      params.expiresAt,
      params.jobId,
      GENERIC_EXPORT_JOB_TYPE,
    );
  }

  failJob(
    tenantSchema: string,
    params: {
      jobId: string;
      status: string;
      errorMessage: string;
    },
  ) {
    return this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".export_job
      SET status = $1, error_message = $2, completed_at = NOW(), updated_at = NOW()
      WHERE id = $3::uuid
        AND job_type = $4
    `,
      params.status,
      params.errorMessage,
      params.jobId,
      GENERIC_EXPORT_JOB_TYPE,
    );
  }
}
