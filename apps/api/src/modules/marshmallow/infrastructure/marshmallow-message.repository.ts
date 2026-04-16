// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import type {
  MarshmallowAdminMessageRow,
  MarshmallowMessageDetailRecord,
  MarshmallowMessageModerationRow,
  MarshmallowMessageReplyRow,
  MarshmallowMessageStatsRow,
  MarshmallowMessageUpdateFieldChange,
  MarshmallowMessageUpdateRow,
  MarshmallowReplierRecord,
} from '../domain/marshmallow-message.policy';
import type {
  BatchActionDto,
  MessageListQueryDto,
  RejectMessageDto,
  ReplyMessageDto,
} from '../dto/marshmallow.dto';

@Injectable()
export class MarshmallowMessageRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findMany(
    talentId: string,
    tenantSchema: string,
    query: MessageListQueryDto,
  ): Promise<MarshmallowAdminMessageRow[]> {
    const prisma = this.databaseService.getPrisma();
    const { offset, orderByField, orderDirection, params, whereClause } =
      this.buildListQueryParts(talentId, query);
    const pageSize = query.pageSize ?? 20;

    return prisma.$queryRawUnsafe<MarshmallowAdminMessageRow[]>(
      `
        SELECT
          id, content, sender_name as "senderName", is_anonymous as "isAnonymous",
          status, rejection_reason as "rejectionReason", is_read as "isRead",
          is_starred as "isStarred", is_pinned as "isPinned", reply_content as "replyContent",
          replied_at as "repliedAt", replied_by as "repliedBy", reaction_counts as "reactionCounts",
          profanity_flags as "profanityFlags", image_url as "imageUrl",
          image_urls as "imageUrls", social_link as "socialLink",
          created_at as "createdAt"
        FROM "${tenantSchema}".marshmallow_message
        WHERE ${whereClause}
        ORDER BY is_pinned DESC, ${orderByField} ${orderDirection}
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      ...params,
    );
  }

  async countMany(
    talentId: string,
    tenantSchema: string,
    query: MessageListQueryDto,
  ): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const { params, whereClause } = this.buildListQueryParts(talentId, query);
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${tenantSchema}".marshmallow_message
        WHERE ${whereClause}
      `,
      ...params,
    );

    return Number(result[0]?.count ?? 0);
  }

  async findStatsByTalentId(
    talentId: string,
    tenantSchema: string,
  ): Promise<MarshmallowMessageStatsRow | null> {
    const prisma = this.databaseService.getPrisma();
    const stats = await prisma.$queryRawUnsafe<MarshmallowMessageStatsRow[]>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE is_read = false) as unread
        FROM "${tenantSchema}".marshmallow_message
        WHERE talent_id = $1::uuid
      `,
      talentId,
    );

    return stats[0] ?? null;
  }

  async findUsersByIds(
    tenantSchema: string,
    userIds: string[],
  ): Promise<MarshmallowReplierRecord[]> {
    if (userIds.length === 0) {
      return [];
    }

    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<MarshmallowReplierRecord[]>(
      `
        SELECT id, username
        FROM "${tenantSchema}".system_user
        WHERE id = ANY($1::uuid[])
      `,
      userIds,
    );
  }

  async findMessageById(
    talentId: string,
    tenantSchema: string,
    messageId: string,
  ): Promise<MarshmallowMessageDetailRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const messages = await prisma.$queryRawUnsafe<MarshmallowMessageDetailRecord[]>(
      `
        SELECT
          id, content, sender_name as "senderName", is_anonymous as "isAnonymous",
          status, rejection_reason as "rejectionReason", is_read as "isRead",
          is_starred as "isStarred", is_pinned as "isPinned", reply_content as "replyContent",
          replied_at as "repliedAt", replied_by as "repliedBy", moderated_at as "moderatedAt",
          moderated_by as "moderatedBy", created_at as "createdAt"
        FROM "${tenantSchema}".marshmallow_message
        WHERE id = $1::uuid AND talent_id = $2::uuid
      `,
      messageId,
      talentId,
    );

    return messages[0] ?? null;
  }

  async countOwnedMessages(
    talentId: string,
    tenantSchema: string,
    messageIds: string[],
  ): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${tenantSchema}".marshmallow_message
        WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
      `,
      messageIds,
      talentId,
    );

    return Number(result[0]?.count ?? 0);
  }

  async approve(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    userId: string,
  ): Promise<MarshmallowMessageModerationRow> {
    const prisma = this.databaseService.getPrisma();
    const updated = await prisma.$queryRawUnsafe<MarshmallowMessageModerationRow[]>(
      `
        UPDATE "${tenantSchema}".marshmallow_message
        SET status = 'approved', moderated_at = now(), moderated_by = $1::uuid
        WHERE id = $2::uuid AND talent_id = $3::uuid
        RETURNING id, status, moderated_at as "moderatedAt"
      `,
      userId,
      messageId,
      talentId,
    );

    return updated[0];
  }

  async reject(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    dto: RejectMessageDto,
    userId: string,
  ): Promise<MarshmallowMessageModerationRow> {
    const prisma = this.databaseService.getPrisma();
    const updated = await prisma.$queryRawUnsafe<MarshmallowMessageModerationRow[]>(
      `
        UPDATE "${tenantSchema}".marshmallow_message
        SET status = 'rejected', rejection_reason = $1, rejection_note = $2,
            moderated_at = now(), moderated_by = $3::uuid
        WHERE id = $4::uuid AND talent_id = $5::uuid
        RETURNING id, status, moderated_at as "moderatedAt"
      `,
      dto.reason,
      dto.note ?? null,
      userId,
      messageId,
      talentId,
    );

    return updated[0];
  }

  async unreject(
    talentId: string,
    tenantSchema: string,
    messageId: string,
  ): Promise<MarshmallowMessageModerationRow> {
    const prisma = this.databaseService.getPrisma();
    const updated = await prisma.$queryRawUnsafe<MarshmallowMessageModerationRow[]>(
      `
        UPDATE "${tenantSchema}".marshmallow_message
        SET status = 'pending', rejection_reason = NULL, rejection_note = NULL,
            moderated_at = NULL, moderated_by = NULL
        WHERE id = $1::uuid AND talent_id = $2::uuid
        RETURNING id, status, moderated_at as "moderatedAt"
      `,
      messageId,
      talentId,
    );

    return updated[0];
  }

  async reply(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    dto: ReplyMessageDto,
    userId: string,
  ): Promise<MarshmallowMessageReplyRow> {
    const prisma = this.databaseService.getPrisma();
    const updated = await prisma.$queryRawUnsafe<MarshmallowMessageReplyRow[]>(
      `
        UPDATE "${tenantSchema}".marshmallow_message
        SET reply_content = $1, replied_at = now(), replied_by = $2::uuid
        WHERE id = $3::uuid AND talent_id = $4::uuid
        RETURNING id, reply_content as "replyContent", replied_at as "repliedAt"
      `,
      dto.content,
      userId,
      messageId,
      talentId,
    );

    return updated[0];
  }

  async updateFields(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    changes: MarshmallowMessageUpdateFieldChange[],
  ): Promise<MarshmallowMessageUpdateRow> {
    const prisma = this.databaseService.getPrisma();
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const change of changes) {
      const column = this.toSnakeCase(change.field);
      setClauses.push(`${column} = $${paramIndex}`);
      params.push(change.value);
      paramIndex++;
    }

    params.push(messageId, talentId);

    const updated = await prisma.$queryRawUnsafe<MarshmallowMessageUpdateRow[]>(
      `
        UPDATE "${tenantSchema}".marshmallow_message
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}::uuid AND talent_id = $${paramIndex + 1}::uuid
        RETURNING id, is_read as "isRead", is_starred as "isStarred", is_pinned as "isPinned"
      `,
      ...params,
    );

    return updated[0];
  }

  async batchAction(
    talentId: string,
    tenantSchema: string,
    dto: BatchActionDto,
    userId: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    switch (dto.action) {
      case 'approve':
        await prisma.$executeRawUnsafe(
          `
            UPDATE "${tenantSchema}".marshmallow_message
            SET status = 'approved', moderated_at = now(), moderated_by = $3::uuid
            WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
          `,
          dto.messageIds,
          talentId,
          userId,
        );
        return;
      case 'reject':
        await prisma.$executeRawUnsafe(
          `
            UPDATE "${tenantSchema}".marshmallow_message
            SET status = 'rejected', rejection_reason = $3, moderated_at = now(), moderated_by = $4::uuid
            WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
          `,
          dto.messageIds,
          talentId,
          dto.rejectionReason ?? 'other',
          userId,
        );
        return;
      case 'star':
        await prisma.$executeRawUnsafe(
          `
            UPDATE "${tenantSchema}".marshmallow_message
            SET is_starred = true
            WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
          `,
          dto.messageIds,
          talentId,
        );
        return;
      case 'unstar':
        await prisma.$executeRawUnsafe(
          `
            UPDATE "${tenantSchema}".marshmallow_message
            SET is_starred = false
            WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
          `,
          dto.messageIds,
          talentId,
        );
        return;
      case 'markRead':
        await prisma.$executeRawUnsafe(
          `
            UPDATE "${tenantSchema}".marshmallow_message
            SET is_read = true
            WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
          `,
          dto.messageIds,
          talentId,
        );
        return;
      case 'markUnread':
        await prisma.$executeRawUnsafe(
          `
            UPDATE "${tenantSchema}".marshmallow_message
            SET is_read = false
            WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
          `,
          dto.messageIds,
          talentId,
        );
        return;
      case 'delete':
        await prisma.$executeRawUnsafe(
          `
            DELETE FROM "${tenantSchema}".marshmallow_message
            WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
          `,
          dto.messageIds,
          talentId,
        );
        return;
    }
  }

  async insertChangeLog(
    tenantSchema: string,
    data: {
      action: string;
      objectType: string;
      objectId: string;
      objectName: string;
      diff: Record<string, unknown>;
    },
    context: RequestContext,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantSchema}".change_log (
          id, action, object_type, object_id, object_name, diff,
          operator_id, ip_address, occurred_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3::uuid, $4, $5::jsonb, $6::uuid, $7::inet, now()
        )
      `,
      data.action,
      data.objectType,
      data.objectId,
      data.objectName,
      JSON.stringify(data.diff),
      context.userId,
      context.ipAddress ?? null,
    );
  }

  private buildListQueryParts(
    talentId: string,
    query: MessageListQueryDto,
  ): {
    whereClause: string;
    params: unknown[];
    orderByField: string;
    orderDirection: 'ASC' | 'DESC';
    offset: number;
  } {
    const {
      endDate,
      hasReply,
      isRead,
      isStarred,
      keyword,
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder = 'desc',
      startDate,
      status,
    } = query;
    const offset = (page - 1) * pageSize;
    const conditions: string[] = ['talent_id = $1::uuid'];
    const params: unknown[] = [talentId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (isStarred !== undefined) {
      conditions.push(`is_starred = $${paramIndex}`);
      params.push(isStarred);
      paramIndex++;
    }

    if (isRead !== undefined) {
      conditions.push(`is_read = $${paramIndex}`);
      params.push(isRead);
      paramIndex++;
    }

    if (hasReply !== undefined) {
      conditions.push(hasReply ? 'reply_content IS NOT NULL' : 'reply_content IS NULL');
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}::timestamptz`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}::timestamptz`);
      params.push(endDate);
      paramIndex++;
    }

    if (keyword) {
      conditions.push(`content ILIKE $${paramIndex}`);
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    let orderByField = 'created_at';
    if (sortBy === 'isStarred') {
      orderByField = 'is_starred';
    } else if (sortBy === 'isPinned') {
      orderByField = 'is_pinned';
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
      orderByField,
      orderDirection: sortOrder === 'asc' ? 'ASC' : 'DESC',
      offset,
    };
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
