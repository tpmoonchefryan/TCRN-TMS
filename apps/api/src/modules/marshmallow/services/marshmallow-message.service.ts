// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { MarshmallowMessageApplicationService } from '../application/marshmallow-message.service';
import {
  BatchActionDto,
  MessageListQueryDto,
  RejectMessageDto,
  ReplyMessageDto,
  UpdateMessageDto,
} from '../dto/marshmallow.dto';

@Injectable()
export class MarshmallowMessageService {
  constructor(
    private readonly marshmallowMessageApplicationService: MarshmallowMessageApplicationService,
  ) {}

  /**
   * List messages (multi-tenant aware)
   */
  findMany(talentId: string, tenantSchema: string, query: MessageListQueryDto) {
    return this.marshmallowMessageApplicationService.findMany(
      talentId,
      tenantSchema,
      query,
    );
  }

  /**
   * Approve message (multi-tenant aware)
   */
  approve(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    context: RequestContext,
  ) {
    return this.marshmallowMessageApplicationService.approve(
      talentId,
      tenantSchema,
      messageId,
      context,
    );
  }

  /**
   * Reject message (multi-tenant aware)
   */
  reject(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    dto: RejectMessageDto,
    context: RequestContext,
  ) {
    return this.marshmallowMessageApplicationService.reject(
      talentId,
      tenantSchema,
      messageId,
      dto,
      context,
    );
  }

  /**
   * Unreject message - restore rejected message to pending status (multi-tenant aware)
   */
  unreject(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    context: RequestContext,
  ) {
    return this.marshmallowMessageApplicationService.unreject(
      talentId,
      tenantSchema,
      messageId,
      context,
    );
  }

  /**
   * Reply to message (multi-tenant aware)
   */
  reply(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    dto: ReplyMessageDto,
    context: RequestContext,
  ) {
    return this.marshmallowMessageApplicationService.reply(
      talentId,
      tenantSchema,
      messageId,
      dto,
      context,
    );
  }

  /**
   * Batch action (multi-tenant aware)
   */
  batchAction(
    talentId: string,
    tenantSchema: string,
    dto: BatchActionDto,
    context: RequestContext,
  ) {
    return this.marshmallowMessageApplicationService.batchAction(
      talentId,
      tenantSchema,
      dto,
      context,
    );
  }

  /**
   * Update message (read, starred, pinned) - multi-tenant aware
   */
  update(
    talentId: string,
    tenantSchema: string,
    messageId: string,
    dto: UpdateMessageDto,
    _context: RequestContext,
  ) {
    return this.marshmallowMessageApplicationService.update(
      talentId,
      tenantSchema,
      messageId,
      dto,
    );
  }
}
