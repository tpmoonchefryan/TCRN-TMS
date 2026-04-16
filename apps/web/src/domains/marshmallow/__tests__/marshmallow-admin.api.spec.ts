// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MarshmallowMessageRecord } from '@/lib/api/modules/content';

const mockGetMessages = vi.hoisted(() => vi.fn());
const mockGenerateSsoToken = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/modules/content', () => ({
  marshmallowApi: {
    getMessages: (...args: unknown[]) => mockGetMessages(...args),
    generateSsoToken: (...args: unknown[]) => mockGenerateSsoToken(...args),
  },
}));

import {
  buildMarshmallowPublicPath,
  filterMarshmallowMessages,
  marshmallowAdminApi,
} from '@/domains/marshmallow/api/marshmallow-admin.api';

describe('marshmallowAdminApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters flagged messages without mutating other tabs', () => {
    const messages: MarshmallowMessageRecord[] = [
      {
        id: 'message-1',
        content: 'hello',
        senderName: null,
        isAnonymous: true,
        profanityFlags: [],
        status: 'pending',
        rejectionReason: null,
        isRead: false,
        isStarred: false,
        isPinned: false,
        replyContent: null,
        repliedAt: null,
        repliedBy: null,
        reactionCounts: {},
        createdAt: '2026-04-13T00:00:00.000Z',
      },
      {
        id: 'message-2',
        content: 'blocked',
        senderName: null,
        isAnonymous: true,
        profanityFlags: ['keyword'],
        status: 'approved',
        rejectionReason: null,
        isRead: false,
        isStarred: false,
        isPinned: false,
        replyContent: null,
        repliedAt: null,
        repliedBy: null,
        reactionCounts: {},
        createdAt: '2026-04-13T00:00:00.000Z',
      },
    ];

    expect(filterMarshmallowMessages([...messages], 'flagged')).toEqual([messages[1]]);
    expect(filterMarshmallowMessages([...messages], 'pending')).toEqual(messages);
  });

  it('builds public and streamer URLs from the current talent identity', async () => {
    mockGenerateSsoToken.mockResolvedValue({
      success: true,
      data: {
        token: 'sso-token-1',
      },
    });

    expect(
      buildMarshmallowPublicPath({
        id: 'talent-1',
        homepagePath: 'demo-home',
        code: 'DEMO',
      }),
    ).toBe('/m/demo-home');

    await expect(
      marshmallowAdminApi.createStreamerModeUrl({
        id: 'talent-1',
        homepagePath: 'demo-home',
        code: 'DEMO',
      }),
    ).resolves.toBe('/m/demo-home?sso=sso-token-1');
  });
});
