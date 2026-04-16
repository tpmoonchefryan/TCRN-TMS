// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  buildMarshmallowMessageListResponse,
  buildMarshmallowMessageStats,
  buildMarshmallowMessageUpdateFieldChanges,
  buildMarshmallowMessageUpdateResponse,
  buildMarshmallowModerationResponse,
  buildMarshmallowReplyDiff,
  buildMarshmallowReplyResponse,
  canReplyToMarshmallowMessage,
  canUnrejectMarshmallowMessage,
} from '../domain/marshmallow-message.policy';
import type {
  BatchActionDto,
  MessageListQueryDto,
  RejectMessageDto,
  ReplyMessageDto,
  UpdateMessageDto,
} from '../dto/marshmallow.dto';
import { MarshmallowMessageRepository } from '../infrastructure/marshmallow-message.repository';

@Injectable()
export class MarshmallowMessageApplicationService {
  private readonly logger = new Logger(MarshmallowMessageApplicationService.name);

  constructor(
    private readonly marshmallowMessageRepository: MarshmallowMessageRepository,
  ) {}

  async findMany(
    talentId: string,
    tenantSchema: string,
    query: MessageListQueryDto,
  ) {
    const [items, total, statsRow] = await Promise.all([
      this.marshmallowMessageRepository.findMany(talentId, tenantSchema, query),
      this.marshmallowMessageRepository.countMany(talentId, tenantSchema, query),
      this.marshmallowMessageRepository.findStatsByTalentId(talentId, tenantSchema),
    ]);

    const replierIds = items
      .map((message) => message.repliedBy)
      .filter((repliedBy): repliedBy is string => Boolean(repliedBy));
    const users = await this.marshmallowMessageRepository.findUsersByIds(
      tenantSchema,
      replierIds,
    );
    const repliers = new Map(users.map((user) => [user.id, user]));

    return buildMarshmallowMessageListResponse({
      items,
      repliers,
      total,
      stats: buildMarshmallowMessageStats(statsRow),
    });
  }

  async approve(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    context: RequestContext,
  ) {
    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);

    if (message.status === 'approved') {
      return buildMarshmallowModerationResponse({
        id: message.id,
        status: 'approved',
        moderatedAt: message.moderatedAt,
      });
    }

    const updated = await this.marshmallowMessageRepository.approve(
      talentId,
      tenantSchema,
      messageId,
      context.userId ?? '',
    );

    await this.safeInsertChangeLog(
      tenantSchema,
      {
        action: 'approve',
        objectType: 'marshmallow_message',
        objectId: messageId,
        objectName: 'Message',
        diff: { old: { status: message.status }, new: { status: 'approved' } },
      },
      context,
    );

    return buildMarshmallowModerationResponse(updated);
  }

  async reject(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    dto: RejectMessageDto,
    context: RequestContext,
  ) {
    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);
    const updated = await this.marshmallowMessageRepository.reject(
      talentId,
      tenantSchema,
      messageId,
      dto,
      context.userId ?? '',
    );

    await this.safeInsertChangeLog(
      tenantSchema,
      {
        action: 'reject',
        objectType: 'marshmallow_message',
        objectId: messageId,
        objectName: 'Message',
        diff: {
          old: { status: message.status },
          new: { status: 'rejected', reason: dto.reason },
        },
      },
      context,
    );

    return buildMarshmallowModerationResponse(updated);
  }

  async unreject(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    context: RequestContext,
  ) {
    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);

    if (!canUnrejectMarshmallowMessage(message.status)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only unreject rejected messages',
      });
    }

    const updated = await this.marshmallowMessageRepository.unreject(
      talentId,
      tenantSchema,
      messageId,
    );

    await this.safeInsertChangeLog(
      tenantSchema,
      {
        action: 'unreject',
        objectType: 'marshmallow_message',
        objectId: messageId,
        objectName: 'Message',
        diff: {
          old: {
            status: 'rejected',
            reason: message.rejectionReason,
          },
          new: { status: 'pending' },
        },
      },
      context,
    );

    return buildMarshmallowModerationResponse(updated);
  }

  async reply(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    dto: ReplyMessageDto,
    context: RequestContext,
  ) {
    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);

    if (!canReplyToMarshmallowMessage(message.status)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Can only reply to approved messages',
      });
    }

    const updated = await this.marshmallowMessageRepository.reply(
      talentId,
      tenantSchema,
      messageId,
      dto,
      context.userId ?? '',
    );

    await this.safeInsertChangeLog(
      tenantSchema,
      {
        action: 'reply',
        objectType: 'marshmallow_message',
        objectId: messageId,
        objectName: 'Message',
        diff: { new: buildMarshmallowReplyDiff(dto.content) },
      },
      context,
    );

    return buildMarshmallowReplyResponse({
      row: updated,
      repliedBy: {
        id: context.userId ?? '',
        username: context.userName ?? '',
      },
    });
  }

  async update(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const message = await this.getMessageOrThrow(talentId, tenantSchema, messageId);
    const changes = buildMarshmallowMessageUpdateFieldChanges(dto);

    if (changes.length === 0) {
      return buildMarshmallowMessageUpdateResponse({
        id: message.id,
        isRead: message.isRead,
        isStarred: message.isStarred,
        isPinned: message.isPinned,
      });
    }

    const updated = await this.marshmallowMessageRepository.updateFields(
      talentId,
      tenantSchema,
      messageId,
      changes,
    );

    return buildMarshmallowMessageUpdateResponse(updated);
  }

  async batchAction(
    talentId: string,
    tenantSchema: string,
    dto: BatchActionDto,
    context: RequestContext,
  ) {
    const ownedCount = await this.marshmallowMessageRepository.countOwnedMessages(
      talentId,
      tenantSchema,
      dto.messageIds,
    );

    if (ownedCount !== dto.messageIds.length) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Some messages not found',
      });
    }

    await this.marshmallowMessageRepository.batchAction(
      talentId,
      tenantSchema,
      dto,
      context.userId ?? '',
    );

    return {
      processed: dto.messageIds.length,
      action: dto.action,
    };
  }

  private async getMessageOrThrow(
    talentId: string,
    tenantSchema: string,
    messageId: string,
  ) {
    const message = await this.marshmallowMessageRepository.findMessageById(
      talentId,
      tenantSchema,
      messageId,
    );

    if (!message) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Message not found',
      });
    }

    return message;
  }

  private async safeInsertChangeLog(
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
    try {
      await this.marshmallowMessageRepository.insertChangeLog(
        tenantSchema,
        data,
        context,
      );
    } catch (error) {
      this.logger.error('Failed to create change log', error);
    }
  }
}
