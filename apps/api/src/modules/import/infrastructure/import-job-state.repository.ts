// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';

@Injectable()
export class ImportJobStateRepository {
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
      processedRows: number;
      successRows: number;
      failedRows: number;
      warningRows: number;
      status: string;
    },
  ) {
    return this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".import_job
      SET processed_rows = $1, success_rows = $2, failed_rows = $3, warning_rows = $4,
          status = $5, started_at = COALESCE(started_at, NOW())
      WHERE id = $6::uuid
    `,
      params.processedRows,
      params.successRows,
      params.failedRows,
      params.warningRows,
      params.status,
      params.jobId,
    );
  }

  completeJob(
    tenantSchema: string,
    params: {
      jobId: string;
      status: string;
      processedRows: number;
      successRows: number;
      failedRows: number;
      warningRows: number;
    },
  ) {
    return this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".import_job
      SET status = $1, processed_rows = $2, success_rows = $3, failed_rows = $4, warning_rows = $5,
          completed_at = NOW()
      WHERE id = $6::uuid
    `,
      params.status,
      params.processedRows,
      params.successRows,
      params.failedRows,
      params.warningRows,
      params.jobId,
    );
  }

  addError(
    tenantSchema: string,
    params: {
      jobId: string;
      rowNumber: number;
      errorCode: string;
      errorMessage: string;
      originalData: string;
    },
  ) {
    return this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".import_job_error (
        id, import_job_id, row_number, error_code, error_message, original_data, created_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2, $3, $4, $5, NOW()
      )
    `,
      params.jobId,
      params.rowNumber,
      params.errorCode,
      params.errorMessage,
      params.originalData,
    );
  }
}
