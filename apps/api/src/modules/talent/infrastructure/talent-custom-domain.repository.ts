// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type {
  TalentCustomDomainConfig,
  TalentCustomDomainPaths,
} from '../domain/talent-custom-domain.policy';

@Injectable()
export class TalentCustomDomainRepository {
  async getCustomDomainConfig(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentCustomDomainConfig | null> {
    const results = await prisma.$queryRawUnsafe<TalentCustomDomainConfig[]>(
      `SELECT
        custom_domain as "customDomain",
        custom_domain_verified as "customDomainVerified",
        custom_domain_verification_token as "customDomainVerificationToken",
        custom_domain_ssl_mode as "customDomainSslMode",
        homepage_path as "homepageCustomPath",
        marshmallow_path as "marshmallowCustomPath"
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      talentId,
    );

    return results[0] || null;
  }

  async clearCustomDomain(
    talentId: string,
    tenantSchema: string,
  ): Promise<boolean> {
    const removed = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE "${tenantSchema}".talent
       SET
         custom_domain = NULL,
         custom_domain_verified = false,
         custom_domain_verification_token = NULL,
         updated_at = now()
       WHERE id = $1::uuid
       RETURNING id`,
      talentId,
    );

    return removed.length > 0;
  }

  async findTalentIdByCustomDomain(
    tenantSchema: string,
    customDomain: string,
    talentId: string,
  ): Promise<string | null> {
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".talent
       WHERE custom_domain = $1 AND id != $2::uuid`,
      customDomain,
      talentId,
    );

    return existing[0]?.id ?? null;
  }

  async setCustomDomain(
    talentId: string,
    tenantSchema: string,
    customDomain: string,
    token: string,
  ): Promise<boolean> {
    const updated = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE "${tenantSchema}".talent
       SET
         custom_domain = $2,
         custom_domain_verified = false,
         custom_domain_verification_token = $3,
         updated_at = now()
       WHERE id = $1::uuid
       RETURNING id`,
      talentId,
      customDomain,
      token,
    );

    return updated.length > 0;
  }

  markCustomDomainVerified(
    talentId: string,
    tenantSchema: string,
  ) {
    return prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".talent
       SET custom_domain_verified = true, updated_at = now()
       WHERE id = $1::uuid`,
      talentId,
    );
  }

  async getServicePaths(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentCustomDomainPaths | null> {
    const current = await prisma.$queryRawUnsafe<TalentCustomDomainPaths[]>(
      `SELECT
        homepage_path as "homepageCustomPath",
        marshmallow_path as "marshmallowCustomPath"
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      talentId,
    );

    return current[0] || null;
  }

  async updateServicePaths(
    talentId: string,
    tenantSchema: string,
    paths: TalentCustomDomainPaths,
  ): Promise<TalentCustomDomainPaths | null> {
    const updates: string[] = [];
    const params: unknown[] = [talentId];
    let paramIndex = 2;

    if (paths.homepageCustomPath !== undefined) {
      updates.push(`homepage_path = $${paramIndex++}`);
      params.push(paths.homepageCustomPath);
    }

    if (paths.marshmallowCustomPath !== undefined) {
      updates.push(`marshmallow_path = $${paramIndex++}`);
      params.push(paths.marshmallowCustomPath);
    }

    if (updates.length === 0) {
      return this.getServicePaths(talentId, tenantSchema);
    }

    updates.push('updated_at = now()');

    const results = await prisma.$queryRawUnsafe<TalentCustomDomainPaths[]>(
      `UPDATE "${tenantSchema}".talent
       SET ${updates.join(', ')}
       WHERE id = $1::uuid
       RETURNING
         homepage_path as "homepageCustomPath",
         marshmallow_path as "marshmallowCustomPath"`,
      ...params,
    );

    return results[0] || null;
  }

  async updateSslMode(
    talentId: string,
    tenantSchema: string,
    sslMode: 'auto' | 'self_hosted' | 'cloudflare',
  ): Promise<{ customDomainSslMode: string } | null> {
    const results = await prisma.$queryRawUnsafe<
      Array<{ customDomainSslMode: string }>
    >(
      `UPDATE "${tenantSchema}".talent
       SET custom_domain_ssl_mode = $2, updated_at = now()
       WHERE id = $1::uuid
       RETURNING custom_domain_ssl_mode as "customDomainSslMode"`,
      talentId,
      sslMode,
    );

    return results[0] || null;
  }
}
