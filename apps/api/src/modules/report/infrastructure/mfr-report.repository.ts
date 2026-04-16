// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type { RawMfrPreviewRecord } from '../domain/mfr-report.policy';
import type { MfrFilterCriteriaDto } from '../dto/report.dto';

interface MfrTalentRecord {
  id: string;
  profile_store_id: string | null;
}

@Injectable()
export class MfrReportRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findTalent(
    tenantSchema: string,
    talentId: string,
  ): Promise<MfrTalentRecord | null> {
    const talents = await this.prisma.$queryRawUnsafe<MfrTalentRecord[]>(`
      SELECT id, profile_store_id
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, talentId);

    return talents[0] ?? null;
  }

  async countMembershipRows(
    tenantSchema: string,
    talentId: string,
    filters: MfrFilterCriteriaDto,
  ): Promise<number> {
    const { whereClause, params } = this.buildMembershipWhereQuery(talentId, filters);
    const countResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) AS count
      FROM "${tenantSchema}".membership_record mr
      JOIN "${tenantSchema}".customer_profile cp ON cp.id = mr.customer_id
      JOIN "${tenantSchema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
      JOIN "${tenantSchema}".membership_type mt ON mt.id = ml.membership_type_id
      JOIN "${tenantSchema}".membership_class mc ON mc.id = mt.membership_class_id
      LEFT JOIN "${tenantSchema}".customer_status cs ON cs.id = cp.status_id
      WHERE ${whereClause}
    `, ...params);

    return Number(countResult[0]?.count || 0);
  }

  findMembershipPreview(
    tenantSchema: string,
    talentId: string,
    filters: MfrFilterCriteriaDto,
    previewLimit: number,
  ): Promise<RawMfrPreviewRecord[]> {
    const { whereClause, params } = this.buildMembershipWhereQuery(talentId, filters);

    return this.prisma.$queryRawUnsafe<RawMfrPreviewRecord[]>(`
      SELECT
        cp.nickname,
        sp.display_name AS platform_display_name,
        ml.name_zh AS level_name_zh,
        ml.name_en AS level_name_en,
        mr.valid_from,
        mr.valid_to,
        cs.name_zh AS status_name_zh,
        cs.name_en AS status_name_en
      FROM "${tenantSchema}".membership_record mr
      JOIN "${tenantSchema}".customer_profile cp ON cp.id = mr.customer_id
      JOIN "${tenantSchema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
      JOIN "${tenantSchema}".membership_type mt ON mt.id = ml.membership_type_id
      JOIN "${tenantSchema}".membership_class mc ON mc.id = mt.membership_class_id
      LEFT JOIN "${tenantSchema}".customer_status cs ON cs.id = cp.status_id
      WHERE ${whereClause}
      ORDER BY mr.created_at DESC
      LIMIT ${previewLimit}
    `, ...params);
  }

  async findMatchingCustomerIds(
    tenantSchema: string,
    talentId: string,
    filters: MfrFilterCriteriaDto,
  ): Promise<string[]> {
    const { whereClause, params } = this.buildMembershipWhereQuery(talentId, filters);
    const records = await this.prisma.$queryRawUnsafe<Array<{ customer_id: string }>>(`
      SELECT DISTINCT cp.id AS customer_id
      FROM "${tenantSchema}".membership_record mr
      JOIN "${tenantSchema}".customer_profile cp ON cp.id = mr.customer_id
      JOIN "${tenantSchema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
      JOIN "${tenantSchema}".membership_type mt ON mt.id = ml.membership_type_id
      JOIN "${tenantSchema}".membership_class mc ON mc.id = mt.membership_class_id
      LEFT JOIN "${tenantSchema}".customer_status cs ON cs.id = cp.status_id
      WHERE ${whereClause}
      ORDER BY cp.id ASC
    `, ...params);

    return records.map((record) => record.customer_id);
  }

  private buildMembershipWhereQuery(
    talentId: string,
    filters: MfrFilterCriteriaDto,
  ): { whereClause: string; params: unknown[] } {
    const conditions: string[] = ['cp.talent_id = $1::uuid'];
    const params: unknown[] = [talentId];
    let paramIndex = 2;

    if (filters.platformCodes?.length) {
      conditions.push(`sp.code = ANY($${paramIndex}::text[])`);
      params.push(filters.platformCodes);
      paramIndex += 1;
    }

    if (filters.membershipClassCodes?.length) {
      conditions.push(`mc.code = ANY($${paramIndex}::text[])`);
      params.push(filters.membershipClassCodes);
      paramIndex += 1;
    }

    if (filters.membershipTypeCodes?.length) {
      conditions.push(`mt.code = ANY($${paramIndex}::text[])`);
      params.push(filters.membershipTypeCodes);
      paramIndex += 1;
    }

    if (filters.membershipLevelCodes?.length) {
      conditions.push(`ml.code = ANY($${paramIndex}::text[])`);
      params.push(filters.membershipLevelCodes);
      paramIndex += 1;
    }

    if (filters.statusCodes?.length) {
      conditions.push(`cs.code = ANY($${paramIndex}::text[])`);
      params.push(filters.statusCodes);
      paramIndex += 1;
    }

    if (filters.validFromStart) {
      conditions.push(`mr.valid_from >= $${paramIndex}::timestamptz`);
      params.push(new Date(filters.validFromStart));
      paramIndex += 1;
    }

    if (filters.validFromEnd) {
      conditions.push(`mr.valid_from <= $${paramIndex}::timestamptz`);
      params.push(new Date(filters.validFromEnd));
      paramIndex += 1;
    }

    if (filters.validToStart) {
      conditions.push(`mr.valid_to >= $${paramIndex}::timestamptz`);
      params.push(new Date(filters.validToStart));
      paramIndex += 1;
    }

    if (filters.validToEnd) {
      conditions.push(`mr.valid_to <= $${paramIndex}::timestamptz`);
      params.push(new Date(filters.validToEnd));
      paramIndex += 1;
    }

    if (!filters.includeExpired) {
      conditions.push('(mr.valid_to IS NULL OR mr.valid_to >= NOW())');
    }

    if (!filters.includeInactive) {
      conditions.push('cp.is_active = true');
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
    };
  }
}
