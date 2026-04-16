// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type { ScopeOwnSettingsRecord, SettingsScopeType } from '../domain/settings.policy';

interface TenantRecord {
  id: string;
  settings: Record<string, unknown> | null;
}

interface SubsidiaryRecord {
  id: string;
  path: string;
  version: number;
}

interface TalentRecord {
  id: string;
  subsidiaryId: string | null;
  settings: Record<string, unknown> | null;
  version: number;
}

@Injectable()
export class SettingsRepository {
  async findTenantBySchema(tenantSchema: string): Promise<TenantRecord | null> {
    const tenants = await prisma.$queryRawUnsafe<TenantRecord[]>(
      `
        SELECT id, settings
        FROM public.tenant
        WHERE schema_name = $1
      `,
      tenantSchema,
    );

    return tenants[0] ?? null;
  }

  async findSubsidiaryById(
    tenantSchema: string,
    subsidiaryId: string,
  ): Promise<SubsidiaryRecord | null> {
    const subsidiaries = await prisma.$queryRawUnsafe<
      Array<{ id: string; path: string; version: number }>
    >(
      `
        SELECT id, path, version
        FROM "${tenantSchema}".subsidiary
        WHERE id = $1::uuid
      `,
      subsidiaryId,
    );

    return subsidiaries[0] ?? null;
  }

  async listSubsidiariesByCodes(
    tenantSchema: string,
    codes: string[],
  ): Promise<Array<{ id: string; code: string }>> {
    if (codes.length === 0) {
      return [];
    }

    const placeholders = codes.map((_, index) => `$${index + 1}`).join(', ');

    return prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `
        SELECT id, code
        FROM "${tenantSchema}".subsidiary
        WHERE code IN (${placeholders})
        ORDER BY depth ASC
      `,
      ...codes,
    );
  }

  async findTalentById(tenantSchema: string, talentId: string): Promise<TalentRecord | null> {
    const talents = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        subsidiaryId: string | null;
        settings: Record<string, unknown> | null;
        version: number;
      }>
    >(
      `
        SELECT id, subsidiary_id as "subsidiaryId", settings, version
        FROM "${tenantSchema}".talent
        WHERE id = $1::uuid
      `,
      talentId,
    );

    return talents[0] ?? null;
  }

  async findScopeSettingsRecord(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
  ): Promise<ScopeOwnSettingsRecord | null> {
    try {
      const query = scopeId
        ? `SELECT settings, version FROM "${tenantSchema}".scope_settings WHERE scope_type = $1 AND scope_id = $2::uuid`
        : `SELECT settings, version FROM "${tenantSchema}".scope_settings WHERE scope_type = $1 AND scope_id IS NULL`;
      const params = scopeId ? [scopeType, scopeId] : [scopeType];
      const result = await prisma.$queryRawUnsafe<ScopeOwnSettingsRecord[]>(query, ...params);

      return result[0] ?? null;
    } catch {
      return null;
    }
  }

  async updateTenantSettings(
    tenantSchema: string,
    settings: Record<string, unknown>,
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
        UPDATE public.tenant
        SET settings = $1::jsonb, updated_at = NOW()
        WHERE schema_name = $2
      `,
      JSON.stringify(settings),
      tenantSchema,
    );
  }

  async updateTalentSettings(params: {
    tenantSchema: string;
    talentId: string;
    settings: Record<string, unknown>;
    version: number;
    userId: string;
  }): Promise<void> {
    const { settings, talentId, tenantSchema, userId, version } = params;

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".talent
        SET settings = $1::jsonb, version = $2, updated_by = $3::uuid, updated_at = NOW()
        WHERE id = $4::uuid
      `,
      JSON.stringify(settings),
      version,
      userId,
      talentId,
    );
  }

  async upsertScopeSettings(params: {
    tenantSchema: string;
    scopeType: SettingsScopeType;
    scopeId: string | null;
    settings: Record<string, unknown>;
    version: number;
    userId: string;
  }): Promise<void> {
    const { scopeId, scopeType, settings, tenantSchema, userId, version } = params;
    await this.ensureScopeSettingsTable(tenantSchema);

    if (scopeId) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "${tenantSchema}".scope_settings (scope_type, scope_id, settings, version, updated_by, updated_at)
          VALUES ($1, $2::uuid, $3::jsonb, $4, $5::uuid, NOW())
          ON CONFLICT (scope_type, scope_id)
          DO UPDATE SET settings = $3::jsonb, version = $4, updated_by = $5::uuid, updated_at = NOW()
        `,
        scopeType,
        scopeId,
        JSON.stringify(settings),
        version,
        userId,
      );
      return;
    }

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".scope_settings (scope_type, scope_id, settings, version, updated_by, updated_at)
        VALUES ($1, NULL, $2::jsonb, $3, $4::uuid, NOW())
        ON CONFLICT (scope_type, scope_id) WHERE scope_id IS NULL
        DO UPDATE SET settings = $2::jsonb, version = $3, updated_by = $4::uuid, updated_at = NOW()
      `,
      scopeType,
      JSON.stringify(settings),
      version,
      userId,
    );
  }

  async ensureScopeSettingsTable(tenantSchema: string): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
        CREATE TABLE IF NOT EXISTS "${tenantSchema}".scope_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          scope_type VARCHAR(20) NOT NULL,
          scope_id UUID,
          settings JSONB NOT NULL DEFAULT '{}',
          version INT NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID,
          UNIQUE(scope_type, scope_id)
        )
      `,
    );
  }
}
