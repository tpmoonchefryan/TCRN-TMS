// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';

import type { PrismaClient } from '@tcrn/database';

import { DatabaseService } from '../database/database.service';

export interface EventBackboneOutboxInsert {
  eventCode: string;
  eventFamily: string;
  payloadVersion: string;
  producer: string;
  tenantId?: string | null;
  subsidiaryId?: string | null;
  talentId?: string | null;
  scopeClass: string;
  piiClass: string;
  idempotencyKey: string;
  payloadHash: string;
  payloadEnvelope: Record<string, unknown>;
  redactedPayload: Record<string, unknown>;
  bridgeMode: string;
  traceId?: string | null;
  correlationId?: string | null;
  createdBy?: string | null;
}

export interface EventBackboneOutboxRow {
  id: string;
  event_code: string;
  event_family: string;
  idempotency_key: string;
  payload_hash: string;
  bridge_mode: string;
  publish_status: string;
  created_at: Date;
}

function schemaName(tenantSchema: string): string {
  if (!tenantSchema) {
    throw new Error('Event backbone tenant schema is required');
  }

  return `"${tenantSchema.replace(/"/g, '""')}"`;
}

@Injectable()
export class EventBackboneRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get prisma(): PrismaClient {
    return this.databaseService.getPrisma();
  }

  async withOutboxTransaction<T>(callback: (client: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (transactionClient) => callback(transactionClient as PrismaClient));
  }

  async insertOutboxIfAbsent(
    tenantSchema: string,
    input: EventBackboneOutboxInsert,
    client: PrismaClient = this.prisma
  ): Promise<EventBackboneOutboxRow> {
    const schema = schemaName(tenantSchema);
    const rows = await client.$queryRawUnsafe<EventBackboneOutboxRow[]>(
      `
        INSERT INTO ${schema}.event_backbone_outbox (
          event_code,
          event_family,
          payload_version,
          producer,
          tenant_id,
          subsidiary_id,
          talent_id,
          scope_class,
          pii_class,
          idempotency_key,
          payload_hash,
          payload_envelope,
          redacted_payload,
          bridge_mode,
          trace_id,
          correlation_id,
          created_by
        )
        VALUES (
          $1, $2, $3, $4,
          $5::uuid, $6::uuid, $7::uuid,
          $8, $9, $10, $11,
          $12::jsonb, $13::jsonb,
          $14, $15, $16, $17::uuid
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id, event_code, event_family, idempotency_key, payload_hash, bridge_mode, publish_status, created_at
      `,
      input.eventCode,
      input.eventFamily,
      input.payloadVersion,
      input.producer,
      input.tenantId ?? null,
      input.subsidiaryId ?? null,
      input.talentId ?? null,
      input.scopeClass,
      input.piiClass,
      input.idempotencyKey,
      input.payloadHash,
      JSON.stringify(input.payloadEnvelope ?? {}),
      JSON.stringify(input.redactedPayload ?? {}),
      input.bridgeMode,
      input.traceId ?? null,
      input.correlationId ?? null,
      input.createdBy ?? null
    );

    if (rows[0]) {
      return rows[0];
    }

    return this.findOutboxByIdempotencyKey(tenantSchema, input.idempotencyKey, client);
  }

  async findOutboxByIdempotencyKey(
    tenantSchema: string,
    idempotencyKey: string,
    client: PrismaClient = this.prisma
  ): Promise<EventBackboneOutboxRow> {
    const schema = schemaName(tenantSchema);
    const rows = await client.$queryRawUnsafe<EventBackboneOutboxRow[]>(
      `
        SELECT id, event_code, event_family, idempotency_key, payload_hash, bridge_mode, publish_status, created_at
        FROM ${schema}.event_backbone_outbox
        WHERE idempotency_key = $1
        LIMIT 1
      `,
      idempotencyKey
    );

    if (!rows[0]) {
      throw new Error('Event backbone outbox row not found after idempotent insert');
    }

    return rows[0];
  }
}
