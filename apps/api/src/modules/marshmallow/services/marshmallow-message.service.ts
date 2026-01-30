// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import {
    BatchActionDto,
    MessageListQueryDto,
    RejectMessageDto,
    ReplyMessageDto,
    UpdateMessageDto,
} from '../dto/marshmallow.dto';

@Injectable()
export class MarshmallowMessageService {
  private readonly logger = new Logger(MarshmallowMessageService.name);

  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * List messages (multi-tenant aware)
   */
  async findMany(talentId: string, tenantSchema: string, query: MessageListQueryDto) {
    const prisma = this.databaseService.getPrisma();
    const { page = 1, pageSize = 20, status, isStarred, isRead, hasReply, startDate, endDate, keyword, sortBy, sortOrder = 'desc' } = query;

    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
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

    const whereClause = conditions.join(' AND ');

    // Build ORDER BY
    let orderByField = 'created_at';
    if (sortBy === 'isStarred') orderByField = 'is_starred';
    else if (sortBy === 'isPinned') orderByField = 'is_pinned';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Query messages
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      senderName: string | null;
      isAnonymous: boolean;
      status: string;
      rejectionReason: string | null;
      isRead: boolean;
      isStarred: boolean;
      isPinned: boolean;
      replyContent: string | null;
      repliedAt: Date | null;
      repliedBy: string | null;
      reactionCounts: Record<string, number> | null;
      profanityFlags: string[] | null;
      imageUrl: string | null;
      imageUrls: string[] | null;
      socialLink: string | null;
      createdAt: Date;
    }>>(`
      SELECT id, content, sender_name as "senderName", is_anonymous as "isAnonymous",
             status, rejection_reason as "rejectionReason", is_read as "isRead",
             is_starred as "isStarred", is_pinned as "isPinned", reply_content as "replyContent",
             replied_at as "repliedAt", replied_by as "repliedBy", reaction_counts as "reactionCounts",
             profanity_flags as "profanityFlags",
             image_url as "imageUrl", image_urls as "imageUrls", social_link as "socialLink",
             created_at as "createdAt"
      FROM "${tenantSchema}".marshmallow_message
      WHERE ${whereClause}
      ORDER BY is_pinned DESC, ${orderByField} ${orderDirection}
      LIMIT ${pageSize} OFFSET ${offset}
    `, ...params);

    // Count queries - get all stats for the talent
    const [countResult, statsResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM "${tenantSchema}".marshmallow_message WHERE ${whereClause}
      `, ...params),
      prisma.$queryRawUnsafe<Array<{
        pending: bigint;
        approved: bigint;
        rejected: bigint;
        unread: bigint;
      }>>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE is_read = false) as unread
        FROM "${tenantSchema}".marshmallow_message
        WHERE talent_id = $1::uuid
      `, talentId),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const s = statsResult[0] || { pending: 0n, approved: 0n, rejected: 0n, unread: 0n };
    const pendingCount = Number(s.pending);
    const approvedCount = Number(s.approved);
    const rejectedCount = Number(s.rejected);
    const unreadCount = Number(s.unread);

    // Get replier info
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const replierIds = items.filter((m) => m.repliedBy).map((m) => m.repliedBy!);
    let userMap = new Map<string, { id: string; username: string }>();
    if (replierIds.length > 0) {
      const users = await prisma.$queryRawUnsafe<Array<{ id: string; username: string }>>(`
        SELECT id, username FROM "${tenantSchema}".system_user WHERE id = ANY($1::uuid[])
      `, replierIds);
      userMap = new Map(users.map((u) => [u.id, u]));
    }

    return {
      items: items.map((m) => ({
        id: m.id,
        content: m.content,
        senderName: m.senderName,
        isAnonymous: m.isAnonymous,
        status: m.status,
        rejectionReason: m.rejectionReason,
        isRead: m.isRead,
        isStarred: m.isStarred,
        isPinned: m.isPinned,
        replyContent: m.replyContent,
        repliedAt: m.repliedAt?.toISOString() ?? null,
        repliedBy: m.repliedBy ? userMap.get(m.repliedBy) ?? null : null,
        reactionCounts: m.reactionCounts ?? {},
        profanityFlags: m.profanityFlags ?? [],
        imageUrl: m.imageUrl,
        imageUrls: m.imageUrls || (m.imageUrl ? [m.imageUrl] : []),
        socialLink: m.socialLink,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      stats: { pendingCount, approvedCount, rejectedCount, unreadCount },
    };
  }

  /**
   * Approve message (multi-tenant aware)
   */
  async approve(talentId: string, tenantSchema: string, messageId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);

    if (message.status === 'approved') {
      return { id: message.id, status: 'approved', moderatedAt: message.moderatedAt?.toISOString() };
    }

    // Update message status
    const updated = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      moderatedAt: Date | null;
    }>>(`
      UPDATE "${tenantSchema}".marshmallow_message
      SET status = 'approved', moderated_at = now(), moderated_by = $1::uuid
      WHERE id = $2::uuid AND talent_id = $3::uuid
      RETURNING id, status, moderated_at as "moderatedAt"
    `, context.userId, messageId, talentId);

    // Log change
    await this.logChange(tenantSchema, {
      action: 'approve',
      objectType: 'marshmallow_message',
      objectId: messageId,
      objectName: 'Message',
      diff: { old: { status: message.status }, new: { status: 'approved' } },
    }, context);

    const msg = updated[0];
    return { id: msg.id, status: msg.status, moderatedAt: msg.moderatedAt?.toISOString() };
  }

