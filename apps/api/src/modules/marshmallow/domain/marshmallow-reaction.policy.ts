// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

export interface MarshmallowReactionLookupRecord {
  id: string;
  status: string;
  configId: string;
  reactionsEnabled: boolean;
  allowedReactions: string[];
}

export interface MarshmallowReactionLookupResult {
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
}

export interface MarshmallowReactionCountRow {
  reaction: string;
  count: bigint;
}

export interface MarshmallowUserReactionRow {
  messageId: string;
  reaction: string;
}

export interface MarshmallowReactionContext {
  fingerprint: string;
  ip: string;
}

export const buildMarshmallowReactionLookupResult = (
  tenantSchema: string,
  record: MarshmallowReactionLookupRecord,
): MarshmallowReactionLookupResult => ({
  tenantSchema,
  message: {
    id: record.id,
    status: record.status,
    configId: record.configId,
  },
  config: {
    reactionsEnabled: record.reactionsEnabled,
    allowedReactions: record.allowedReactions,
  },
});

export const assertMarshmallowReactionAllowed = (
  config: {
    reactionsEnabled: boolean;
    allowedReactions: string[];
  },
  reaction: string,
): void => {
  if (!config.reactionsEnabled) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Reactions are disabled',
    });
  }

  if (
    config.allowedReactions.length > 0 &&
    !config.allowedReactions.includes(reaction)
  ) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Invalid reaction',
    });
  }
};

export const buildMarshmallowReactionCounts = (
  rows: MarshmallowReactionCountRow[],
): Record<string, number> => {
  const counts: Record<string, number> = {};

  for (const row of rows) {
    counts[row.reaction] = Number(row.count);
  }

  return counts;
};

export const appendMarshmallowUserReactions = (
  target: Record<string, string[]>,
  rows: MarshmallowUserReactionRow[],
): Record<string, string[]> => {
  for (const row of rows) {
    if (!target[row.messageId]) {
      target[row.messageId] = [];
    }

    target[row.messageId].push(row.reaction);
  }

  return target;
};
