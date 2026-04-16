// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  appendMarshmallowUserReactions,
  assertMarshmallowReactionAllowed,
  buildMarshmallowReactionCounts,
  buildMarshmallowReactionLookupResult,
  type MarshmallowReactionContext,
} from '../domain/marshmallow-reaction.policy';
import { MarshmallowReactionRepository } from '../infrastructure/marshmallow-reaction.repository';

@Injectable()
export class MarshmallowReactionApplicationService {
  private readonly logger = new Logger(MarshmallowReactionApplicationService.name);

  constructor(
    private readonly marshmallowReactionRepository: MarshmallowReactionRepository,
  ) {}

  async toggleReaction(
    messageId: string,
    reaction: string,
    context: MarshmallowReactionContext,
  ): Promise<{ added: boolean; counts: Record<string, number> }> {
    const result = await this.findMessageWithTenant(messageId);

    if (!result || result.message.status !== 'approved') {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Message not found',
      });
    }

    const { tenantSchema } = result;
    assertMarshmallowReactionAllowed(result.config, reaction);

    const existingReactionId =
      await this.marshmallowReactionRepository.findExistingReactionId(
        tenantSchema,
        messageId,
        context.fingerprint,
        reaction,
      );

    const added = !existingReactionId;
    if (existingReactionId) {
      await this.marshmallowReactionRepository.deleteReaction(
        tenantSchema,
        existingReactionId,
      );
    } else {
      await this.marshmallowReactionRepository.insertReaction(
        tenantSchema,
        messageId,
        reaction,
        context,
      );
    }

    const counts = await this.updateReactionCounts(tenantSchema, messageId);
    return { added, counts };
  }

  async getUserReactions(
    messageIds: string[],
    fingerprint: string,
    tenantSchema?: string,
  ): Promise<Record<string, string[]>> {
    if (messageIds.length === 0) {
      return {};
    }

    if (tenantSchema) {
      return appendMarshmallowUserReactions(
        {},
        await this.marshmallowReactionRepository.findUserReactions(
          tenantSchema,
          messageIds,
          fingerprint,
        ),
      );
    }

    const tenantSchemas =
      await this.marshmallowReactionRepository.listSearchableTenantSchemas();
    let result: Record<string, string[]> = {};

    for (const schemaName of tenantSchemas) {
      try {
        result = appendMarshmallowUserReactions(
          result,
          await this.marshmallowReactionRepository.findUserReactions(
            schemaName,
            messageIds,
            fingerprint,
          ),
        );
      } catch (error) {
        this.logger.warn(
          `Skipping marshmallow reaction scan in schema ${schemaName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return result;
  }

  private async findMessageWithTenant(messageId: string) {
    const tenantSchemas =
      await this.marshmallowReactionRepository.listSearchableTenantSchemas();

    for (const schemaName of tenantSchemas) {
      try {
        const record =
          await this.marshmallowReactionRepository.findPublishedMessageAccessInTenant(
            schemaName,
            messageId,
          );

        if (record) {
          return buildMarshmallowReactionLookupResult(schemaName, record);
        }
      } catch (error) {
        this.logger.warn(
          `Skipping marshmallow reaction lookup in schema ${schemaName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return null;
  }

  private async updateReactionCounts(
    tenantSchema: string,
    messageId: string,
  ): Promise<Record<string, number>> {
    const counts = buildMarshmallowReactionCounts(
      await this.marshmallowReactionRepository.findReactionCounts(
        tenantSchema,
        messageId,
      ),
    );

    await this.marshmallowReactionRepository.updateMessageReactionCounts(
      tenantSchema,
      messageId,
      counts,
    );

    return counts;
  }
}
