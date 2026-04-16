// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarshmallowMessageRepository } from '../infrastructure/marshmallow-message.repository';
import { MarshmallowMessageApplicationService } from './marshmallow-message.service';

describe('MarshmallowMessageApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Moderator',
    ipAddress: '127.0.0.1',
    requestId: 'req-1',
  };

  const mockRepository = {
    findMany: vi.fn(),
    countMany: vi.fn(),
    findStatsByTalentId: vi.fn(),
    findUsersByIds: vi.fn(),
    findMessageById: vi.fn(),
    countOwnedMessages: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    unreject: vi.fn(),
    reply: vi.fn(),
    updateFields: vi.fn(),
    batchAction: vi.fn(),
    insertChangeLog: vi.fn(),
  } as unknown as MarshmallowMessageRepository;

  const service = new MarshmallowMessageApplicationService(mockRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped message rows, stats, and replier metadata', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([
      {
        id: 'message-1',
        content: 'Hello',
        senderName: 'Aki Fan',
        isAnonymous: false,
        status: 'approved',
        rejectionReason: null,
        isRead: true,
        isStarred: false,
        isPinned: false,
        replyContent: 'Thanks',
        repliedAt: new Date('2026-04-14T00:10:00.000Z'),
        repliedBy: 'user-2',
        reactionCounts: { '❤️': 2 },
        profanityFlags: null,
        imageUrl: null,
        imageUrls: null,
        socialLink: null,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
      },
    ]);
    vi.mocked(mockRepository.countMany).mockResolvedValue(1);
    vi.mocked(mockRepository.findStatsByTalentId).mockResolvedValue({
      pending: 1n,
      approved: 2n,
      rejected: 3n,
      unread: 4n,
    });
    vi.mocked(mockRepository.findUsersByIds).mockResolvedValue([
      { id: 'user-2', username: 'alice' },
    ]);

    await expect(
      service.findMany('talent-1', 'tenant_test', {}),
    ).resolves.toEqual({
      items: [
        {
          id: 'message-1',
          content: 'Hello',
          senderName: 'Aki Fan',
          isAnonymous: false,
          status: 'approved',
          rejectionReason: null,
          isRead: true,
          isStarred: false,
          isPinned: false,
          replyContent: 'Thanks',
          repliedAt: '2026-04-14T00:10:00.000Z',
          repliedBy: { id: 'user-2', username: 'alice' },
          reactionCounts: { '❤️': 2 },
          profanityFlags: [],
          imageUrl: null,
          imageUrls: [],
          socialLink: null,
          createdAt: '2026-04-14T00:00:00.000Z',
        },
      ],
      total: 1,
      stats: {
        pendingCount: 1,
        approvedCount: 2,
        rejectedCount: 3,
        unreadCount: 4,
      },
    });
  });

  it('fails closed when a target message cannot be resolved', async () => {
    vi.mocked(mockRepository.findMessageById).mockResolvedValue(null);

    await expect(
      service.approve('talent-1', 'tenant_test', 'missing-message', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns the current moderation payload when the message is already approved', async () => {
    vi.mocked(mockRepository.findMessageById).mockResolvedValue({
      id: 'message-1',
      content: 'Hello',
      senderName: null,
      isAnonymous: true,
      status: 'approved',
      rejectionReason: null,
      isRead: false,
      isStarred: false,
      isPinned: false,
      replyContent: null,
      repliedAt: null,
      repliedBy: null,
      moderatedAt: new Date('2026-04-14T00:00:00.000Z'),
      moderatedBy: 'user-2',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    await expect(
      service.approve('talent-1', 'tenant_test', 'message-1', context),
    ).resolves.toEqual({
      id: 'message-1',
      status: 'approved',
      moderatedAt: '2026-04-14T00:00:00.000Z',
    });

    expect(mockRepository.approve).not.toHaveBeenCalled();
  });

  it('rejects the message and writes the moderation diff to change_log', async () => {
    vi.mocked(mockRepository.findMessageById).mockResolvedValue({
      id: 'message-1',
      content: 'Hello',
      senderName: null,
      isAnonymous: true,
      status: 'pending',
      rejectionReason: null,
      isRead: false,
      isStarred: false,
      isPinned: false,
      replyContent: null,
      repliedAt: null,
      repliedBy: null,
      moderatedAt: null,
      moderatedBy: null,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockRepository.reject).mockResolvedValue({
      id: 'message-1',
      status: 'rejected',
      moderatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });

    await expect(
      service.reject(
        'talent-1',
        'tenant_test',
        'message-1',
        { reason: 'spam' as never, note: 'Repeated links' },
        context,
      ),
    ).resolves.toEqual({
      id: 'message-1',
      status: 'rejected',
      moderatedAt: '2026-04-14T00:05:00.000Z',
    });

    expect(mockRepository.insertChangeLog).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        action: 'reject',
        diff: {
          old: { status: 'pending' },
          new: { status: 'rejected', reason: 'spam' },
        },
      }),
      context,
    );
  });

  it('fails closed when unreject is attempted on a non-rejected message', async () => {
    vi.mocked(mockRepository.findMessageById).mockResolvedValue({
      id: 'message-1',
      content: 'Hello',
      senderName: null,
      isAnonymous: true,
      status: 'pending',
      rejectionReason: null,
      isRead: false,
      isStarred: false,
      isPinned: false,
      replyContent: null,
      repliedAt: null,
      repliedBy: null,
      moderatedAt: null,
      moderatedBy: null,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    await expect(
      service.unreject('talent-1', 'tenant_test', 'message-1', context),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails closed when replying to a non-approved message', async () => {
    vi.mocked(mockRepository.findMessageById).mockResolvedValue({
      id: 'message-1',
      content: 'Hello',
      senderName: null,
      isAnonymous: true,
      status: 'pending',
      rejectionReason: null,
      isRead: false,
      isStarred: false,
      isPinned: false,
      replyContent: null,
      repliedAt: null,
      repliedBy: null,
      moderatedAt: null,
      moderatedBy: null,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    await expect(
      service.reply(
        'talent-1',
        'tenant_test',
        'message-1',
        { content: 'Thanks!' },
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns the current read/star/pin state when no update fields are supplied', async () => {
    vi.mocked(mockRepository.findMessageById).mockResolvedValue({
      id: 'message-1',
      content: 'Hello',
      senderName: null,
      isAnonymous: true,
      status: 'approved',
      rejectionReason: null,
      isRead: true,
      isStarred: false,
      isPinned: true,
      replyContent: null,
      repliedAt: null,
      repliedBy: null,
      moderatedAt: null,
      moderatedBy: null,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    await expect(
      service.update('talent-1', 'tenant_test', 'message-1', {}),
    ).resolves.toEqual({
      id: 'message-1',
      isRead: true,
      isStarred: false,
      isPinned: true,
    });

    expect(mockRepository.updateFields).not.toHaveBeenCalled();
  });

  it('fails closed when batchAction receives messages outside the talent scope', async () => {
    vi.mocked(mockRepository.countOwnedMessages).mockResolvedValue(1);

    await expect(
      service.batchAction(
        'talent-1',
        'tenant_test',
        {
          messageIds: ['message-1', 'message-2'],
          action: 'markRead',
        },
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('executes batchAction through the repository once ownership is verified', async () => {
    vi.mocked(mockRepository.countOwnedMessages).mockResolvedValue(2);

    await expect(
      service.batchAction(
        'talent-1',
        'tenant_test',
        {
          messageIds: ['message-1', 'message-2'],
          action: 'markRead',
        },
        context,
      ),
    ).resolves.toEqual({
      processed: 2,
      action: 'markRead',
    });

    expect(mockRepository.batchAction).toHaveBeenCalledWith(
      'talent-1',
      'tenant_test',
      {
        messageIds: ['message-1', 'message-2'],
        action: 'markRead',
      },
      'user-1',
    );
  });
});
