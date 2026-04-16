// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { MessageStatus, type UpdateMessageDto } from '../dto/marshmallow.dto';

export interface MarshmallowAdminMessageRow {
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
}

export interface MarshmallowMessageStatsRow {
  pending: bigint;
  approved: bigint;
  rejected: bigint;
  unread: bigint;
}

export interface MarshmallowReplierRecord {
  id: string;
  username: string;
}

export interface MarshmallowMessageDetailRecord {
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
}

export interface MarshmallowMessageModerationRow {
  id: string;
  status: string;
  moderatedAt: Date | null;
}

export interface MarshmallowMessageReplyRow {
  id: string;
  replyContent: string | null;
  repliedAt: Date | null;
}

export interface MarshmallowMessageUpdateRow {
  id: string;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
}

export interface MarshmallowMessageUpdateFieldChange {
  field: 'isRead' | 'isStarred' | 'isPinned';
  value: boolean;
}

export const buildMarshmallowMessageStats = (
  row: MarshmallowMessageStatsRow | null | undefined,
) => {
  const stats = row ?? {
    pending: 0n,
    approved: 0n,
    rejected: 0n,
    unread: 0n,
  };

  return {
    pendingCount: Number(stats.pending),
    approvedCount: Number(stats.approved),
    rejectedCount: Number(stats.rejected),
    unreadCount: Number(stats.unread),
  };
};

export const buildMarshmallowMessageListResponse = (params: {
  items: MarshmallowAdminMessageRow[];
  repliers: Map<string, MarshmallowReplierRecord>;
  total: number;
  stats: ReturnType<typeof buildMarshmallowMessageStats>;
}) => {
  const { items, repliers, stats, total } = params;

  return {
    items: items.map((message) => ({
      id: message.id,
      content: message.content,
      senderName: message.senderName,
      isAnonymous: message.isAnonymous,
      status: message.status,
      rejectionReason: message.rejectionReason,
      isRead: message.isRead,
      isStarred: message.isStarred,
      isPinned: message.isPinned,
      replyContent: message.replyContent,
      repliedAt: message.repliedAt?.toISOString() ?? null,
      repliedBy: message.repliedBy ? repliers.get(message.repliedBy) ?? null : null,
      reactionCounts: message.reactionCounts ?? {},
      profanityFlags: message.profanityFlags ?? [],
      imageUrl: message.imageUrl,
      imageUrls: message.imageUrls ?? (message.imageUrl ? [message.imageUrl] : []),
      socialLink: message.socialLink,
      createdAt: message.createdAt.toISOString(),
    })),
    total,
    stats,
  };
};

export const canUnrejectMarshmallowMessage = (status: string): boolean =>
  status === MessageStatus.REJECTED;

export const canReplyToMarshmallowMessage = (status: string): boolean =>
  status === MessageStatus.APPROVED;

export const buildMarshmallowModerationResponse = (
  row: MarshmallowMessageModerationRow,
) => ({
  id: row.id,
  status: row.status,
  moderatedAt: row.moderatedAt?.toISOString(),
});

export const buildMarshmallowReplyResponse = (params: {
  row: MarshmallowMessageReplyRow;
  repliedBy: { id: string; username: string };
}) => ({
  id: params.row.id,
  replyContent: params.row.replyContent,
  repliedAt: params.row.repliedAt?.toISOString(),
  repliedBy: params.repliedBy,
});

export const buildMarshmallowReplyDiff = (content: string) => ({
  replyContent: content.substring(0, 100),
});

export const buildMarshmallowMessageUpdateFieldChanges = (
  dto: UpdateMessageDto,
): MarshmallowMessageUpdateFieldChange[] => {
  const changes: MarshmallowMessageUpdateFieldChange[] = [];

  if (dto.isRead !== undefined) {
    changes.push({ field: 'isRead', value: dto.isRead });
  }

  if (dto.isStarred !== undefined) {
    changes.push({ field: 'isStarred', value: dto.isStarred });
  }

  if (dto.isPinned !== undefined) {
    changes.push({ field: 'isPinned', value: dto.isPinned });
  }

  return changes;
};

export const buildMarshmallowMessageUpdateResponse = (
  row: MarshmallowMessageUpdateRow,
) => ({
  id: row.id,
  isRead: row.isRead,
  isStarred: row.isStarred,
  isPinned: row.isPinned,
});
