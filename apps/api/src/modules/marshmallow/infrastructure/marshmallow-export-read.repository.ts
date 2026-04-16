// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import {
  MARSHMALLOW_EXPORT_CURRENT_TABLE,
  MARSHMALLOW_EXPORT_LEGACY_TABLE,
  MARSHMALLOW_EXPORT_QUEUE_JOB_NAME,
  type MarshmallowExportDownloadTarget,
  type RawMarshmallowExportJobRecord,
} from '../domain/marshmallow-export.policy';

@Injectable()
export class MarshmallowExportReadRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findById(
    tenantSchema: string,
    talentId: string,
    jobId: string,
  ): Promise<RawMarshmallowExportJobRecord | null> {
    const currentJobs = await this.prisma.$queryRawUnsafe<RawMarshmallowExportJobRecord[]>(`
      SELECT
        id,
        status,
        format,
        file_name,
        file_path,
        total_records,
        processed_records,
        expires_at,
        created_at,
        completed_at
      FROM "${tenantSchema}".${MARSHMALLOW_EXPORT_CURRENT_TABLE}
      WHERE id = $1::uuid
        AND talent_id = $2::uuid
    `, jobId, talentId);

    if (currentJobs[0]) {
      return currentJobs[0];
    }

    const legacyJobs = await this.prisma.$queryRawUnsafe<RawMarshmallowExportJobRecord[]>(`
      SELECT
        id,
        status,
        format,
        file_name,
        file_path,
        total_records,
        processed_records,
        expires_at,
        created_at,
        completed_at
      FROM "${tenantSchema}".${MARSHMALLOW_EXPORT_LEGACY_TABLE}
      WHERE id = $1::uuid
        AND talent_id = $2::uuid
        AND job_type = $3
    `, jobId, talentId, MARSHMALLOW_EXPORT_QUEUE_JOB_NAME);

    return legacyJobs[0] ?? null;
  }

  async findDownloadTarget(
    tenantSchema: string,
    talentId: string,
    jobId: string,
  ): Promise<MarshmallowExportDownloadTarget | null> {
    const currentJobs = await this.prisma.$queryRawUnsafe<MarshmallowExportDownloadTarget[]>(`
      SELECT id, status, file_path
      FROM "${tenantSchema}".${MARSHMALLOW_EXPORT_CURRENT_TABLE}
      WHERE id = $1::uuid
        AND talent_id = $2::uuid
    `, jobId, talentId);

    if (currentJobs[0]) {
      return currentJobs[0];
    }

    const legacyJobs = await this.prisma.$queryRawUnsafe<MarshmallowExportDownloadTarget[]>(`
      SELECT id, status, file_path
      FROM "${tenantSchema}".${MARSHMALLOW_EXPORT_LEGACY_TABLE}
      WHERE id = $1::uuid
        AND talent_id = $2::uuid
        AND job_type = $3
    `, jobId, talentId, MARSHMALLOW_EXPORT_QUEUE_JOB_NAME);

    return legacyJobs[0] ?? null;
  }
}
