// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';

import { Prisma } from '@tcrn/database';
import type { LocalizedText } from '@tcrn/shared';

import {
  readLocalizedText,
  stringifyLocalizedText,
} from '../../../platform/persistence/localized-text.persistence';
import { DatabaseService } from '../../database';
import type {
  PiiServiceConfigConnectionLookupRow,
  PiiServiceConfigCreatePayload,
  PiiServiceConfigCreateRow,
  PiiServiceConfigDetailRow,
  PiiServiceConfigFieldChange,
  PiiServiceConfigListRow,
  PiiServiceConfigUpdateLookupRow,
  PiiServiceConfigUpdateRow,
} from '../domain/pii-service-config.policy';

type PiiServiceConfigListRawRow = Omit<PiiServiceConfigListRow, 'name'> & {
  name: Prisma.JsonValue;
};

type PiiServiceConfigDetailRawRow = Omit<PiiServiceConfigDetailRow, 'name' | 'description'> & {
  name: Prisma.JsonValue;
  description: Prisma.JsonValue;
};

type PiiServiceConfigCreateRawRow = Omit<PiiServiceConfigCreateRow, 'name'> & {
  name: Prisma.JsonValue;
};

type PiiServiceConfigUpdateLookupRawRow = Omit<
  PiiServiceConfigUpdateLookupRow,
  'name' | 'description'
> & {
  name: Prisma.JsonValue;
  description: Prisma.JsonValue;
};

type PiiServiceConfigUpdateRawRow = Omit<PiiServiceConfigUpdateRow, 'name' | 'description'> & {
  name: Prisma.JsonValue;
  description: Prisma.JsonValue;
};

const mapListRow = (row: PiiServiceConfigListRawRow): PiiServiceConfigListRow => ({
  ...row,
  name: readLocalizedText(row.name, 'pii_service_config.name'),
});

const mapDetailRow = (row: PiiServiceConfigDetailRawRow): PiiServiceConfigDetailRow => ({
  ...row,
  name: readLocalizedText(row.name, 'pii_service_config.name'),
  description: readLocalizedText(row.description, 'pii_service_config.description'),
});

const mapCreateRow = (row: PiiServiceConfigCreateRawRow): PiiServiceConfigCreateRow => ({
  ...row,
  name: readLocalizedText(row.name, 'pii_service_config.name'),
});

const mapUpdateLookupRow = (
  row: PiiServiceConfigUpdateLookupRawRow
): PiiServiceConfigUpdateLookupRow => ({
  ...row,
  name: readLocalizedText(row.name, 'pii_service_config.name'),
  description: readLocalizedText(row.description, 'pii_service_config.description'),
});

const mapUpdateRow = (row: PiiServiceConfigUpdateRawRow): PiiServiceConfigUpdateRow => ({
  ...row,
  name: readLocalizedText(row.name, 'pii_service_config.name'),
  description: readLocalizedText(row.description, 'pii_service_config.description'),
});

