// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma } from '@tcrn/database';

import { toNullableJsonInput } from '../../../platform/persistence/managed-name-translations';
import { DatabaseService } from '../../database';
import { type WebhookRecord } from '../domain/webhook.policy';

export interface WebhookCreatePersistenceInput {
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData: Record<string, unknown> | null;
  url: string;
  secret: string | null;
  events: string[];
  headers: Prisma.InputJsonObject;
  retryPolicy: Prisma.InputJsonObject;
  userId: string | null;
}

export interface WebhookUpdatePersistenceInput {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData: Record<string, unknown> | null;
  url: string;
  secret: string | null;
  events: string[];
  headers: Prisma.InputJsonObject;
  retryPolicy: Prisma.InputJsonObject;
  userId: string | null;
}

export interface WebhookActiveStatePersistenceInput {
  isActive: boolean;
  disabledAt: Date | null;
  consecutiveFailures: number;
  userId: string | null;
}

function asRecord(
  value: Prisma.JsonValue | Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function mapWebhookRecord<T extends Omit<WebhookRecord, 'extraData'> & { extraData: Prisma.JsonValue | Record<string, unknown> | null }>(
  record: T,
): WebhookRecord {
  return {
    ...record,
    extraData: asRecord(record.extraData),
  };
}

@Injectable()
export class WebhookWriteRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  withTransaction<T>(
    operation: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.databaseService.getPrisma().$transaction((prisma) => operation(prisma));
  }

  async findByCode(
    prisma: Prisma.TransactionClient,
    code: string,
    tenantSchema: string | null,
  ): Promise<{ id: string } | null> {
    if (tenantSchema) {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM "${tenantSchema}".webhook
          WHERE code = $1
          LIMIT 1
        `,
        code,
      );

      return rows[0] ?? null;
    }

    return prisma.webhook.findUnique({
      where: { code },
      select: { id: true },
    });
  }

  async findById(
    prisma: Prisma.TransactionClient,
    id: string,
    tenantSchema: string | null,
  ): Promise<WebhookRecord | null> {
    if (tenantSchema) {
      const rows = await prisma.$queryRawUnsafe<WebhookRecord[]>(
        `
          SELECT
            id,
            code,
            name_en as "nameEn",
            name_zh as "nameZh",
            name_ja as "nameJa",
            extra_data as "extraData",
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

    const record = await prisma.webhook.findUnique({
      where: { id },
    });

    return record ? mapWebhookRecord(record) : null;
  }

  async create(
    prisma: Prisma.TransactionClient,
    tenantSchema: string | null,
    input: WebhookCreatePersistenceInput,
  ): Promise<string> {
    if (tenantSchema) {
      const created = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          INSERT INTO "${tenantSchema}".webhook (
            id,
            code,
            name_en,
            name_zh,
            name_ja,
            extra_data,
            url,
            secret,
            events,
            headers,
            retry_policy,
            is_active,
            consecutive_failures,
            created_at,
            updated_at,
            created_by,
            updated_by
          ) VALUES (
            gen_random_uuid(),
            $1,
            $2,
            $3,
            $4,
            $5::jsonb,
            $6,
            $7,
            $8::varchar[],
            $9::jsonb,
            $10::jsonb,
            true,
            0,
            NOW(),
            NOW(),
            $11::uuid,
            $11::uuid
          )
          RETURNING id
        `,
        input.code,
        input.nameEn,
        input.nameZh,
        input.nameJa,
        input.extraData ? JSON.stringify(input.extraData) : null,
        input.url,
        input.secret,
        input.events,
        JSON.stringify(input.headers),
        JSON.stringify(input.retryPolicy),
        input.userId,
      );

      return created[0]?.id ?? '';
    }

    const webhook = await prisma.webhook.create({
      data: {
        code: input.code,
        nameEn: input.nameEn,
        nameZh: input.nameZh,
        nameJa: input.nameJa,
        extraData: toNullableJsonInput(input.extraData),
        url: input.url,
        secret: input.secret,
        events: input.events,
        headers: input.headers,
        retryPolicy: input.retryPolicy,
        isActive: true,
        consecutiveFailures: 0,
        createdBy: input.userId ?? undefined,
        updatedBy: input.userId ?? undefined,
      },
    });

    return webhook.id;
  }

  async update(
    prisma: Prisma.TransactionClient,
    tenantSchema: string | null,
    id: string,
    input: WebhookUpdatePersistenceInput,
  ): Promise<void> {
    if (tenantSchema) {
      await prisma.$executeRawUnsafe(
        `
          UPDATE "${tenantSchema}".webhook
          SET
            name_en = $2,
            name_zh = $3,
            name_ja = $4,
            extra_data = $5::jsonb,
            url = $6,
            secret = $7,
            events = $8::varchar[],
            headers = $9::jsonb,
            retry_policy = $10::jsonb,
            updated_by = $11::uuid,
            version = version + 1,
            updated_at = NOW()
          WHERE id = $1::uuid
        `,
        id,
        input.nameEn,
        input.nameZh,
        input.nameJa,
        input.extraData ? JSON.stringify(input.extraData) : null,
        input.url,
        input.secret,
        input.events,
        JSON.stringify(input.headers),
        JSON.stringify(input.retryPolicy),
        input.userId,
      );

      return;
    }

    await prisma.webhook.update({
      where: { id },
      data: {
        nameEn: input.nameEn,
        nameZh: input.nameZh,
        nameJa: input.nameJa,
        extraData: toNullableJsonInput(input.extraData),
        url: input.url,
        secret: input.secret,
        events: input.events,
        headers: input.headers,
        retryPolicy: input.retryPolicy,
        updatedBy: input.userId,
        version: { increment: 1 },
      },
    });
  }

  async delete(
    prisma: Prisma.TransactionClient,
    tenantSchema: string | null,
    id: string,
  ): Promise<void> {
    if (tenantSchema) {
      await prisma.$executeRawUnsafe(
        `
          DELETE FROM "${tenantSchema}".webhook
          WHERE id = $1::uuid
        `,
        id,
      );

      return;
    }

    await prisma.webhook.delete({
      where: { id },
    });
  }

  async setActiveStatus(
    prisma: Prisma.TransactionClient,
    tenantSchema: string | null,
    id: string,
    input: WebhookActiveStatePersistenceInput,
  ): Promise<void> {
    if (tenantSchema) {
      await prisma.$executeRawUnsafe(
        `
          UPDATE "${tenantSchema}".webhook
          SET
            is_active = $2,
            disabled_at = $3::timestamptz,
            consecutive_failures = $4::smallint,
            updated_by = $5::uuid,
            version = version + 1,
            updated_at = NOW()
          WHERE id = $1::uuid
        `,
        id,
        input.isActive,
        input.disabledAt,
        input.consecutiveFailures,
        input.userId,
      );

      return;
    }

    await prisma.webhook.update({
      where: { id },
      data: {
        isActive: input.isActive,
        disabledAt: input.disabledAt,
        consecutiveFailures: input.consecutiveFailures,
        updatedBy: input.userId,
        version: { increment: 1 },
      },
    });
  }
}
