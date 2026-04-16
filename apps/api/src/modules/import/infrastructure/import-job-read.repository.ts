// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import {
  type ImportJobListFilters,
  type ImportJobPagination,
  type RawImportJobErrorRecord,
  type RawImportJobRecord,
} from '../domain/import-job.policy';

interface ImportTalentProfileStoreRecord {
  id: string;
  profile_store_id: string | null;
}

@Injectable()
export class ImportJobReadRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findTalentProfileStore(
    tenantSchema: string,
    talentId: string,
  ): Promise<ImportTalentProfileStoreRecord | null> {
    const talents = await this.prisma.$queryRawUnsafe<ImportTalentProfileStoreRecord[]>(`
      SELECT id, profile_store_id
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, talentId);

    return talents[0] ?? null;
  }

  async findById(
    tenantSchema: string,
    jobId: string,
    talentId: string,
  ): Promise<RawImportJobRecord | null> {
    const jobs = await this.prisma.$queryRawUnsafe<RawImportJobRecord[]>(`
      SELECT ij.id, ij.job_type, ij.status, ij.file_name, ij.total_rows, ij.processed_rows,
             ij.success_rows, ij.failed_rows, ij.warning_rows, ij.started_at, ij.completed_at,
             ij.created_at, ij.created_by, c.code AS consumer_code
      FROM "${tenantSchema}".import_job ij
      LEFT JOIN "${tenantSchema}".consumer c ON c.id = ij.consumer_id
      WHERE ij.id = $1::uuid
        AND ij.talent_id = $2::uuid
    `, jobId, talentId);

    return jobs[0] ?? null;
  }

  findMany(
    tenantSchema: string,
    filters: ImportJobListFilters,
    pagination: ImportJobPagination,
  ): Promise<RawImportJobRecord[]> {
    const { whereClause, params } = this.buildListQuery(filters);

    return this.prisma.$queryRawUnsafe<RawImportJobRecord[]>(`
      SELECT ij.id, ij.job_type, ij.status, ij.file_name, ij.total_rows, ij.processed_rows,
             ij.success_rows, ij.failed_rows, ij.warning_rows, ij.started_at, ij.completed_at,
             ij.created_at, ij.created_by, c.code AS consumer_code
      FROM "${tenantSchema}".import_job ij
      LEFT JOIN "${tenantSchema}".consumer c ON c.id = ij.consumer_id
      WHERE ${whereClause}
      ORDER BY ij.created_at DESC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);
  }

  async countMany(
    tenantSchema: string,
    filters: ImportJobListFilters,
  ): Promise<number> {
    const { whereClause, params } = this.buildListQuery(filters);
    const totalResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) AS count
      FROM "${tenantSchema}".import_job ij
      WHERE ${whereClause}
    `, ...params);

    return Number(totalResult[0]?.count || 0);
  }

  getErrors(
    tenantSchema: string,
    jobId: string,
    talentId: string,
  ): Promise<RawImportJobErrorRecord[]> {
    return this.prisma.$queryRawUnsafe<RawImportJobErrorRecord[]>(`
      SELECT
        ije.row_number,
        ije.error_code,
        ije.error_message,
        ije.original_data
      FROM "${tenantSchema}".import_job_error ije
      INNER JOIN "${tenantSchema}".import_job ij ON ij.id = ije.import_job_id
      WHERE ije.import_job_id = $1::uuid
        AND ij.talent_id = $2::uuid
      ORDER BY ije.row_number ASC
    `, jobId, talentId);
  }

  private buildListQuery(filters: ImportJobListFilters): {
    whereClause: string;
    params: unknown[];
  } {
    const conditions: string[] = ['ij.profile_store_id = $1::uuid'];
    const params: unknown[] = [filters.profileStoreId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`ij.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex += 1;
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
    };
  }
}
