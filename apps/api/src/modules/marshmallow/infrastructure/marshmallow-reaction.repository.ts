// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  MarshmallowReactionContext,
  MarshmallowReactionCountRow,
  MarshmallowReactionLookupRecord,
  MarshmallowUserReactionRow,
} from '../domain/marshmallow-reaction.policy';

@Injectable()
export class MarshmallowReactionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async listSearchableTenantSchemas(): Promise<string[]> {
    const prisma = this.databaseService.getPrisma();
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(
      `
        SELECT t.schema_name as "schemaName"
        FROM public.tenant t
        WHERE t.is_active = true
          AND EXISTS (
            SELECT 1
            FROM information_schema.tables it
            WHERE it.table_schema = t.schema_name
              AND it.table_name = 'marshmallow_message'
          )
          AND EXISTS (
            SELECT 1
            FROM information_schema.tables it
            WHERE it.table_schema = t.schema_name
              AND it.table_name = 'marshmallow_config'
          )
          AND EXISTS (
            SELECT 1
            FROM information_schema.tables it
            WHERE it.table_schema = t.schema_name
              AND it.table_name = 'marshmallow_reaction'
          )
        ORDER BY t.schema_name
      `,
    );

    return tenants.map((tenant) => tenant.schemaName);
  }

  async findPublishedMessageAccessInTenant(
    tenantSchema: string,
    messageId: string,
  ): Promise<MarshmallowReactionLookupRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const messages = await prisma.$queryRawUnsafe<MarshmallowReactionLookupRecord[]>(
      `
        SELECT
          m.id,
          m.status,
          m.config_id as "configId",
          c.reactions_enabled as "reactionsEnabled",
          c.allowed_reactions as "allowedReactions"
        FROM "${tenantSchema}".marshmallow_message m
        JOIN "${tenantSchema}".marshmallow_config c ON m.config_id = c.id
        JOIN "${tenantSchema}".talent t ON m.talent_id = t.id
        WHERE m.id = $1::uuid
          AND c.is_enabled = true
          AND t.lifecycle_status = 'published'
      `,
      messageId,
    );

    return messages[0] ?? null;
  }

  async findExistingReactionId(
    tenantSchema: string,
    messageId: string,
    fingerprint: string,
    reaction: string,
  ): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const reactions = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${tenantSchema}".marshmallow_reaction
        WHERE message_id = $1::uuid
          AND fingerprint_hash = $2
          AND reaction = $3
      `,
      messageId,
      fingerprint,
      reaction,
    );

    return reactions[0]?.id ?? null;
  }

  async deleteReaction(tenantSchema: string, reactionId: string): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        DELETE FROM "${tenantSchema}".marshmallow_reaction
        WHERE id = $1::uuid
      `,
      reactionId,
    );
  }

  async insertReaction(
    tenantSchema: string,
    messageId: string,
    reaction: string,
    context: MarshmallowReactionContext,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".marshmallow_reaction (
          id, message_id, reaction, fingerprint_hash, ip_address, created_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2, $3, $4::inet, now()
        )
      `,
      messageId,
      reaction,
      context.fingerprint,
      context.ip,
    );
  }

  async findReactionCounts(
    tenantSchema: string,
    messageId: string,
  ): Promise<MarshmallowReactionCountRow[]> {
    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<MarshmallowReactionCountRow[]>(
      `
        SELECT reaction, COUNT(*) as count
        FROM "${tenantSchema}".marshmallow_reaction
        WHERE message_id = $1::uuid
        GROUP BY reaction
      `,
      messageId,
    );
  }

  async updateMessageReactionCounts(
    tenantSchema: string,
    messageId: string,
    counts: Record<string, number>,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".marshmallow_message
        SET reaction_counts = $1::jsonb
        WHERE id = $2::uuid
      `,
      JSON.stringify(counts),
      messageId,
    );
  }

  async findUserReactions(
    tenantSchema: string,
    messageIds: string[],
    fingerprint: string,
  ): Promise<MarshmallowUserReactionRow[]> {
    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<MarshmallowUserReactionRow[]>(
      `
        SELECT message_id as "messageId", reaction
        FROM "${tenantSchema}".marshmallow_reaction
        WHERE message_id = ANY($1::uuid[])
          AND fingerprint_hash = $2
      `,
      messageIds,
      fingerprint,
    );
  }
}
