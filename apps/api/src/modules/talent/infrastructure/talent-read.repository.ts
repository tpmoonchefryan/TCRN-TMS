// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import {
  buildTalentListQuery,
  TALENT_SELECT_FIELDS,
  type TalentData,
  type TalentExternalPagesDomainConfig,
  type TalentListOptions,
  type TalentProfileStoreRecord,
  type TalentStats,
} from '../domain/talent-read.policy';

@Injectable()
export class TalentReadRepository {
  async findById(id: string, tenantSchema: string): Promise<TalentData | null> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(
      `SELECT
        ${TALENT_SELECT_FIELDS}
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      id,
    );

    return results[0] || null;
  }

  async findByCode(
    code: string,
    tenantSchema: string,
  ): Promise<TalentData | null> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(
      `SELECT
        ${TALENT_SELECT_FIELDS}
       FROM "${tenantSchema}".talent
       WHERE code = $1`,
      code,
    );

    return results[0] || null;
  }

  async findByHomepagePath(
    homepagePath: string,
    tenantSchema: string,
  ): Promise<TalentData | null> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(
      `SELECT
        ${TALENT_SELECT_FIELDS}
       FROM "${tenantSchema}".talent
       WHERE homepage_path = $1`,
      homepagePath,
    );

    return results[0] || null;
  }

  async findByCustomDomain(
    customDomain: string,
    tenantSchema: string,
  ): Promise<TalentData | null> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(
      `SELECT
        ${TALENT_SELECT_FIELDS}
       FROM "${tenantSchema}".talent
       WHERE custom_domain = $1 AND custom_domain_verified = true`,
      customDomain.toLowerCase(),
    );

    return results[0] || null;
  }

  async getProfileStoreById(
    profileStoreId: string,
    tenantSchema: string,
  ): Promise<TalentProfileStoreRecord | null> {
    try {
      const results = await prisma.$queryRawUnsafe<TalentProfileStoreRecord[]>(
        `SELECT
          id, code,
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          extra_data as "extraData",
          is_default as "isDefault",
          pii_proxy_url as "piiProxyUrl"
         FROM "${tenantSchema}".profile_store
         WHERE id = $1::uuid`,
        profileStoreId,
      );

      return results[0] || null;
    } catch {
      return null;
    }
  }

  async getTalentStats(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentStats> {
    try {
      const [customerResult, messageResult] = await Promise.all([
        prisma
          .$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*)::bigint as count
             FROM "${tenantSchema}".customer_profile
             WHERE talent_id = $1::uuid`,
            talentId,
          )
          .catch(() => [{ count: BigInt(0) }]),
        prisma
          .$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*)::bigint as count
             FROM "${tenantSchema}".marshmallow_message
             WHERE talent_id = $1::uuid AND status = 'pending'`,
            talentId,
          )
          .catch(() => [{ count: BigInt(0) }]),
      ]);

      return {
        customerCount: Number(customerResult[0]?.count ?? 0),
        pendingMessagesCount: Number(messageResult[0]?.count ?? 0),
      };
    } catch {
      return { customerCount: 0, pendingMessagesCount: 0 };
    }
  }

  async getExternalPagesDomainConfig(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentExternalPagesDomainConfig> {
    try {
      const [homepageResult, marshmallowResult] = await Promise.all([
        prisma
          .$queryRawUnsafe<
            Array<{
              isPublished: boolean;
              customDomain: string | null;
              customDomainVerified: boolean;
              customDomainVerificationToken: string | null;
            }>
          >(
            `SELECT
              is_published as "isPublished",
              custom_domain as "customDomain",
              custom_domain_verified as "customDomainVerified",
              custom_domain_verification_token as "customDomainVerificationToken"
             FROM "${tenantSchema}".talent_homepage
             WHERE talent_id = $1::uuid`,
            talentId,
          )
          .catch(() => []),
        prisma
          .$queryRawUnsafe<
            Array<{
              isEnabled: boolean;
              path: string | null;
              customDomain: string | null;
              customDomainVerified: boolean;
              customDomainVerificationToken: string | null;
            }>
          >(
            `SELECT
              is_enabled as "isEnabled",
              path,
              custom_domain as "customDomain",
              custom_domain_verified as "customDomainVerified",
              custom_domain_verification_token as "customDomainVerificationToken"
             FROM "${tenantSchema}".marshmallow_config
             WHERE talent_id = $1::uuid`,
            talentId,
          )
          .catch(() => []),
      ]);

      return {
        homepage: homepageResult[0] || null,
        marshmallow: marshmallowResult[0] || null,
      };
    } catch {
      return { homepage: null, marshmallow: null };
    }
  }

  async list(
    tenantSchema: string,
    options: TalentListOptions = {},
  ): Promise<{ data: TalentData[]; total: number }> {
    const query = buildTalentListQuery(options);
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".talent
       WHERE ${query.whereClause}`,
      ...query.params,
    );
    const data = await prisma.$queryRawUnsafe<TalentData[]>(
      `SELECT
        ${TALENT_SELECT_FIELDS}
       FROM "${tenantSchema}".talent
       WHERE ${query.whereClause}
       ORDER BY ${query.orderBy}
       LIMIT ${query.limit} OFFSET ${query.offset}`,
      ...query.params,
    );

    return {
      data,
      total: Number(countResult[0]?.count || 0),
    };
  }
}
