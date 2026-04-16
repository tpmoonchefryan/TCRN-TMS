// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
} from '@nestjs/common';

import { MarshmallowReactionApplicationService } from '../application/marshmallow-reaction.service';
import type { MarshmallowReactionContext } from '../domain/marshmallow-reaction.policy';

@Injectable()
export class MarshmallowReactionService {
  constructor(
    private readonly marshmallowReactionApplicationService: MarshmallowReactionApplicationService,
  ) {}

  /**
   * Toggle reaction on message (multi-tenant aware)
   */
  toggleReaction(
    messageId: string,
    reaction: string,
    context: MarshmallowReactionContext,
  ): Promise<{ added: boolean; counts: Record<string, number> }> {
    return this.marshmallowReactionApplicationService.toggleReaction(
      messageId,
      reaction,
      context,
    );
  }

  /**
   * Get user's reactions for multiple messages (multi-tenant aware)
   * Note: tenantSchema must be provided by the caller (e.g., PublicMarshmallowService)
   */
  getUserReactions(
    messageIds: string[],
    fingerprint: string,
    tenantSchema?: string,
  ): Promise<Record<string, string[]>> {
    return this.marshmallowReactionApplicationService.getUserReactions(
      messageIds,
      fingerprint,
      tenantSchema,
    );
  }
}
