// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Injectable } from '@nestjs/common';

import { prisma } from '@tcrn/database';

import type {
  CustomDomainOwnerType,
  CustomDomainSslMode,
  TalentCustomDomainBindingListOptions,
  TalentCustomDomainBindingMutationInput,
  TalentCustomDomainBindingRecord,
  TalentCustomDomainPaths,
  TalentLegacyCustomDomainConfig,
} from '../domain/talent-custom-domain.policy';

export interface CustomDomainRegistryReadiness {
  customDomainBinding: boolean;
  customDomainTalentSelection: boolean;
  ready: boolean;
}

@Injectable()
export class TalentCustomDomainRepository {
  async getCustomDomainRegistryReadiness(): Promise<CustomDomainRegistryReadiness> {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        customDomainBinding: string | null;
        customDomainTalentSelection: string | null;
      }>
    >(
      `SELECT
         to_regclass('public.custom_domain_binding')::text as "customDomainBinding",
         to_regclass('public.custom_domain_talent_selection')::text as "customDomainTalentSelection"`
    );

    const readiness = {
      customDomainBinding: rows[0]?.customDomainBinding === 'public.custom_domain_binding',
      customDomainTalentSelection:
        rows[0]?.customDomainTalentSelection === 'public.custom_domain_talent_selection',
    };