@Injectable()
export class PiiServiceConfigRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findMany(
    schema: string,
    includeInactive: boolean,
    pageSize: number,
    offset: number
  ): Promise<PiiServiceConfigListRow[]> {
    const prisma = this.databaseService.getPrisma();
    const whereClause = includeInactive ? '1=1' : 'psc.is_active = true';

    const rows = await prisma.$queryRawUnsafe<PiiServiceConfigListRawRow[]>(
      `
        SELECT
          psc.id, psc.code,
          psc.name,
          psc.api_url as "apiUrl",
          psc.auth_type as "authType",
          psc.is_healthy as "isHealthy",
          psc.last_health_check_at as "lastHealthCheckAt",
          psc.is_active as "isActive",
          psc.created_at as "createdAt",
          psc.version
        FROM "${schema}".pii_service_config psc
        WHERE ${whereClause}
        ORDER BY psc.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      pageSize,
      offset
    );

    return rows.map(mapListRow);
  }

  async countMany(schema: string, includeInactive: boolean): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const whereClause = includeInactive ? '1=1' : 'psc.is_active = true';
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".pii_service_config psc
        WHERE ${whereClause}
      `
    );

    return Number(result[0]?.count ?? 0);
  }

  async countProfileStoresByConfigId(schema: string, configId: string): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".profile_store
        WHERE pii_service_config_id = $1::uuid
      `,
      configId
    );

    return Number(result[0]?.count ?? 0);
  }

  async findById(schema: string, id: string): Promise<PiiServiceConfigDetailRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<PiiServiceConfigDetailRawRow[]>(
      `
        SELECT
          id, code,
          name,
          description,
          api_url as "apiUrl",
          auth_type as "authType",
          health_check_url as "healthCheckUrl",
          health_check_interval_sec as "healthCheckIntervalSec",
          is_healthy as "isHealthy",
          last_health_check_at as "lastHealthCheckAt",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM "${schema}".pii_service_config
        WHERE id = $1::uuid
      `,
      id
    );

    return result[0] ? mapDetailRow(result[0]) : null;
  }

  async findForUpdate(schema: string, id: string): Promise<PiiServiceConfigUpdateLookupRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<PiiServiceConfigUpdateLookupRawRow[]>(
      `
        SELECT
          id, code, name, description, api_url as "apiUrl",
          is_active as "isActive", version
        FROM "${schema}".pii_service_config
        WHERE id = $1::uuid
      `,
      id
    );

    return result[0] ? mapUpdateLookupRow(result[0]) : null;
  }

  async findByCode(schema: string, code: string): Promise<{ id: string } | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schema}".pii_service_config
        WHERE code = $1
      `,
      code
    );

    return result[0] ?? null;
  }

  async findForConnectionTest(
    schema: string,
    id: string
  ): Promise<PiiServiceConfigConnectionLookupRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<PiiServiceConfigConnectionLookupRow[]>(
      `
        SELECT
          id,
          api_url as "apiUrl",
          health_check_url as "healthCheckUrl"
        FROM "${schema}".pii_service_config
        WHERE id = $1::uuid
      `,
      id
    );

    return result[0] ?? null;
  }

  async create(
    schema: string,
    payload: PiiServiceConfigCreatePayload,
    userId: string
  ): Promise<PiiServiceConfigCreateRow> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<PiiServiceConfigCreateRawRow[]>(
      `
        INSERT INTO "${schema}".pii_service_config (
          id, code, name, description,
          api_url, auth_type, health_check_url, health_check_interval_sec,
          is_healthy, is_active, created_at, updated_at, created_by, updated_by, version
        ) VALUES (
          gen_random_uuid(), $1, $2::jsonb, $3::jsonb, $4, $5, $6, $7,
          false, true, now(), now(), $8::uuid, $8::uuid, 1
        )
        RETURNING id, code, name, created_at as "createdAt"
      `,
      payload.code,
      stringifyLocalizedText(payload.name),
      stringifyLocalizedText(payload.description),
      payload.apiUrl,
      payload.authType,
      payload.healthCheckUrl,
      payload.healthCheckIntervalSec,
      userId
    );

    return mapCreateRow(result[0]);
  }

  async update(
    schema: string,
    id: string,
    changes: PiiServiceConfigFieldChange[],
    userId: string
  ): Promise<PiiServiceConfigUpdateRow> {
    const prisma = this.databaseService.getPrisma();
    const updates: string[] = [
      'updated_at = now()',
      'updated_by = $2::uuid',
      'version = version + 1',
    ];
    const params: unknown[] = [id, userId];
    let paramIndex = 3;

    for (const change of changes) {
      const column = this.toSnakeCase(change.field);
      const cast = change.field === 'name' || change.field === 'description' ? '::jsonb' : '';
      updates.push(`${column} = $${paramIndex}${cast}`);
      params.push(cast ? stringifyLocalizedText(change.value as LocalizedText) : change.value);
      paramIndex++;
    }

    const result = await prisma.$queryRawUnsafe<PiiServiceConfigUpdateRawRow[]>(
      `
        UPDATE "${schema}".pii_service_config
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
        RETURNING id, code, name, description, api_url as "apiUrl", is_active as "isActive", version, updated_at as "updatedAt"
      `,
      ...params
    );

    return mapUpdateRow(result[0]);
  }

  async updateHealthStatus(schema: string, id: string, isHealthy: boolean): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${schema}".pii_service_config
        SET is_healthy = $2, last_health_check_at = now()
        WHERE id = $1::uuid
      `,
      id,
      isHealthy
    );
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
