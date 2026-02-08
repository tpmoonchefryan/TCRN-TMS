// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import {
    MfrFilterCriteriaDto,
    MfrPreviewRow,
    MfrSearchResult,
    ReportType,
} from '../dto/report.dto';
import { ReportJobService } from './report-job.service';

@Injectable()
export class MfrReportService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly reportJobService: ReportJobService,
  ) {}

  /**
   * Search and preview MFR data (multi-tenant aware)
   */
  async search(
    talentId: string,
    filters: MfrFilterCriteriaDto = {},
    previewLimit: number = 20,
    context: RequestContext,
  ): Promise<MfrSearchResult> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify talent exists using raw SQL
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_store_id: string | null;
    }>>(`
      SELECT id, profile_store_id FROM "${schema}".talent WHERE id = $1::uuid
    `, talentId);

    if (!talents.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    // Build where conditions
    const { conditions, params } = this.buildMembershipWhereConditions(talentId, filters);
    const whereClause = conditions.join(' AND ');

    // Get total count using raw SQL
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${schema}".membership_record mr
      JOIN "${schema}".customer_profile cp ON cp.id = mr.customer_id
      JOIN "${schema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${schema}".membership_level ml ON ml.id = mr.membership_level_id
      JOIN "${schema}".membership_type mt ON mt.id = ml.membership_type_id
      JOIN "${schema}".membership_class mc ON mc.id = mt.membership_class_id
      LEFT JOIN "${schema}".customer_status cs ON cs.id = cp.status_id
      WHERE ${whereClause}
    `, ...params);
    const totalCount = Number(countResult[0]?.count || 0);

    // Get preview data using raw SQL
    const records = await prisma.$queryRawUnsafe<Array<{
      nickname: string;
      platform_display_name: string;
      level_name_zh: string | null;
      level_name_en: string;
      valid_from: Date;
      valid_to: Date | null;
      status_name_zh: string | null;
      status_name_en: string | null;
    }>>(`
      SELECT 
        cp.nickname,
        sp.display_name as platform_display_name,
        ml.name_zh as level_name_zh,
        ml.name_en as level_name_en,
        mr.valid_from,
        mr.valid_to,
        cs.name_zh as status_name_zh,
        cs.name_en as status_name_en
      FROM "${schema}".membership_record mr
      JOIN "${schema}".customer_profile cp ON cp.id = mr.customer_id
      JOIN "${schema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${schema}".membership_level ml ON ml.id = mr.membership_level_id
      JOIN "${schema}".membership_type mt ON mt.id = ml.membership_type_id
      JOIN "${schema}".membership_class mc ON mc.id = mt.membership_class_id
      LEFT JOIN "${schema}".customer_status cs ON cs.id = cp.status_id
      WHERE ${whereClause}
      ORDER BY mr.created_at DESC
      LIMIT ${previewLimit}
    `, ...params);

    const preview: MfrPreviewRow[] = records.map((r) => ({
      nickname: r.nickname,
      platformName: r.platform_display_name ?? '',
      membershipLevelName: r.level_name_zh ?? r.level_name_en ?? '',
      validFrom: r.valid_from.toISOString().split('T')[0],
      validTo: r.valid_to?.toISOString().split('T')[0] ?? null,
      statusName: r.status_name_zh ?? r.status_name_en ?? '',
    }));

    // Build filter summary
    const platforms = filters.platformCodes ?? [];
    let dateRange: string | null = null;
    if (filters.validFromStart || filters.validFromEnd) {
      dateRange = `${filters.validFromStart ?? '...'} ~ ${filters.validFromEnd ?? '...'}`;
    }

    return {
      totalCount,
      preview,
      filterSummary: {
        platforms,
        dateRange,
        includeExpired: filters.includeExpired ?? false,
      },
    };
  }

  /**
   * Create MFR export job (multi-tenant aware)
   */
  async createJob(
    talentId: string,
    filters: MfrFilterCriteriaDto = {},
    format: string = 'xlsx',
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Build where conditions
    const { conditions, params } = this.buildMembershipWhereConditions(talentId, filters);
    const whereClause = conditions.join(' AND ');

    // Count total rows for estimate using raw SQL
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${schema}".membership_record mr
      JOIN "${schema}".customer_profile cp ON cp.id = mr.customer_id
      JOIN "${schema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${schema}".membership_level ml ON ml.id = mr.membership_level_id
      JOIN "${schema}".membership_type mt ON mt.id = ml.membership_type_id
      JOIN "${schema}".membership_class mc ON mc.id = mt.membership_class_id
      LEFT JOIN "${schema}".customer_status cs ON cs.id = cp.status_id
      WHERE ${whereClause}
    `, ...params);
    const estimatedRows = Number(countResult[0]?.count || 0);

    return this.reportJobService.create(
      ReportType.MFR,
      talentId,
      filters,
      format,
      estimatedRows,
      context,
    );
  }

  /**
   * Build SQL where conditions for membership query
   */
  private buildMembershipWhereConditions(
    talentId: string,
    filters: MfrFilterCriteriaDto,
  ): { conditions: string[]; params: unknown[]; paramIndex: number } {
    const conditions: string[] = ['cp.talent_id = $1::uuid'];
    const params: unknown[] = [talentId];
    let paramIndex = 2;

    // Platform filter
    if (filters.platformCodes?.length) {
      conditions.push(`sp.code = ANY($${paramIndex}::text[])`);
      params.push(filters.platformCodes);
      paramIndex++;
    }

    // Membership class filter
    if (filters.membershipClassCodes?.length) {
      conditions.push(`mc.code = ANY($${paramIndex}::text[])`);
      params.push(filters.membershipClassCodes);
      paramIndex++;
    }

    // Membership type filter
    if (filters.membershipTypeCodes?.length) {
      conditions.push(`mt.code = ANY($${paramIndex}::text[])`);
      params.push(filters.membershipTypeCodes);
      paramIndex++;
    }

    // Membership level filter
    if (filters.membershipLevelCodes?.length) {
      conditions.push(`ml.code = ANY($${paramIndex}::text[])`);
      params.push(filters.membershipLevelCodes);
      paramIndex++;
    }

    // Customer status filter
    if (filters.statusCodes?.length) {
      conditions.push(`cs.code = ANY($${paramIndex}::text[])`);
      params.push(filters.statusCodes);
      paramIndex++;
    }

    // Valid from date range
    if (filters.validFromStart) {
      conditions.push(`mr.valid_from >= $${paramIndex}::timestamptz`);
      params.push(new Date(filters.validFromStart));
      paramIndex++;
    }
    if (filters.validFromEnd) {
      conditions.push(`mr.valid_from <= $${paramIndex}::timestamptz`);
      params.push(new Date(filters.validFromEnd));
      paramIndex++;
    }

    // Valid to date range
    if (filters.validToStart) {
      conditions.push(`mr.valid_to >= $${paramIndex}::timestamptz`);
      params.push(new Date(filters.validToStart));
      paramIndex++;
    }
    if (filters.validToEnd) {
      conditions.push(`mr.valid_to <= $${paramIndex}::timestamptz`);
      params.push(new Date(filters.validToEnd));
      paramIndex++;
    }

    // Exclude expired by default
    if (!filters.includeExpired) {
      conditions.push('(mr.valid_to IS NULL OR mr.valid_to >= NOW())');
    }

    // Exclude inactive by default
    if (!filters.includeInactive) {
      conditions.push('cp.is_active = true');
    }

    return { conditions, params, paramIndex };
  }
}