  /**
   * Reject message (multi-tenant aware)
   */
  async reject(talentId: string, tenantSchema: string, messageId: string, dto: RejectMessageDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);

    // Update message status
    const updated = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      moderatedAt: Date | null;
    }>>(`
      UPDATE "${tenantSchema}".marshmallow_message
      SET status = 'rejected', rejection_reason = $1, rejection_note = $2,
          moderated_at = now(), moderated_by = $3::uuid
      WHERE id = $4::uuid AND talent_id = $5::uuid
      RETURNING id, status, moderated_at as "moderatedAt"
    `, dto.reason, dto.note || null, context.userId, messageId, talentId);

    // Log change
    await this.logChange(tenantSchema, {
      action: 'reject',
      objectType: 'marshmallow_message',
      objectId: messageId,
      objectName: 'Message',
      diff: { old: { status: message.status }, new: { status: 'rejected', reason: dto.reason } },
    }, context);

    const msg = updated[0];
    return { id: msg.id, status: msg.status, moderatedAt: msg.moderatedAt?.toISOString() };
  }

  /**
   * Unreject message - restore rejected message to pending status (multi-tenant aware)
   */
  async unreject(talentId: string, tenantSchema: string, messageId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);

    if (message.status !== 'rejected') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only unreject rejected messages',
      });
    }

    // Update message status back to pending, clear rejection reason
    const updated = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
    }>>(`
      UPDATE "${tenantSchema}".marshmallow_message
      SET status = 'pending', rejection_reason = NULL, rejection_note = NULL,
          moderated_at = NULL, moderated_by = NULL
      WHERE id = $1::uuid AND talent_id = $2::uuid
      RETURNING id, status
    `, messageId, talentId);

    // Log change
    await this.logChange(tenantSchema, {
      action: 'unreject',
      objectType: 'marshmallow_message',
      objectId: messageId,
      objectName: 'Message',
      diff: { old: { status: 'rejected', reason: message.rejectionReason }, new: { status: 'pending' } },
    }, context);

    const msg = updated[0];
    return { id: msg.id, status: msg.status };
  }

  /**
   * Reply to message (multi-tenant aware)
   */
  async reply(talentId: string, tenantSchema: string, messageId: string, dto: ReplyMessageDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);

    if (message.status !== 'approved') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only reply to approved messages',
      });
    }

    // Update message with reply
    const updated = await prisma.$queryRawUnsafe<Array<{
      id: string;
      replyContent: string | null;
      repliedAt: Date | null;
    }>>(`
      UPDATE "${tenantSchema}".marshmallow_message
      SET reply_content = $1, replied_at = now(), replied_by = $2::uuid
      WHERE id = $3::uuid AND talent_id = $4::uuid
      RETURNING id, reply_content as "replyContent", replied_at as "repliedAt"
    `, dto.content, context.userId, messageId, talentId);

    // Log change
    await this.logChange(tenantSchema, {
      action: 'reply',
      objectType: 'marshmallow_message',
      objectId: messageId,
      objectName: 'Message',
      diff: { new: { replyContent: dto.content.substring(0, 100) } },
    }, context);

    const msg = updated[0];
    return {
      id: msg.id,
      replyContent: msg.replyContent,
      repliedAt: msg.repliedAt?.toISOString(),
      repliedBy: { id: context.userId ?? '', username: context.userName ?? '' },
    };
  }

  /**
   * Batch action (multi-tenant aware)
   */
  async batchAction(talentId: string, tenantSchema: string, dto: BatchActionDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    // Verify all messages belong to talent
    const messages = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".marshmallow_message
      WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
    `, dto.messageIds, talentId);

    if (messages.length !== dto.messageIds.length) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Some messages not found',
      });
    }

    let updateQuery = '';
    const params: unknown[] = [dto.messageIds, talentId];

    switch (dto.action) {
      case 'approve':
        updateQuery = `
          UPDATE "${tenantSchema}".marshmallow_message
          SET status = 'approved', moderated_at = now(), moderated_by = $3::uuid
          WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
        `;
        params.push(context.userId);
        break;
      case 'reject':
        updateQuery = `
          UPDATE "${tenantSchema}".marshmallow_message
          SET status = 'rejected', rejection_reason = $3, moderated_at = now(), moderated_by = $4::uuid
          WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
        `;
        params.push(dto.rejectionReason || 'other', context.userId);
        break;
      case 'star':
        updateQuery = `
          UPDATE "${tenantSchema}".marshmallow_message
          SET is_starred = true
          WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
        `;
        break;
      case 'unstar':
        updateQuery = `
          UPDATE "${tenantSchema}".marshmallow_message
          SET is_starred = false
          WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
        `;
        break;
      case 'markRead':
        updateQuery = `
          UPDATE "${tenantSchema}".marshmallow_message
          SET is_read = true
          WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
        `;
        break;
      case 'markUnread':
        updateQuery = `
          UPDATE "${tenantSchema}".marshmallow_message
          SET is_read = false
          WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
        `;
        break;
      case 'delete':
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${tenantSchema}".marshmallow_message
          WHERE id = ANY($1::uuid[]) AND talent_id = $2::uuid
        `, dto.messageIds, talentId);
        return { processed: dto.messageIds.length, action: dto.action };
    }

    if (updateQuery) {
      await prisma.$executeRawUnsafe(updateQuery, ...params);
    }

    return { processed: dto.messageIds.length, action: dto.action };
  }

  /**
   * Update message (read, starred, pinned) - multi-tenant aware
   */
  async update(talentId: string, tenantSchema: string, messageId: string, dto: UpdateMessageDto, _context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    await this.getMessageOrThrow(talentId, tenantSchema, messageId);

    // Build SET clause dynamically
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dto.isRead !== undefined) {
      setClauses.push(`is_read = $${paramIndex}`);
      params.push(dto.isRead);
      paramIndex++;
    }
    if (dto.isStarred !== undefined) {
      setClauses.push(`is_starred = $${paramIndex}`);
      params.push(dto.isStarred);
      paramIndex++;
    }
    if (dto.isPinned !== undefined) {
      setClauses.push(`is_pinned = $${paramIndex}`);
      params.push(dto.isPinned);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      // No fields to update, just return current state
      const current = await this.getMessageOrThrow(talentId, tenantSchema, messageId);
      return {
        id: current.id,
        isRead: current.isRead,
        isStarred: current.isStarred,
        isPinned: current.isPinned,
      };
    }

    params.push(messageId, talentId);

    const updated = await prisma.$queryRawUnsafe<Array<{
      id: string;
      isRead: boolean;
      isStarred: boolean;
      isPinned: boolean;
    }>>(`
      UPDATE "${tenantSchema}".marshmallow_message
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}::uuid AND talent_id = $${paramIndex + 1}::uuid
      RETURNING id, is_read as "isRead", is_starred as "isStarred", is_pinned as "isPinned"
    `, ...params);

    const msg = updated[0];
    return {
      id: msg.id,
      isRead: msg.isRead,
      isStarred: msg.isStarred,
      isPinned: msg.isPinned,
    };
  }

  /**
   * Get message or throw (multi-tenant aware)
   */
  private async getMessageOrThrow(talentId: string, tenantSchema: string, messageId: string) {
    const prisma = this.databaseService.getPrisma();

    const messages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      senderName: string | null;
      isAnonymous: boolean;
      status: string;
      rejectionReason: string | null;
      isRead: boolean;
      isStarred: boolean;
      isPinned: boolean;
      replyContent: string | null;
      repliedAt: Date | null;
      repliedBy: string | null;
      moderatedAt: Date | null;
      moderatedBy: string | null;
      createdAt: Date;
    }>>(`
      SELECT id, content, sender_name as "senderName", is_anonymous as "isAnonymous",
             status, rejection_reason as "rejectionReason", is_read as "isRead",
             is_starred as "isStarred", is_pinned as "isPinned", reply_content as "replyContent",
             replied_at as "repliedAt", replied_by as "repliedBy", moderated_at as "moderatedAt",
             moderated_by as "moderatedBy", created_at as "createdAt"
      FROM "${tenantSchema}".marshmallow_message
      WHERE id = $1::uuid AND talent_id = $2::uuid
    `, messageId, talentId);

    if (!messages[0]) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Message not found',
      });
    }

    return messages[0];
  }

  /**
   * Log change to tenant's change_log table
   */
  private async logChange(
    tenantSchema: string,
    data: {
      action: string;
      objectType: string;
      objectId: string;
      objectName: string;
      diff: Record<string, unknown>;
    },
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();

    try {
      await prisma.$executeRawUnsafe(`
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
        context.ipAddress || null,
      );
    } catch (error) {
      // Log error but don't throw - change log failure shouldn't block business operations
      this.logger.error('Failed to create change log', error);
    }
  }
}
