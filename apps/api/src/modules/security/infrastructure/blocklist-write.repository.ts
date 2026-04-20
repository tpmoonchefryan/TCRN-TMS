// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma } from '@tcrn/database';

import { DatabaseService } from '../../database';
import type {
  BlocklistScopeEntryRow,
  BlocklistWriteLookupRow,
} from '../domain/blocklist-write.policy';
import type { CreateBlocklistDto } from '../dto/security.dto';

@Injectable()
export class BlocklistWriteRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(
    tx: Prisma.TransactionClient,
    tenantSchema: string,
    dto: CreateBlocklistDto & { extraData: Record<string, unknown> | null },
    userId: string,
  ): Promise<{ id: string }> {
    const entries = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `
        INSERT INTO "${tenantSchema}".blocklist_entry (
          id,
          owner_type,
          owner_id,
          pattern,
          pattern_type,
          name_en,
          name_zh,
          name_ja,
          extra_data,
          description,
          category,
          severity,
          action,
          replacement,
          scope,
          inherit,
          sort_order,
          is_active,
          is_force_use,
          is_system,
          match_count,
          created_at,
          updated_at,
          created_by,
          updated_by,
          version
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2::uuid,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::text[],
          $15,
          $16,
          true,
          $17,
          false,
          0,
          NOW(),
          NOW(),
          $18::uuid,
          $18::uuid,
          1
        )
        RETURNING id
      `,
      dto.ownerType,
      dto.ownerId ?? null,
      dto.pattern,
      dto.patternType,
      dto.nameEn,
      dto.nameZh ?? null,
      dto.nameJa ?? null,
      dto.extraData ? JSON.stringify(dto.extraData) : null,
      dto.description ?? null,
      dto.category ?? null,
      dto.severity,
      dto.action,
      dto.replacement ?? '***',
      dto.scope ?? ['marshmallow'],
      dto.inherit ?? true,
      dto.sortOrder ?? 0,
      dto.isForceUse ?? false,
      userId,
    );

    return entries[0];
  }

  async findForWrite(
    tenantSchema: string,
    id: string,
  ): Promise<BlocklistWriteLookupRow | null> {
    const prisma = this.databaseService.getPrisma();
    const entries = await prisma.$queryRawUnsafe<BlocklistWriteLookupRow[]>(
      `
        SELECT
          id,
          extra_data as "extraData",
          name_en as "nameEn",
          name_ja as "nameJa",
          name_zh as "nameZh",
          version
        FROM "${tenantSchema}".blocklist_entry
        WHERE id = $1::uuid
        LIMIT 1
      `,
      id,
    );

    return entries[0] ?? null;
  }

  async update(
    tx: Prisma.TransactionClient,
    tenantSchema: string,
    id: string,
    data: Record<string, unknown>,
    userId: string | null | undefined,
  ): Promise<void> {
    const columnMappings: Record<string, { column: string; cast?: string }> = {
      pattern: { column: 'pattern' },
      patternType: { column: 'pattern_type' },
      nameEn: { column: 'name_en' },
      nameZh: { column: 'name_zh' },
      nameJa: { column: 'name_ja' },
      extraData: { column: 'extra_data', cast: '::jsonb' },
      description: { column: 'description' },
      category: { column: 'category' },
      severity: { column: 'severity' },
      action: { column: 'action' },
      replacement: { column: 'replacement' },
      scope: { column: 'scope', cast: '::text[]' },
      inherit: { column: 'inherit' },
      sortOrder: { column: 'sort_order' },
      isForceUse: { column: 'is_force_use' },
    };
    const params: unknown[] = [id];
    const assignments: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      const mapping = columnMappings[key];

      if (!mapping) {
        continue;
      }

      params.push(
        key === 'extraData' && value && typeof value === 'object'
          ? JSON.stringify(value)
          : value,
      );
      assignments.push(
        `${mapping.column} = $${params.length}${mapping.cast ?? ''}`,
      );
    }

    params.push(userId ?? null);

    await tx.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".blocklist_entry
        SET ${[
          ...assignments,
          `updated_by = $${params.length}::uuid`,
          'updated_at = NOW()',
          'version = version + 1',
        ].join(', ')}
        WHERE id = $1::uuid
      `,
      ...params,
    );
  }

  async deactivate(
    tx: Prisma.TransactionClient,
    tenantSchema: string,
    id: string,
    userId: string | null | undefined,
  ): Promise<void> {
    await tx.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".blocklist_entry
        SET is_active = false,
            updated_by = $2::uuid,
            updated_at = NOW(),
            version = version + 1
        WHERE id = $1::uuid
      `,
      id,
      userId ?? null,
    );
  }

  async findScopeEntryById(
    tenantSchema: string,
    id: string,
  ): Promise<BlocklistScopeEntryRow | null> {
    const prisma = this.databaseService.getPrisma();
    const entries = await prisma.$queryRawUnsafe<BlocklistScopeEntryRow[]>(
      `
        SELECT
          id,
          owner_type as "ownerType",
          owner_id as "ownerId",
          is_force_use as "isForceUse",
          name_en as "nameEn"
        FROM "${tenantSchema}".blocklist_entry
        WHERE id = $1::uuid
      `,
      id,
    );

    return entries[0] ?? null;
  }

  async disableInScope(
    tenantSchema: string,
    id: string,
    scopeType: string,
    scopeId: string | null | undefined,
    userId: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".config_override
          (id, entity_type, entity_id, owner_type, owner_id, is_disabled, created_at, updated_at, created_by, updated_by)
        VALUES
          (gen_random_uuid(), 'blocklist_entry', $1::uuid, $2, $3::uuid, true, now(), now(), $4::uuid, $4::uuid)
        ON CONFLICT (entity_type, entity_id, owner_type, COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid))
        DO UPDATE
        SET is_disabled = true, updated_at = now(), updated_by = $4::uuid
      `,
      id,
      scopeType,
      scopeId ?? null,
      userId,
    );
  }

  async enableInScope(
    tenantSchema: string,
    id: string,
    scopeType: string,
    scopeId: string | null | undefined,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        DELETE FROM "${tenantSchema}".config_override
        WHERE entity_type = 'blocklist_entry'
          AND entity_id = $1::uuid
          AND owner_type = $2
          AND COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') =
            COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000')
      `,
      id,
      scopeType,
      scopeId ?? null,
    );
  }
}
