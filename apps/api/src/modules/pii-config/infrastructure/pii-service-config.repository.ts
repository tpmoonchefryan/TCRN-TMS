// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  PiiServiceConfigConnectionLookupRow,
  PiiServiceConfigCreateRow,
  PiiServiceConfigDetailRow,
  PiiServiceConfigFieldChange,
  PiiServiceConfigListRow,
  PiiServiceConfigUpdateLookupRow,
  PiiServiceConfigUpdateRow,
} from '../domain/pii-service-config.policy';

@Injectable()
export class PiiServiceConfigRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findMany(
    schema: string,
    includeInactive: boolean,
    pageSize: number,
    offset: number,
  ): Promise<PiiServiceConfigListRow[]> {
    const prisma = this.databaseService.getPrisma();
    const whereClause = includeInactive ? '1=1' : 'psc.is_active = true';

    return prisma.$queryRawUnsafe<PiiServiceConfigListRow[]>(
      `
        SELECT
          psc.id, psc.code,
          psc.name_en as "nameEn",
          psc.name_zh as "nameZh",
          psc.name_ja as "nameJa",
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
      offset,
    );
  }

  async countMany(schema: string, includeInactive: boolean): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const whereClause = includeInactive ? '1=1' : 'psc.is_active = true';
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".pii_service_config psc
        WHERE ${whereClause}
      `,
    );

    return Number(result[0]?.count ?? 0);
  }

  async countProfileStoresByConfigId(
    schema: string,
    configId: string,
  ): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".profile_store
        WHERE pii_service_config_id = $1::uuid
      `,
      configId,
    );

    return Number(result[0]?.count ?? 0);
  }

  async findById(
    schema: string,
    id: string,
  ): Promise<PiiServiceConfigDetailRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<PiiServiceConfigDetailRow[]>(
      `
        SELECT
          id, code,
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          description_en as "descriptionEn",
          description_zh as "descriptionZh",
          description_ja as "descriptionJa",
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
      id,
    );

    return result[0] ?? null;
  }

  async findForUpdate(
    schema: string,
    id: string,
  ): Promise<PiiServiceConfigUpdateLookupRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<PiiServiceConfigUpdateLookupRow[]>(
      `
        SELECT
          id, code, name_en as "nameEn", api_url as "apiUrl",
          is_active as "isActive", version
        FROM "${schema}".pii_service_config
        WHERE id = $1::uuid
      `,
      id,
    );

    return result[0] ?? null;
  }

  async findByCode(
    schema: string,
    code: string,
  ): Promise<{ id: string } | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schema}".pii_service_config
        WHERE code = $1
      `,
      code,
    );

    return result[0] ?? null;
  }

  async findForConnectionTest(
    schema: string,
    id: string,
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
      id,
    );

    return result[0] ?? null;
  }

  async create(
    schema: string,
    payload: {
      code: string;
      nameEn: string;
      nameZh: string | null;
      nameJa: string | null;
      descriptionEn: string | null;
      descriptionZh: string | null;
      descriptionJa: string | null;
      apiUrl: string;
      authType: string;
      healthCheckUrl: string;
      healthCheckIntervalSec: number;
    },
    userId: string,
  ): Promise<PiiServiceConfigCreateRow> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<PiiServiceConfigCreateRow[]>(
      `
        INSERT INTO "${schema}".pii_service_config (
          id, code, name_en, name_zh, name_ja,
          description_en, description_zh, description_ja,
          api_url, auth_type, health_check_url, health_check_interval_sec,
          is_healthy, is_active, created_at, updated_at, created_by, updated_by, version
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          false, true, now(), now(), $12::uuid, $12::uuid, 1
        )
        RETURNING id, code, name_en as "nameEn", created_at as "createdAt"
      `,
      payload.code,
      payload.nameEn,
      payload.nameZh,
      payload.nameJa,
      payload.descriptionEn,
      payload.descriptionZh,
      payload.descriptionJa,
      payload.apiUrl,
      payload.authType,
      payload.healthCheckUrl,
      payload.healthCheckIntervalSec,
      userId,
    );

    return result[0];
  }

  async update(
    schema: string,
    id: string,
    changes: PiiServiceConfigFieldChange[],
    userId: string,
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
      updates.push(`${column} = $${paramIndex}`);
      params.push(change.value);
      paramIndex++;
    }

    const result = await prisma.$queryRawUnsafe<PiiServiceConfigUpdateRow[]>(
      `
        UPDATE "${schema}".pii_service_config
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
        RETURNING id, code, name_en as "nameEn", api_url as "apiUrl", is_active as "isActive", version, updated_at as "updatedAt"
      `,
      ...params,
    );

    return result[0];
  }

  async updateHealthStatus(
    schema: string,
    id: string,
    isHealthy: boolean,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${schema}".pii_service_config
        SET is_healthy = $2, last_health_check_at = now()
        WHERE id = $1::uuid
      `,
      id,
      isHealthy,
    );
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
