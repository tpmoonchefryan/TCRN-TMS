// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import {
  MARSHMALLOW_EXPORT_CURRENT_TABLE,
  MARSHMALLOW_EXPORT_LEGACY_TABLE,
  MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
} from '../domain/marshmallow-export.policy';

@Injectable()
export class MarshmallowExportStateRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async updateProgress(
    tenantSchema: string,
    params: {
      jobId: string;
      totalRecords: number;
      processedRecords: number;
      status: string;
    },
  ): Promise<void> {
    await this.executeFallbackUpdate(
      `
        UPDATE "${tenantSchema}".${MARSHMALLOW_EXPORT_CURRENT_TABLE}
        SET status = $1,
            total_records = $2,
            processed_records = $3,
            started_at = COALESCE(started_at, NOW()),
            updated_at = NOW()
        WHERE id = $4::uuid
      `,
      [
        params.status,
        params.totalRecords,
        params.processedRecords,
        params.jobId,
      ],
      `
        UPDATE "${tenantSchema}".${MARSHMALLOW_EXPORT_LEGACY_TABLE}
        SET status = $1,
            total_records = $2,
            processed_records = $3,
            started_at = COALESCE(started_at, NOW()),
            updated_at = NOW()
        WHERE id = $4::uuid
          AND job_type = $5
      `,
      [
        params.status,
        params.totalRecords,
        params.processedRecords,
        params.jobId,
        MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
      ],
    );
  }

  async completeJob(
    tenantSchema: string,
    params: {
      jobId: string;
      status: string;
      filePath: string;
      fileName: string;
      totalRecords: number;
      expiresAt: Date;
    },
  ): Promise<void> {
    await this.executeFallbackUpdate(
      `
        UPDATE "${tenantSchema}".${MARSHMALLOW_EXPORT_CURRENT_TABLE}
        SET status = $1,
            file_path = $2,
            file_name = $3,
            total_records = $4,
            processed_records = $4,
            completed_at = NOW(),
            expires_at = $5::timestamptz,
            updated_at = NOW()
        WHERE id = $6::uuid
      `,
      [
        params.status,
        params.filePath,
        params.fileName,
        params.totalRecords,
        params.expiresAt,
        params.jobId,
      ],
      `
        UPDATE "${tenantSchema}".${MARSHMALLOW_EXPORT_LEGACY_TABLE}
        SET status = $1,
            file_path = $2,
            file_name = $3,
            total_records = $4,
            processed_records = $4,
            completed_at = NOW(),
            expires_at = $5::timestamptz,
            updated_at = NOW()
        WHERE id = $6::uuid
          AND job_type = $7
      `,
      [
        params.status,
        params.filePath,
        params.fileName,
        params.totalRecords,
        params.expiresAt,
        params.jobId,
        MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
      ],
    );
  }

  async failJob(
    tenantSchema: string,
    params: {
      jobId: string;
      status: string;
      errorMessage: string;
    },
  ): Promise<void> {
    await this.executeFallbackUpdate(
      `
        UPDATE "${tenantSchema}".${MARSHMALLOW_EXPORT_CURRENT_TABLE}
        SET status = $1,
            error_message = $2,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $3::uuid
      `,
      [params.status, params.errorMessage, params.jobId],
      `
        UPDATE "${tenantSchema}".${MARSHMALLOW_EXPORT_LEGACY_TABLE}
        SET status = $1,
            error_message = $2,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $3::uuid
          AND job_type = $4
      `,
      [
        params.status,
        params.errorMessage,
        params.jobId,
        MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
      ],
    );
  }

  private async executeFallbackUpdate(
    currentSql: string,
    currentParams: unknown[],
    legacySql: string,
    legacyParams: unknown[],
  ): Promise<void> {
    const currentUpdated = await this.prisma.$executeRawUnsafe(currentSql, ...currentParams);
    if (currentUpdated > 0) {
      return;
    }

    await this.prisma.$executeRawUnsafe(legacySql, ...legacyParams);
  }
}
