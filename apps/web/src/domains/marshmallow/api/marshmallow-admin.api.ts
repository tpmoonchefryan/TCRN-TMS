// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { MarshmallowRejectionReason } from '@tcrn/shared';

import {
  marshmallowApi,
  type MarshmallowMessageRecord,
  type MarshmallowMessageStats,
} from '@/lib/api/modules/content';
import type { TalentInfo } from '@/platform/state/talent-store';

export type AdminMessageTab = MarshmallowMessageRecord['status'] | 'flagged';

export interface MarshmallowAdminListState {
  messages: MarshmallowMessageRecord[];
  stats: MarshmallowMessageStats;
}

export const DEFAULT_MARSHMALLOW_STATS: MarshmallowMessageStats = {
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  unreadCount: 0,
};

export function filterMarshmallowMessages(
  messages: MarshmallowMessageRecord[],
  activeTab: AdminMessageTab,
): MarshmallowMessageRecord[] {
  if (activeTab === 'flagged') {
    return messages.filter((message) => message.profanityFlags.length > 0);
  }

  return messages;
}

export function buildMarshmallowPublicPath(
  talent: Pick<TalentInfo, 'homepagePath' | 'code' | 'id'>,
): string {
  return `/m/${talent.homepagePath || talent.code?.toLowerCase() || talent.id}`;
}

export const marshmallowAdminApi = {
  getMessageList: async (
    talentId: string,
    activeTab: AdminMessageTab,
  ): Promise<MarshmallowAdminListState> => {
    const response = await marshmallowApi.getMessages(
      talentId,
      activeTab === 'flagged' ? undefined : activeTab,
    );

    if (!response.success || !response.data) {
      const error = new Error(response.error?.message || '');
      (error as Error & { code: string }).code = 'MARSHMALLOW_MESSAGES_LOAD_FAILED';
      throw error;
    }

    return {
      messages: response.data.items,
      stats: response.data.meta.stats,
    };
  },

  approveMessage: async (talentId: string, messageId: string) => {
    return marshmallowApi.approveMessage(talentId, messageId);
  },

  rejectMessage: async (
    talentId: string,
    messageId: string,
    reason: MarshmallowRejectionReason,
  ) => {
    return marshmallowApi.rejectMessage(talentId, messageId, reason);
  },

  unrejectMessage: async (talentId: string, messageId: string) => {
    return marshmallowApi.unrejectMessage(talentId, messageId);
  },

  replyMessage: async (talentId: string, messageId: string, content: string) => {
    return marshmallowApi.replyMessage(talentId, messageId, content);
  },

  toggleStar: async (talentId: string, messageId: string, isStarred: boolean) => {
    return marshmallowApi.updateMessage(talentId, messageId, { isStarred: !isStarred });
  },

  createStreamerModeUrl: async (
    talent: Pick<TalentInfo, 'id' | 'homepagePath' | 'code'>,
  ): Promise<string | null> => {
    const response = await marshmallowApi.generateSsoToken(talent.id);
    if (!response.success || !response.data?.token) {
      return null;
    }

    const publicPath = talent.homepagePath || talent.code?.toLowerCase() || talent.id;
    return `/m/${publicPath}?sso=${response.data.token}`;
  },
};
