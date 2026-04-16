// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarshmallowMessageApplicationService } from '../../application/marshmallow-message.service';
import { MarshmallowMessageService } from '../marshmallow-message.service';

describe('MarshmallowMessageService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Moderator',
    ipAddress: '127.0.0.1',
    requestId: 'req-1',
  };

  const mockApplicationService = {
    findMany: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    unreject: vi.fn(),
    reply: vi.fn(),
    update: vi.fn(),
    batchAction: vi.fn(),
  } as unknown as MarshmallowMessageApplicationService;

  const service = new MarshmallowMessageService(mockApplicationService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates list and single-message actions to the layered application service', async () => {
    vi.mocked(mockApplicationService.findMany).mockResolvedValue({
      items: [],
      total: 0,
      stats: {
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        unreadCount: 0,
      },
    });
    vi.mocked(mockApplicationService.approve).mockResolvedValue({
      id: 'message-1',
      status: 'approved',
      moderatedAt: '2026-04-14T00:00:00.000Z',
    });

    await expect(
      service.findMany('talent-1', 'tenant_test', {}),
    ).resolves.toMatchObject({ items: [], total: 0 });
    await expect(
      service.approve('talent-1', 'tenant_test', 'message-1', context),
    ).resolves.toMatchObject({ id: 'message-1', status: 'approved' });
  });

  it('delegates reject, unreject, reply, and update to the layered application service', async () => {
    vi.mocked(mockApplicationService.reject).mockResolvedValue({
      id: 'message-1',
      status: 'rejected',
      moderatedAt: '2026-04-14T00:05:00.000Z',
    });
    vi.mocked(mockApplicationService.unreject).mockResolvedValue({
      id: 'message-1',
      status: 'pending',
      moderatedAt: undefined,
    });
    vi.mocked(mockApplicationService.reply).mockResolvedValue({
      id: 'message-1',
      replyContent: 'Thanks!',
      repliedAt: '2026-04-14T00:10:00.000Z',
      repliedBy: { id: 'user-1', username: 'Moderator' },
    });
    vi.mocked(mockApplicationService.update).mockResolvedValue({
      id: 'message-1',
      isRead: true,
      isStarred: false,
      isPinned: true,
    });

    await expect(
      service.reject(
        'talent-1',
        'tenant_test',
        'message-1',
        { reason: 'spam' as never },
        context,
      ),
    ).resolves.toMatchObject({ status: 'rejected' });
    await expect(
      service.unreject('talent-1', 'tenant_test', 'message-1', context),
    ).resolves.toMatchObject({ status: 'pending' });
    await expect(
      service.reply(
        'talent-1',
        'tenant_test',
        'message-1',
        { content: 'Thanks!' },
        context,
      ),
    ).resolves.toMatchObject({ replyContent: 'Thanks!' });
    await expect(
      service.update(
        'talent-1',
        'tenant_test',
        'message-1',
        { isRead: true, isPinned: true },
        context,
      ),
    ).resolves.toMatchObject({ isPinned: true });
  });

  it('delegates batchAction to the layered application service', async () => {
    vi.mocked(mockApplicationService.batchAction).mockResolvedValue({
      processed: 1,
      action: 'markRead',
    });

    await expect(
      service.batchAction(
        'talent-1',
        'tenant_test',
        {
          messageIds: ['message-1'],
          action: 'markRead',
        },
        context,
      ),
    ).resolves.toEqual({
      processed: 1,
      action: 'markRead',
    });

    expect(mockApplicationService.batchAction).toHaveBeenCalledWith(
      'talent-1',
      'tenant_test',
      {
        messageIds: ['message-1'],
        action: 'markRead',
      },
      context,
    );
  });
});
