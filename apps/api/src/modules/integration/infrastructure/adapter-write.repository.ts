// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma } from '@tcrn/database';

import { DatabaseService } from '../../database';
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
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData: Record<string, unknown> | null;
  adapterType: string;
  inherit: boolean;
  userId: string | null;
}

export interface AdapterUpdatePersistenceInput {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
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
          name_en,
          name_zh,
          name_ja,
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
          $5,
          $6,
          $7,
          $8::jsonb,
          $9,
          true,
          NOW(),
          NOW(),
          $10::uuid,
          $10::uuid
        )
        RETURNING id
      `,
      input.ownerType,
      input.ownerId,
      input.platformId,
      input.code,
      input.nameEn,
      input.nameZh,
      input.nameJa,
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
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
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

    return rows[0] ?? null;
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
          name_en = $2,
          name_zh = $3,
          name_ja = $4,
          extra_data = $5::jsonb,
          inherit = $6,
          updated_by = $7::uuid,
          version = version + 1,
          updated_at = NOW()
        WHERE id = $1::uuid
      `,
      adapterId,
      input.nameEn,
      input.nameZh,
      input.nameJa,
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
