// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  RawReportJobDetail,
  RawReportJobListItem,
  ReportJobDownloadTarget,
  ReportJobPagination,
  ReportJobReadFilters,
} from '../domain/report-job-read.policy';

@Injectable()
export class ReportJobReadRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findById(
    tenantSchema: string,
    jobId: string,
    talentId: string,
  ): Promise<RawReportJobDetail | null> {
    const jobs = await this.prisma.$queryRawUnsafe<RawReportJobDetail[]>(`
      SELECT
        rj.id,
        rj.report_type,
        rj.status,
        rj.total_rows,
        rj.processed_rows,
        rj.progress_percentage,
        rj.error_code,
        rj.error_message,
        rj.file_name,
        rj.file_size_bytes,
        rj.queued_at,
        rj.started_at,
        rj.completed_at,
        rj.expires_at,
        rj.created_at,
        su.id AS creator_id,
        su.username AS creator_username
      FROM "${tenantSchema}".report_job rj
      JOIN "${tenantSchema}".system_user su ON su.id = rj.created_by
      WHERE rj.id = $1::uuid
        AND rj.talent_id = $2::uuid
    `, jobId, talentId);

    return jobs[0] ?? null;
  }

  findMany(
    tenantSchema: string,
    filters: ReportJobReadFilters,
    pagination: ReportJobPagination,
  ): Promise<RawReportJobListItem[]> {
    const { whereClause, params } = this.buildListQuery(filters);

    return this.prisma.$queryRawUnsafe<RawReportJobListItem[]>(`
      SELECT id, report_type, status, total_rows, file_name, created_at, completed_at, expires_at
      FROM "${tenantSchema}".report_job
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);
  }

  async countMany(
    tenantSchema: string,
    filters: ReportJobReadFilters,
  ): Promise<number> {
    const { whereClause, params } = this.buildListQuery(filters);
    const totalResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) AS count
      FROM "${tenantSchema}".report_job
      WHERE ${whereClause}
    `, ...params);

    return Number(totalResult[0]?.count || 0);
  }

  async findDownloadTarget(
    tenantSchema: string,
    jobId: string,
    talentId: string,
  ): Promise<ReportJobDownloadTarget | null> {
    const jobs = await this.prisma.$queryRawUnsafe<ReportJobDownloadTarget[]>(`
      SELECT id, status, file_path, file_name
      FROM "${tenantSchema}".report_job
      WHERE id = $1::uuid
        AND talent_id = $2::uuid
    `, jobId, talentId);

    return jobs[0] ?? null;
  }

  private buildListQuery(filters: ReportJobReadFilters): {
    whereClause: string;
    params: unknown[];
  } {
    const conditions: string[] = ['talent_id = $1::uuid'];
    const params: unknown[] = [filters.talentId];
    let paramIndex = 2;

    if (filters.statuses?.length) {
      conditions.push(`status = ANY($${paramIndex}::text[])`);
      params.push(filters.statuses);
      paramIndex += 1;
    }

    if (filters.createdFrom) {
      conditions.push(`created_at >= $${paramIndex}::timestamptz`);
      params.push(filters.createdFrom);
      paramIndex += 1;
    }

    if (filters.createdTo) {
      conditions.push(`created_at <= $${paramIndex}::timestamptz`);
      params.push(filters.createdTo);
      paramIndex += 1;
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
    };
  }
}
