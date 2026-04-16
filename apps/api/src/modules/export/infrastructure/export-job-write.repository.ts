// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { GENERIC_EXPORT_JOB_TYPE, type RawExportJobRecord } from '../domain/export-job.policy';
import { ExportJobStatus } from '../dto/export.dto';

interface ExportJobCreationTalentRecord {
  id: string;
  profile_store_id: string | null;
}

interface CancelableExportJobRecord {
  id: string;
  status: string;
}

@Injectable()
export class ExportJobWriteRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findTalentForCreation(
    tenantSchema: string,
    talentId: string,
  ): Promise<ExportJobCreationTalentRecord | null> {
    const talents = await this.prisma.$queryRawUnsafe<ExportJobCreationTalentRecord[]>(`
      SELECT id, profile_store_id
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, talentId);

    return talents[0] ?? null;
  }

  async createJob(
    tenantSchema: string,
    params: {
      talentId: string;
      profileStoreId: string;
      jobType: string;
      format: string;
      status: string;
      filtersJson: string;
      userId: string;
    },
  ): Promise<RawExportJobRecord> {
    const jobs = await this.prisma.$queryRawUnsafe<RawExportJobRecord[]>(`
      INSERT INTO "${tenantSchema}".export_job (
        id, talent_id, profile_store_id, job_type, format, status, filters,
        total_records, processed_records, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb,
        0, 0, $7::uuid, NOW(), NOW()
      )
      RETURNING id, job_type, format, status, file_name, file_path, total_records, processed_records, expires_at, created_at, completed_at
    `,
      params.talentId,
      params.profileStoreId,
      params.jobType,
      params.format,
      params.status,
      params.filtersJson,
      params.userId,
    );

    return jobs[0];
  }

  async findCancelableJob(
    tenantSchema: string,
    jobId: string,
  ): Promise<CancelableExportJobRecord | null> {
    const jobs = await this.prisma.$queryRawUnsafe<CancelableExportJobRecord[]>(`
      SELECT id, status
      FROM "${tenantSchema}".export_job
      WHERE id = $1::uuid
        AND job_type = $2
    `, jobId, GENERIC_EXPORT_JOB_TYPE);

    return jobs[0] ?? null;
  }

  cancelJob(tenantSchema: string, jobId: string) {
    return this.prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".export_job
      SET status = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2::uuid
        AND job_type = $3
    `, ExportJobStatus.CANCELLED, jobId, GENERIC_EXPORT_JOB_TYPE);
  }
}
