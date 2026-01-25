// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import { DatabaseService } from '../../database';

@Injectable()
export class MarshmallowReactionService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Find message and tenant schema by message ID (cross-tenant search)
   */
  private async findMessageWithTenant(messageId: string): Promise<{
    tenantSchema: string;
    message: {
      id: string;
      status: string;
      configId: string;
    };
    config: {
      reactionsEnabled: boolean;
      allowedReactions: string[];
    };
  } | null> {
    const prisma = this.databaseService.getPrisma();

    // Get all active tenants
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(`
      SELECT schema_name as "schemaName" FROM public.tenant WHERE is_active = true
    `);

    for (const t of tenants) {
      const schema = t.schemaName;

      // Search for message in this tenant
      const messages = await prisma.$queryRawUnsafe<Array<{
        id: string;
        status: string;
        configId: string;
        reactionsEnabled: boolean;
        allowedReactions: string[];
      }>>(`
        SELECT m.id, m.status, m.config_id as "configId",
               c.reactions_enabled as "reactionsEnabled", c.allowed_reactions as "allowedReactions"
        FROM "${schema}".marshmallow_message m
        JOIN "${schema}".marshmallow_config c ON m.config_id = c.id
        WHERE m.id = $1::uuid
      `, messageId);

      if (messages.length > 0) {
        const msg = messages[0];
        return {
          tenantSchema: schema,
          message: {
            id: msg.id,
            status: msg.status,
            configId: msg.configId,
          },
          config: {
            reactionsEnabled: msg.reactionsEnabled,
            allowedReactions: msg.allowedReactions,
          },
        };
      }
    }

    return null;
  }

  /**
   * Toggle reaction on message (multi-tenant aware)
   */
  async toggleReaction(
    messageId: string,
    reaction: string,
    context: { fingerprint: string; ip: string },
  ): Promise<{ added: boolean; counts: Record<string, number> }> {
    const prisma = this.databaseService.getPrisma();

    // 1. Find message and verify it exists and is approved
    const result = await this.findMessageWithTenant(messageId);

    if (!result || result.message.status !== 'approved') {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Message not found',
      });
    }

    const { tenantSchema, config } = result;

    // 2. Verify reactions are enabled
    if (!config.reactionsEnabled) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Reactions are disabled',
      });
    }

    // 3. Verify reaction is allowed (empty array means all emojis allowed)
    if (config.allowedReactions.length > 0 && !config.allowedReactions.includes(reaction)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid reaction',
      });
    }

    // 4. Check if reaction already exists
    const existingReactions = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".marshmallow_reaction
      WHERE message_id = $1::uuid AND fingerprint_hash = $2 AND reaction = $3
    `, messageId, context.fingerprint, reaction);

    let added: boolean;

    if (existingReactions.length > 0) {
      // Remove reaction
      await prisma.$executeRawUnsafe(`
        DELETE FROM "${tenantSchema}".marshmallow_reaction
        WHERE id = $1::uuid
      `, existingReactions[0].id);
      added = false;
    } else {
      // Add reaction
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}".marshmallow_reaction (
          id, message_id, reaction, fingerprint_hash, ip_address, created_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2, $3, $4::inet, now()
        )
      `, messageId, reaction, context.fingerprint, context.ip);
      added = true;
    }

    // 5. Update reaction counts cache
    const counts = await this.updateReactionCounts(tenantSchema, messageId);

    return { added, counts };
  }

  /**
   * Update reaction counts cache on message (multi-tenant aware)
   */
  private async updateReactionCounts(tenantSchema: string, messageId: string): Promise<Record<string, number>> {
    const prisma = this.databaseService.getPrisma();

    const reactions = await prisma.$queryRawUnsafe<Array<{
      reaction: string;
      count: bigint;
    }>>(`
      SELECT reaction, COUNT(*) as count
      FROM "${tenantSchema}".marshmallow_reaction
      WHERE message_id = $1::uuid
      GROUP BY reaction
    `, messageId);

    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.reaction] = Number(r.count);
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".marshmallow_message
      SET reaction_counts = $1::jsonb
      WHERE id = $2::uuid
    `, JSON.stringify(counts), messageId);

    return counts;
  }

  /**
   * Get user's reactions for multiple messages (multi-tenant aware)
   * Note: tenantSchema must be provided by the caller (e.g., PublicMarshmallowService)
   */
  async getUserReactions(
    messageIds: string[],
    fingerprint: string,
    tenantSchema?: string,
  ): Promise<Record<string, string[]>> {
    const prisma = this.databaseService.getPrisma();

    if (messageIds.length === 0) {
      return {};
    }

    // If tenantSchema is provided, use it directly
    if (tenantSchema) {
      const reactions = await prisma.$queryRawUnsafe<Array<{
        messageId: string;
        reaction: string;
      }>>(`
        SELECT message_id as "messageId", reaction
        FROM "${tenantSchema}".marshmallow_reaction
        WHERE message_id = ANY($1::uuid[]) AND fingerprint_hash = $2
      `, messageIds, fingerprint);

      const result: Record<string, string[]> = {};
      for (const r of reactions) {
        if (!result[r.messageId]) {
          result[r.messageId] = [];
        }
        result[r.messageId].push(r.reaction);
      }

      return result;
    }

    // Otherwise, search across all tenants (slower but fallback)
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(`
      SELECT schema_name as "schemaName" FROM public.tenant WHERE is_active = true
    `);

    const result: Record<string, string[]> = {};

    for (const t of tenants) {
      const reactions = await prisma.$queryRawUnsafe<Array<{
        messageId: string;
        reaction: string;
      }>>(`
        SELECT message_id as "messageId", reaction
        FROM "${t.schemaName}".marshmallow_reaction
        WHERE message_id = ANY($1::uuid[]) AND fingerprint_hash = $2
      `, messageIds, fingerprint);

      for (const r of reactions) {
        if (!result[r.messageId]) {
          result[r.messageId] = [];
        }
        result[r.messageId].push(r.reaction);
      }
    }

    return result;
  }
}
