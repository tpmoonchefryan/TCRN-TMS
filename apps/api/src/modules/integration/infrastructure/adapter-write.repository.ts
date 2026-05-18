// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import type { IntegrationAdapterPlatformBindingDefinition, LocalizedText } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import {
  readLocalizedText,
  stringifyLocalizedText,
} from '../../../platform/persistence/localized-text.persistence';
import type { IntegrationAdapterOwnerScope } from '../domain/adapter-read.policy';
import type {
  IntegrationAdapterMutationRecord,
  IntegrationAdapterOverrideRecord,
  IntegrationAdapterPlatformRecord,
  IntegrationAdapterStoredConfigRecord,
} from '../domain/adapter-write.policy';

export interface AdapterCreatePersistenceInput {
  ownerType: string;
  ownerId: string | null;
  platformId: string;
  code: string;
  name: LocalizedText;
  extraData: Record<string, unknown> | null;
  adapterType: string;
  inherit: boolean;
  userId: string | null;
}

export interface AdapterUpdatePersistenceInput {
  name: LocalizedText;
  extraData: Record<string, unknown> | null;
  inherit: boolean;
  userId: string | null;
}

export interface AdapterConfigPersistenceInput {
  configKey: string;
  configValue: string;
  isSecret: boolean;
}

@Injectable()
export class AdapterWriteRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  withTransaction<T>(
    operation: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((prisma) => operation(prisma));
  }

  async findPlatformById(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    platformId: string,
  ): Promise<IntegrationAdapterPlatformRecord | null> {
    const rows = await prisma.$queryRawUnsafe<IntegrationAdapterPlatformRecord[]>(
      `
        SELECT
          id,
          code,
          name,
          display_name as "displayName",
          icon_url as "iconUrl"
        FROM "${tenantSchema}".social_platform
        WHERE id = $1::uuid
        LIMIT 1
      `,
      platformId,
    );

    return rows[0] ?? null;
  }

  async findPlatformByCode(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    platformCode: string,
  ): Promise<IntegrationAdapterPlatformRecord | null> {
    const rows = await prisma.$queryRawUnsafe<IntegrationAdapterPlatformRecord[]>(
      `
        SELECT
          id,
          code,
          name,
          display_name as "displayName",
          icon_url as "iconUrl"
        FROM "${tenantSchema}".social_platform
        WHERE code = $1
        LIMIT 1
      `,
      platformCode,
    );

    return rows[0] ?? null;
  }

  async ensurePlatformForDefinition(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    platform: IntegrationAdapterPlatformBindingDefinition,
  ): Promise<IntegrationAdapterPlatformRecord> {
    const rows = await prisma.$queryRawUnsafe<IntegrationAdapterPlatformRecord[]>(
      `
        INSERT INTO "${tenantSchema}".social_platform (
          id,
          code,
          name,
          display_name,
          icon_url,
          base_url,
          profile_url_template,
          color,
          sort_order,
          is_active,
          is_force_use,
          is_system,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2::jsonb,
          $3,
          $4,
          $5,
          NULL,
          $6,
          900,
          true,
          true,
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          display_name = EXCLUDED.display_name,
          icon_url = EXCLUDED.icon_url,
          base_url = EXCLUDED.base_url,
          color = EXCLUDED.color,
          is_active = true,
          is_force_use = true,
          is_system = true,
          updated_at = NOW()
        RETURNING
          id,
          code,
          name,
          display_name as "displayName",
          icon_url as "iconUrl"
      `,
      platform.code,
      stringifyLocalizedText(platform.name),
      platform.displayName,
      platform.iconUrl ?? null,
      platform.baseUrl ?? null,
      platform.color ?? null,
    );

    return rows[0];
  }

  async findByCode(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    scope: IntegrationAdapterOwnerScope,
    code: string,
  ): Promise<{ id: string } | null> {
    const ownerScope = this.buildOwnerMatch('ia', 1, scope);
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT ia.id
        FROM "${tenantSchema}".integration_adapter ia
        WHERE ${ownerScope.clause}
          AND ia.code = $${ownerScope.nextIndex}
        LIMIT 1
      `,
      ...ownerScope.params,
      code,
    );

    return rows[0] ?? null;
  }

  async findByPlatformAndType(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    scope: IntegrationAdapterOwnerScope,
    platformId: string,
    adapterType: string,
  ): Promise<{ id: string } | null> {
    const ownerScope = this.buildOwnerMatch('ia', 1, scope);
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT ia.id
        FROM "${tenantSchema}".integration_adapter ia
        WHERE ${ownerScope.clause}
          AND ia.platform_id = $${ownerScope.nextIndex}::uuid
          AND ia.adapter_type = $${ownerScope.nextIndex + 1}
        LIMIT 1
      `,
      ...ownerScope.params,
      platformId,
      adapterType,
    );

    return rows[0] ?? null;
  }

  async create(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    input: AdapterCreatePersistenceInput,
  ): Promise<string> {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantSchema}".integration_adapter (
          id,
          owner_type,
          owner_id,
          platform_id,
          code,
          name,
          extra_data,
          adapter_type,
          inherit,
          is_active,
          created_at,
          updated_at,
          created_by,
          updated_by
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2::uuid,
          $3::uuid,
          $4,
          $5::jsonb,
          $6::jsonb,
          $7,
          $8,
          true,
          NOW(),
          NOW(),
          $9::uuid,
          $9::uuid
        )
        RETURNING id
      `,
      input.ownerType,
      input.ownerId,
      input.platformId,
      input.code,
      stringifyLocalizedText(input.name),
      input.extraData ? JSON.stringify(input.extraData) : null,
      input.adapterType,
      input.inherit,
      input.userId,
    );

    return rows[0]?.id ?? '';
  }

  async upsertConfigs(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
    configs: AdapterConfigPersistenceInput[],
  ): Promise<void> {
    for (const config of configs) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "${tenantSchema}".adapter_config (
            id,
            adapter_id,
            config_key,
            config_value,
            is_secret,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            $1::uuid,
            $2,
            $3,
            $4,
            NOW(),
            NOW()
          )
          ON CONFLICT (adapter_id, config_key)
          DO UPDATE SET
            config_value = EXCLUDED.config_value,
            is_secret = EXCLUDED.is_secret,
            updated_at = NOW()
        `,
        adapterId,
        config.configKey,
        config.configValue,
        config.isSecret,
      );
    }
  }

  deleteConfig(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
    configKey: string,
  ): Promise<number> {
    return prisma.$executeRawUnsafe(
      `
        DELETE FROM "${tenantSchema}".adapter_config
        WHERE adapter_id = $1::uuid
          AND config_key = $2
      `,
      adapterId,
      configKey,
    );
  }

  async findById(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
  ): Promise<IntegrationAdapterMutationRecord | null> {
    const rows = await prisma.$queryRawUnsafe<IntegrationAdapterMutationRecord[]>(
      `
        SELECT
          id,
          owner_type as "ownerType",
          owner_id as "ownerId",
          platform_id as "platformId",
          code,
          name,
          extra_data as "extraData",
          adapter_type as "adapterType",
          inherit,
          is_active as "isActive",
          created_by as "createdBy",
          updated_by as "updatedBy",
          version
        FROM "${tenantSchema}".integration_adapter
        WHERE id = $1::uuid
        LIMIT 1
      `,
      adapterId,
    );

    const row = rows[0];
    return row
      ? {
          ...row,
          name: readLocalizedText(row.name, 'integration_adapter.name'),
        }
      : null;
  }

  update(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
    input: AdapterUpdatePersistenceInput,
  ): Promise<number> {
    return prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".integration_adapter
        SET
          name = $2::jsonb,
          extra_data = $3::jsonb,
          inherit = $4,
          updated_by = $5::uuid,
          version = version + 1,
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      adapterId,
      stringifyLocalizedText(input.name),
      input.extraData ? JSON.stringify(input.extraData) : null,
      input.inherit,
      input.userId,
    );
  }

  async incrementVersion(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
    userId: string | null,
  ): Promise<number | null> {
    const rows = await prisma.$queryRawUnsafe<Array<{ version: number }>>(
      `
        UPDATE "${tenantSchema}".integration_adapter
        SET
          version = version + 1,
          updated_by = $2::uuid,
          updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING version
      `,
      adapterId,
      userId,
    );

    return rows[0]?.version ?? null;
  }

  async findConfig(
    tenantSchema: string,
    adapterId: string,
    configKey: string,
  ): Promise<IntegrationAdapterStoredConfigRecord | null> {
    const rows = await this.prisma.$queryRawUnsafe<IntegrationAdapterStoredConfigRecord[]>(
      `
        SELECT
          id,
          config_key as "configKey",
          config_value as "configValue",
          is_secret as "isSecret"
        FROM "${tenantSchema}".adapter_config
        WHERE adapter_id = $1::uuid
          AND config_key = $2
        LIMIT 1
      `,
      adapterId,
      configKey,
    );

    return rows[0] ?? null;
  }

  async findDisabledOverride(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
    scope: IntegrationAdapterOwnerScope,
  ): Promise<IntegrationAdapterOverrideRecord | null> {
    const rows = await prisma.$queryRawUnsafe<IntegrationAdapterOverrideRecord[]>(
      `
        SELECT is_disabled as "isDisabled"
        FROM "${tenantSchema}".config_override
        WHERE entity_type = 'integration_adapter'
          AND entity_id = $1::uuid
          AND owner_type = $2
          AND owner_id = $3::uuid
        LIMIT 1
      `,
      adapterId,
      scope.ownerType,
      scope.ownerId,
    );

    return rows[0] ?? null;
  }

  upsertDisabledOverride(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
    scope: IntegrationAdapterOwnerScope,
    userId: string | null,
  ): Promise<number> {
    return prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".config_override (
          id,
          entity_type,
          entity_id,
          owner_type,
          owner_id,
          is_disabled,
          created_at,
          updated_at,
          created_by,
          updated_by
        ) VALUES (
          gen_random_uuid(),
          'integration_adapter',
          $1::uuid,
          $2,
          $3::uuid,
          true,
          NOW(),
          NOW(),
          $4::uuid,
          $4::uuid
        )
        ON CONFLICT (entity_type, entity_id, owner_type, owner_id)
        DO UPDATE SET
          is_disabled = true,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      `,
      adapterId,
      scope.ownerType,
      scope.ownerId,
      userId,
    );
  }

  deleteDisabledOverride(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
    scope: IntegrationAdapterOwnerScope,
  ): Promise<number> {
    return prisma.$executeRawUnsafe(
      `
        DELETE FROM "${tenantSchema}".config_override
        WHERE entity_type = 'integration_adapter'
          AND entity_id = $1::uuid
          AND owner_type = $2
          AND owner_id = $3::uuid
      `,
      adapterId,
      scope.ownerType,
      scope.ownerId,
    );
  }

  setActiveStatus(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    adapterId: string,
    isActive: boolean,
    userId: string | null,
  ): Promise<number> {
    return prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".integration_adapter
        SET
          is_active = $2,
          updated_by = $3::uuid,
          version = version + 1,
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      adapterId,
      isActive,
      userId,
    );
  }

  private buildOwnerMatch(
    alias: string,
    startIndex: number,
    scope: IntegrationAdapterOwnerScope,
  ): { clause: string; params: unknown[]; nextIndex: number } {
    const qualifiedAlias = alias ? `${alias}.` : '';

    if (scope.ownerId === null) {
      return {
        clause: `${qualifiedAlias}owner_type = $${startIndex} AND ${qualifiedAlias}owner_id IS NULL`,
        params: [scope.ownerType],
        nextIndex: startIndex + 1,
      };
    }

    return {
      clause: `${qualifiedAlias}owner_type = $${startIndex} AND ${qualifiedAlias}owner_id = $${startIndex + 1}::uuid`,
      params: [scope.ownerType, scope.ownerId],
      nextIndex: startIndex + 2,
    };
  }
}
