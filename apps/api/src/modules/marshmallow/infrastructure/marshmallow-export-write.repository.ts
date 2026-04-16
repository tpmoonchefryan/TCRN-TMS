// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import {
  MARSHMALLOW_EXPORT_CURRENT_TABLE,
  type RawMarshmallowExportJobRecord,
} from '../domain/marshmallow-export.policy';

interface MarshmallowExportTalentRecord {
  id: string;
}

@Injectable()
export class MarshmallowExportWriteRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findTalentForCreation(
    tenantSchema: string,
    talentId: string,
  ): Promise<MarshmallowExportTalentRecord | null> {
    const talents = await this.prisma.$queryRawUnsafe<MarshmallowExportTalentRecord[]>(`
      SELECT id
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, talentId);

    return talents[0] ?? null;
  }

  async createJob(
    tenantSchema: string,
    params: {
      jobId: string;
      talentId: string;
      format: string;
      status: string;
      filtersJson: string;
      createdAt: Date;
      userId: string;
    },
  ): Promise<RawMarshmallowExportJobRecord> {
    const jobs = await this.prisma.$queryRawUnsafe<RawMarshmallowExportJobRecord[]>(`
      INSERT INTO "${tenantSchema}".${MARSHMALLOW_EXPORT_CURRENT_TABLE} (
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
      )
      RETURNING
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
    `,
      params.jobId,
      params.talentId,
      params.format,
      params.status,
      params.filtersJson,
      params.createdAt,
      params.userId,
    );

    return jobs[0];
  }
}
