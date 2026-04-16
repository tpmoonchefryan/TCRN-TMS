// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import {
  type ExportJobDownloadTarget,
  type ExportJobListFilters,
  type ExportJobPagination,
  GENERIC_EXPORT_JOB_TYPE,
  type RawExportJobRecord,
} from '../domain/export-job.policy';

interface ExportTalentProfileStoreRecord {
  id: string;
  profile_store_id: string | null;
}

@Injectable()
export class ExportJobReadRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findTalentProfileStore(
    tenantSchema: string,
    talentId: string,
  ): Promise<ExportTalentProfileStoreRecord | null> {
    const talents = await this.prisma.$queryRawUnsafe<ExportTalentProfileStoreRecord[]>(`
      SELECT id, profile_store_id
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, talentId);

    return talents[0] ?? null;
  }

  async findById(
    tenantSchema: string,
    jobId: string,
  ): Promise<RawExportJobRecord | null> {
    const jobs = await this.prisma.$queryRawUnsafe<RawExportJobRecord[]>(`
      SELECT id, job_type, format, status, file_name, file_path, total_records, processed_records, expires_at, created_at, completed_at
      FROM "${tenantSchema}".export_job
      WHERE id = $1::uuid
        AND job_type = $2
    `, jobId, GENERIC_EXPORT_JOB_TYPE);

    return jobs[0] ?? null;
  }

  findMany(
    tenantSchema: string,
    filters: ExportJobListFilters,
    pagination: ExportJobPagination,
  ): Promise<RawExportJobRecord[]> {
    const { whereClause, params } = this.buildListQuery(filters);

    return this.prisma.$queryRawUnsafe<RawExportJobRecord[]>(`
      SELECT id, job_type, format, status, file_name, file_path, total_records, processed_records, expires_at, created_at, completed_at
      FROM "${tenantSchema}".export_job
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);
  }

  async countMany(
    tenantSchema: string,
    filters: ExportJobListFilters,
  ): Promise<number> {
    const { whereClause, params } = this.buildListQuery(filters);
    const totalResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) AS count
      FROM "${tenantSchema}".export_job
      WHERE ${whereClause}
    `, ...params);

    return Number(totalResult[0]?.count || 0);
  }

  async findDownloadTarget(
    tenantSchema: string,
    jobId: string,
  ): Promise<ExportJobDownloadTarget | null> {
    const jobs = await this.prisma.$queryRawUnsafe<ExportJobDownloadTarget[]>(`
      SELECT id, status, file_path
      FROM "${tenantSchema}".export_job
      WHERE id = $1::uuid
        AND job_type = $2
    `, jobId, GENERIC_EXPORT_JOB_TYPE);

    return jobs[0] ?? null;
  }

  private buildListQuery(filters: ExportJobListFilters): {
    whereClause: string;
    params: unknown[];
  } {
    const conditions: string[] = ['profile_store_id = $1::uuid', 'job_type = $2'];
    const params: unknown[] = [filters.profileStoreId, GENERIC_EXPORT_JOB_TYPE];
    let paramIndex = 3;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex += 1;
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
    };
  }
}
