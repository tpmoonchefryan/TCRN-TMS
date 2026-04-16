// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import { type WebhookRecord } from '../domain/webhook.policy';

@Injectable()
export class WebhookReadRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get prisma() {
    return this.databaseService.getPrisma();
  }

  async findMany(tenantSchema: string | null): Promise<WebhookRecord[]> {
    if (tenantSchema) {
      return this.prisma.$queryRawUnsafe<WebhookRecord[]>(
        `
          SELECT
            id,
            code,
            name_en as "nameEn",
            name_zh as "nameZh",
            name_ja as "nameJa",
            url,
            secret,
            events,
            headers,
            retry_policy as "retryPolicy",
            is_active as "isActive",
            last_triggered_at as "lastTriggeredAt",
            last_status as "lastStatus",
            consecutive_failures as "consecutiveFailures",
            disabled_at as "disabledAt",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy",
            updated_by as "updatedBy",
            version
          FROM "${tenantSchema}".webhook
          ORDER BY created_at DESC
        `,
      );
    }

    return this.prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(
    id: string,
    tenantSchema: string | null,
  ): Promise<WebhookRecord | null> {
    if (tenantSchema) {
      const rows = await this.prisma.$queryRawUnsafe<WebhookRecord[]>(
        `
          SELECT
            id,
            code,
            name_en as "nameEn",
            name_zh as "nameZh",
            name_ja as "nameJa",
            url,
            secret,
            events,
            headers,
            retry_policy as "retryPolicy",
            is_active as "isActive",
            last_triggered_at as "lastTriggeredAt",
            last_status as "lastStatus",
            consecutive_failures as "consecutiveFailures",
            disabled_at as "disabledAt",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy",
            updated_by as "updatedBy",
            version
          FROM "${tenantSchema}".webhook
          WHERE id = $1::uuid
          LIMIT 1
        `,
        id,
      );

      return rows[0] ?? null;
    }

    return this.prisma.webhook.findUnique({
      where: { id },
    });
  }
}
