// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import type { LocalizedText } from '@tcrn/shared';

import {
  readLocalizedText,
  toLocalizedTextJsonInput,
  toNullableJsonInput,
} from '../../../platform/persistence/localized-text.persistence';
import { DatabaseService } from '../../database';
import { type WebhookRecord } from '../domain/webhook.policy';

export interface WebhookCreatePersistenceInput {
  code: string;
  name: LocalizedText;
  extraData: Record<string, unknown> | null;
  url: string;
  secret: string | null;
  events: string[];
  headers: Prisma.InputJsonObject;
  retryPolicy: Prisma.InputJsonObject;
  userId: string | null;
}

export interface WebhookUpdatePersistenceInput {
  name: LocalizedText;
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

function mapWebhookRecord<T extends Omit<WebhookRecord, 'extraData' | 'name'> & {
  extraData: Prisma.JsonValue | Record<string, unknown> | null;
  name: Prisma.JsonValue;
}>(
  record: T,
): WebhookRecord {
  return {
    ...record,
    name: readLocalizedText(record.name, 'webhook.name'),
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
      const rows = await prisma.$queryRawUnsafe<Array<Omit<WebhookRecord, 'extraData' | 'name'> & {
        extraData: Prisma.JsonValue | null;
        name: Prisma.JsonValue;
      }>>(
        `
          SELECT
            id,
            code,
            name,
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

      return rows[0] ? mapWebhookRecord(rows[0]) : null;
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
            name,
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
            $2::jsonb,
            $3::jsonb,
            $4,
            $5,
            $6::varchar[],
            $7::jsonb,
            $8::jsonb,
            true,
            0,
            NOW(),
            NOW(),
            $9::uuid,
            $9::uuid
          )
          RETURNING id
        `,
        input.code,
        JSON.stringify(input.name),
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
        name: toLocalizedTextJsonInput(input.name),
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
            name = $2::jsonb,
            extra_data = $3::jsonb,
            url = $4,
            secret = $5,
            events = $6::varchar[],
            headers = $7::jsonb,
            retry_policy = $8::jsonb,
            updated_by = $9::uuid,
            version = version + 1,
            updated_at = NOW()
          WHERE id = $1::uuid
        `,
        id,
        JSON.stringify(input.name),
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
        name: toLocalizedTextJsonInput(input.name),
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