    return {
      ...readiness,
      ready: readiness.customDomainBinding && readiness.customDomainTalentSelection,
    };
  }

  async getTenantIdBySchema(tenantSchema: string): Promise<string | null> {
    const tenants = await prisma.$queryRawUnsafe<Array<{ tenantId: string }>>(
      `SELECT id as "tenantId"
       FROM public.tenant
       WHERE schema_name = $1
       LIMIT 1`,
      tenantSchema
    );

    return tenants[0]?.tenantId ?? null;
  }

  async getCustomDomainConfig(
    talentId: string,
    tenantSchema: string
  ): Promise<TalentLegacyCustomDomainConfig | null> {
    const results = await prisma.$queryRawUnsafe<TalentLegacyCustomDomainConfig[]>(
      `SELECT
        id as "talentId",
        LOWER(code) as "talentCode",
        subsidiary_id as "subsidiaryId",
        custom_domain as "customDomain",
        custom_domain_verified as "customDomainVerified",
        custom_domain_verification_token as "customDomainVerificationToken",
        custom_domain_ssl_mode as "customDomainSslMode",
        homepage_path as "homepageCustomPath",
        marshmallow_path as "marshmallowCustomPath"
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      talentId
    );

    return results[0] || null;
  }

  async listCustomDomainBindingsForTalent(
    tenantSchema: string,
    legacyConfig: TalentLegacyCustomDomainConfig
  ): Promise<TalentCustomDomainBindingRecord[]> {
    const tenantId = await this.getTenantIdBySchema(tenantSchema);

    if (!tenantId) {
      return [];
    }

    return prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
      `WITH ancestor_subsidiaries AS (
         SELECT s2.id, s2.depth
         FROM "${tenantSchema}".subsidiary s1
         JOIN "${tenantSchema}".subsidiary s2 ON s1.path LIKE s2.path || '%'
         WHERE s1.id = $3::uuid
       )
       SELECT
         binding.id,
         binding.hostname,
         binding.owner_type as "ownerType",
         binding.owner_id as "ownerId",
         binding.custom_domain_verified as "customDomainVerified",
         binding.custom_domain_verification_token as "customDomainVerificationToken",
         binding.custom_domain_ssl_mode as "customDomainSslMode",
         binding.is_active as "isActive",
         ancestor_subsidiaries.depth as "ownerDepth"
       FROM public.custom_domain_binding binding
       LEFT JOIN ancestor_subsidiaries ON (
         binding.owner_type = 'subsidiary'
         AND binding.owner_id = ancestor_subsidiaries.id
       )
       WHERE binding.tenant_id = $1::uuid
         AND binding.is_active = true
         AND (
           (binding.owner_type = 'tenant' AND binding.owner_id IS NULL)
           OR (binding.owner_type = 'talent' AND binding.owner_id = $2::uuid)
           OR (
             binding.owner_type = 'subsidiary'
             AND $3::uuid IS NOT NULL
             AND ancestor_subsidiaries.id IS NOT NULL
           )
         )
       ORDER BY
         CASE binding.owner_type
           WHEN 'talent' THEN 0
           WHEN 'subsidiary' THEN 1
           ELSE 2
         END,
         ancestor_subsidiaries.depth DESC NULLS LAST,
         binding.hostname ASC`,
      tenantId,
      legacyConfig.talentId,
      legacyConfig.subsidiaryId
    );
  }

  async listSelectedInheritedDomainIds(tenantSchema: string, talentId: string): Promise<string[]> {
    const tenantId = await this.getTenantIdBySchema(tenantSchema);

    if (!tenantId) {
      return [];
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT custom_domain_binding_id as id
       FROM public.custom_domain_talent_selection
       WHERE tenant_id = $1::uuid
         AND talent_id = $2::uuid
         AND is_enabled = true`,
      tenantId,
      talentId
    );

    return rows.map((row) => row.id);
  }

  async listCustomDomainBindingsForScope(
    tenantSchema: string,
    options: TalentCustomDomainBindingListOptions
  ): Promise<TalentCustomDomainBindingRecord[]> {
    const tenantId = await this.getTenantIdBySchema(tenantSchema);

    if (!tenantId) {
      return [];
    }

    const search = options.search?.trim().toLowerCase();
    const activeClause = options.includeInactive ? '' : 'AND binding.is_active = true';
    const searchClause = search ? 'AND LOWER(binding.hostname) LIKE $3' : '';
    const searchParam = search ? `%${search}%` : undefined;

    if (options.scopeType === 'tenant') {
      const params = searchParam ? [tenantId, searchParam] : [tenantId];
      const tenantSearchClause = search ? 'AND LOWER(binding.hostname) LIKE $2' : '';

      return prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
        `SELECT
          binding.id,
          binding.hostname,
          binding.owner_type as "ownerType",
          binding.owner_id as "ownerId",
          binding.custom_domain_verified as "customDomainVerified",
          binding.custom_domain_verification_token as "customDomainVerificationToken",
          binding.custom_domain_ssl_mode as "customDomainSslMode",
          binding.is_active as "isActive",
          NULL::integer as "ownerDepth"
         FROM public.custom_domain_binding binding
         WHERE binding.tenant_id = $1::uuid
           AND binding.owner_type = 'tenant'
           AND binding.owner_id IS NULL
           ${activeClause}
           ${tenantSearchClause}
         ORDER BY binding.hostname ASC`,
        ...params
      );
    }

    if (!options.scopeId) {
      return [];
    }

    if (options.scopeType === 'subsidiary') {
      const params = searchParam
        ? [tenantId, options.scopeId, searchParam]
        : [tenantId, options.scopeId];
      const ownerClause = options.includeInherited
        ? `(
             (binding.owner_type = 'tenant' AND binding.owner_id IS NULL)
             OR (
               binding.owner_type = 'subsidiary'
               AND ancestor_subsidiaries.id IS NOT NULL
             )
           )`
        : `(binding.owner_type = 'subsidiary' AND binding.owner_id = $2::uuid)`;

      return prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
        `WITH ancestor_subsidiaries AS (
           SELECT s2.id, s2.depth
           FROM "${tenantSchema}".subsidiary s1
           JOIN "${tenantSchema}".subsidiary s2 ON s1.path LIKE s2.path || '%'
           WHERE s1.id = $2::uuid
         )
         SELECT
           binding.id,
           binding.hostname,
           binding.owner_type as "ownerType",
           binding.owner_id as "ownerId",
           binding.custom_domain_verified as "customDomainVerified",
           binding.custom_domain_verification_token as "customDomainVerificationToken",
           binding.custom_domain_ssl_mode as "customDomainSslMode",
           binding.is_active as "isActive",
           ancestor_subsidiaries.depth as "ownerDepth"
         FROM public.custom_domain_binding binding
         LEFT JOIN ancestor_subsidiaries ON (
           binding.owner_type = 'subsidiary'
           AND binding.owner_id = ancestor_subsidiaries.id
         )
         WHERE binding.tenant_id = $1::uuid
           AND ${ownerClause}
           ${activeClause}
           ${searchClause}
         ORDER BY
           CASE binding.owner_type
             WHEN 'subsidiary' THEN 0
             ELSE 1
           END,
           ancestor_subsidiaries.depth DESC NULLS LAST,
           binding.hostname ASC`,
        ...params
      );
    }

    const params = searchParam
      ? [tenantId, options.scopeId, searchParam]
      : [tenantId, options.scopeId];
    const ownerClause = options.includeInherited
      ? `(
           (binding.owner_type = 'tenant' AND binding.owner_id IS NULL)
           OR (binding.owner_type = 'talent' AND binding.owner_id = talent_scope.id)
           OR (
             binding.owner_type = 'subsidiary'
             AND talent_scope.subsidiary_id IS NOT NULL
             AND ancestor_subsidiaries.id IS NOT NULL
           )
         )`
      : `(binding.owner_type = 'talent' AND binding.owner_id = talent_scope.id)`;

    return prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
      `WITH talent_scope AS (
         SELECT id, subsidiary_id
         FROM "${tenantSchema}".talent
         WHERE id = $2::uuid
       ),
       ancestor_subsidiaries AS (
         SELECT s2.id, s2.depth
         FROM talent_scope talent
         JOIN "${tenantSchema}".subsidiary s1 ON s1.id = talent.subsidiary_id
         JOIN "${tenantSchema}".subsidiary s2 ON s1.path LIKE s2.path || '%'
       )
       SELECT
         binding.id,
         binding.hostname,
         binding.owner_type as "ownerType",
         binding.owner_id as "ownerId",
         binding.custom_domain_verified as "customDomainVerified",
         binding.custom_domain_verification_token as "customDomainVerificationToken",
         binding.custom_domain_ssl_mode as "customDomainSslMode",
         binding.is_active as "isActive",
         ancestor_subsidiaries.depth as "ownerDepth"
       FROM public.custom_domain_binding binding
       CROSS JOIN talent_scope
       LEFT JOIN ancestor_subsidiaries ON (
         binding.owner_type = 'subsidiary'
         AND binding.owner_id = ancestor_subsidiaries.id
       )
       WHERE binding.tenant_id = $1::uuid
         AND ${ownerClause}
         ${activeClause}
         ${searchClause}
       ORDER BY
         CASE binding.owner_type
           WHEN 'talent' THEN 0
           WHEN 'subsidiary' THEN 1
           ELSE 2
         END,
         ancestor_subsidiaries.depth DESC NULLS LAST,
         binding.hostname ASC`,
      ...params
    );
  }

  async customDomainOwnerExists(
    tenantSchema: string,
    ownerType: CustomDomainOwnerType,
    ownerId: string | null
  ): Promise<boolean> {
    if (ownerType === 'tenant') {
      return (await this.getTenantIdBySchema(tenantSchema)) !== null;
    }

    if (!ownerId) {
      return false;
    }

    const table = ownerType === 'subsidiary' ? 'subsidiary' : 'talent';
    const results = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".${table}
       WHERE id = $1::uuid
       LIMIT 1`,
      ownerId
    );

    return results.length > 0;
  }

  async findCustomDomainBindingById(
    tenantSchema: string,
    domainId: string
  ): Promise<TalentCustomDomainBindingRecord | null> {
    const results = await prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
      `SELECT
        binding.id,
        binding.hostname,
        binding.owner_type as "ownerType",
        binding.owner_id as "ownerId",
        binding.custom_domain_verified as "customDomainVerified",
        binding.custom_domain_verification_token as "customDomainVerificationToken",
        binding.custom_domain_ssl_mode as "customDomainSslMode",
        binding.is_active as "isActive",
        NULL::integer as "ownerDepth"
       FROM public.custom_domain_binding binding
       JOIN public.tenant tenant ON tenant.id = binding.tenant_id
       WHERE tenant.schema_name = $1
         AND binding.id = $2::uuid
       LIMIT 1`,
      tenantSchema,
      domainId
    );

    return results[0] ?? null;
  }

  async findCustomDomainBindingByHostname(
    hostname: string,
    excludeDomainId: string | null = null
  ): Promise<TalentCustomDomainBindingRecord | null> {
    const results = await prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
      `SELECT
        id,
        hostname,
        owner_type as "ownerType",
        owner_id as "ownerId",
        custom_domain_verified as "customDomainVerified",
        custom_domain_verification_token as "customDomainVerificationToken",
        custom_domain_ssl_mode as "customDomainSslMode",
        is_active as "isActive",
        NULL::integer as "ownerDepth"
       FROM public.custom_domain_binding
       WHERE hostname = $1
         AND ($2::uuid IS NULL OR id != $2::uuid)
       LIMIT 1`,
      hostname,
      excludeDomainId
    );

    return results[0] ?? null;
  }

  async findLegacyCustomDomainOwner(
    hostname: string
  ): Promise<{ tenantSchema: string; talentId: string } | null> {
    const tenants = await prisma.$queryRawUnsafe<Array<{ tenantSchema: string }>>(
      `SELECT schema_name as "tenantSchema"
       FROM public.tenant
       WHERE is_active = true
       ORDER BY schema_name ASC`
    );

    for (const tenant of tenants) {
      try {
        const talents = await prisma.$queryRawUnsafe<Array<{ talentId: string }>>(
          `SELECT id as "talentId"
           FROM "${tenant.tenantSchema}".talent
           WHERE LOWER(custom_domain) = $1
           LIMIT 1`,
          hostname
        );

        if (talents[0]) {
          return {
            tenantSchema: tenant.tenantSchema,
            talentId: talents[0].talentId,
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  async createCustomDomainBinding(
    tenantSchema: string,
    input: TalentCustomDomainBindingMutationInput,
    token: string
  ): Promise<TalentCustomDomainBindingRecord | null> {
    const results = await prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
      `INSERT INTO public.custom_domain_binding (
         tenant_id,
         owner_type,
         owner_id,
         hostname,
         custom_domain_verified,
         custom_domain_verification_token,
         custom_domain_ssl_mode,
         is_active
       )
       SELECT
         tenant.id,
         $2,
         $3::uuid,
         $4,
         false,
         $5,
         $6,
         $7
       FROM public.tenant tenant
       WHERE tenant.schema_name = $1
       RETURNING
         id,
         hostname,
         owner_type as "ownerType",
         owner_id as "ownerId",
         custom_domain_verified as "customDomainVerified",
         custom_domain_verification_token as "customDomainVerificationToken",
         custom_domain_ssl_mode as "customDomainSslMode",
         is_active as "isActive",
         NULL::integer as "ownerDepth"`,
      tenantSchema,
      input.ownerType,
      input.ownerId,
      input.hostname,
      token,
      input.customDomainSslMode,
      input.isActive
    );

    return results[0] ?? null;
  }

  async updateCustomDomainBinding(
    tenantSchema: string,
    domainId: string,
    input: TalentCustomDomainBindingMutationInput,
    token: string | null
  ): Promise<TalentCustomDomainBindingRecord | null> {
    const results = await prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
      `UPDATE public.custom_domain_binding binding
       SET
         owner_type = $3,
         owner_id = $4::uuid,
         hostname = $5,
         custom_domain_verified = CASE
           WHEN binding.hostname = $5 THEN binding.custom_domain_verified
           ELSE false
         END,
         custom_domain_verification_token = CASE
           WHEN binding.hostname = $5 THEN binding.custom_domain_verification_token
           ELSE $6
         END,
         custom_domain_ssl_mode = $7,
         is_active = $8,
         updated_at = now()
       FROM public.tenant tenant
       WHERE tenant.id = binding.tenant_id
         AND tenant.schema_name = $1
         AND binding.id = $2::uuid
       RETURNING
         binding.id,
         binding.hostname,
         binding.owner_type as "ownerType",
         binding.owner_id as "ownerId",
         binding.custom_domain_verified as "customDomainVerified",
         binding.custom_domain_verification_token as "customDomainVerificationToken",
         binding.custom_domain_ssl_mode as "customDomainSslMode",
         binding.is_active as "isActive",
         NULL::integer as "ownerDepth"`,
      tenantSchema,
      domainId,
      input.ownerType,
      input.ownerId,
      input.hostname,
      token,
      input.customDomainSslMode,
      input.isActive
    );

    return results[0] ?? null;
  }

  async markCustomDomainBindingVerified(
    tenantSchema: string,
    domainId: string
  ): Promise<TalentCustomDomainBindingRecord | null> {
    const results = await prisma.$queryRawUnsafe<TalentCustomDomainBindingRecord[]>(
      `UPDATE public.custom_domain_binding binding
       SET custom_domain_verified = true, updated_at = now()
       FROM public.tenant tenant
       WHERE tenant.id = binding.tenant_id
         AND tenant.schema_name = $1
         AND binding.id = $2::uuid
       RETURNING
         binding.id,
         binding.hostname,
         binding.owner_type as "ownerType",
         binding.owner_id as "ownerId",
         binding.custom_domain_verified as "customDomainVerified",
         binding.custom_domain_verification_token as "customDomainVerificationToken",
         binding.custom_domain_ssl_mode as "customDomainSslMode",
         binding.is_active as "isActive",
         NULL::integer as "ownerDepth"`,
      tenantSchema,
      domainId
    );

    return results[0] ?? null;
  }

  async replaceSelectedInheritedDomainIds(
    tenantSchema: string,
    talentId: string,
    domainIds: string[]
  ): Promise<void> {
    const tenantId = await this.getTenantIdBySchema(tenantSchema);

    if (!tenantId) {
      return;
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRawUnsafe(
        `UPDATE public.custom_domain_talent_selection
         SET is_enabled = false, updated_at = now()
         WHERE tenant_id = $1::uuid
           AND talent_id = $2::uuid`,
        tenantId,
        talentId
      );

      for (const domainId of domainIds) {
        await transaction.$queryRawUnsafe(
          `INSERT INTO public.custom_domain_talent_selection (
             tenant_id,
             custom_domain_binding_id,
             talent_id,
             is_enabled
           ) VALUES ($1::uuid, $2::uuid, $3::uuid, true)
           ON CONFLICT (custom_domain_binding_id, talent_id)
           DO UPDATE SET
             tenant_id = EXCLUDED.tenant_id,
             is_enabled = true,
             updated_at = now()`,
          tenantId,
          domainId,
          talentId
        );
      }
    });
  }

  async clearCustomDomain(talentId: string, tenantSchema: string): Promise<boolean> {
    const removed = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE "${tenantSchema}".talent
       SET
         custom_domain = NULL,
         custom_domain_verified = false,
         custom_domain_verification_token = NULL,
         updated_at = now()
       WHERE id = $1::uuid
       RETURNING id`,
      talentId
    );

    return removed.length > 0;
  }

  async findTalentIdByCustomDomain(
    tenantSchema: string,
    customDomain: string,
    talentId: string
  ): Promise<string | null> {
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".talent
       WHERE custom_domain = $1 AND id != $2::uuid`,
      customDomain,
      talentId
    );

    return existing[0]?.id ?? null;
  }

  async setCustomDomain(
    talentId: string,
    tenantSchema: string,
    customDomain: string,
    token: string
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
      token
    );

    return updated.length > 0;
  }

  markCustomDomainVerified(talentId: string, tenantSchema: string) {
    return prisma.$queryRawUnsafe(
      `UPDATE "${tenantSchema}".talent
       SET custom_domain_verified = true, updated_at = now()
       WHERE id = $1::uuid`,
      talentId
    );
  }

  async getServicePaths(
    talentId: string,
    tenantSchema: string
  ): Promise<TalentCustomDomainPaths | null> {
    const current = await prisma.$queryRawUnsafe<TalentCustomDomainPaths[]>(
      `SELECT
        homepage_path as "homepageCustomPath",
        marshmallow_path as "marshmallowCustomPath"
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      talentId
    );

    return current[0] || null;
  }

  async updateServicePaths(
    talentId: string,
    tenantSchema: string,
    paths: TalentCustomDomainPaths
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
      ...params
    );

    return results[0] || null;
  }

  async updateSslMode(
    talentId: string,
    tenantSchema: string,
    sslMode: CustomDomainSslMode
  ): Promise<{ customDomainSslMode: string } | null> {
    const results = await prisma.$queryRawUnsafe<Array<{ customDomainSslMode: string }>>(
      `UPDATE "${tenantSchema}".talent
       SET custom_domain_ssl_mode = $2, updated_at = now()
       WHERE id = $1::uuid
       RETURNING custom_domain_ssl_mode as "customDomainSslMode"`,
      talentId,
      sslMode
    );

    return results[0] || null;
  }
}
