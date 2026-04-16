// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';

export interface ReportJobCreationTalentRecord {
  id: string;
  subsidiary_id: string | null;
  profile_store_id: string | null;
}

export interface CreatedReportJobRecord {
  id: string;
  status: string;
  created_at: Date;
}

export interface CancelableReportJobRecord {
  id: string;
  status: string;
}

@Injectable()
export class ReportJobWriteRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findTalentForCreation(
    tenantSchema: string,
    talentId: string,
  ): Promise<ReportJobCreationTalentRecord | null> {
    const talents = await this.prisma.$queryRawUnsafe<ReportJobCreationTalentRecord[]>(`
      SELECT id, subsidiary_id, profile_store_id
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
      reportType: string;
      filtersJson: string;
      format: string;
      status: string;
      estimatedRows: number;
      userId: string;
    },
  ): Promise<CreatedReportJobRecord> {
    const jobs = await this.prisma.$queryRawUnsafe<CreatedReportJobRecord[]>(`
      INSERT INTO "${tenantSchema}".report_job (
        id, talent_id, profile_store_id, report_type, filter_criteria, format,
        status, total_rows, queued_at, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::jsonb, $5,
        $6, $7, NOW(), $8::uuid, NOW(), NOW()
      )
      RETURNING id, status, created_at
    `,
      params.talentId,
      params.profileStoreId,
      params.reportType,
      params.filtersJson,
      params.format,
      params.status,
      params.estimatedRows,
      params.userId,
    );

    return jobs[0];
  }

  async findCancelableJob(
    tenantSchema: string,
    jobId: string,
    talentId: string,
  ): Promise<CancelableReportJobRecord | null> {
    const jobs = await this.prisma.$queryRawUnsafe<CancelableReportJobRecord[]>(`
      SELECT id, status
      FROM "${tenantSchema}".report_job
      WHERE id = $1::uuid
        AND talent_id = $2::uuid
    `, jobId, talentId);

    return jobs[0] ?? null;
  }

  insertCancellationChangeLog(
    tenantSchema: string,
    params: {
      jobId: string;
      oldStatus: string;
      operatorId: string;
      ipAddress: string;
      cancelledStatus: string;
    },
  ) {
    return this.prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'cancel', 'report_job', $1::uuid, 'Report job', $2::jsonb, $3::uuid, $4::inet, NOW()
      )
    `,
      params.jobId,
      JSON.stringify({
        old: { status: params.oldStatus },
        new: { status: params.cancelledStatus },
      }),
      params.operatorId,
      params.ipAddress,
    );
  }
}
