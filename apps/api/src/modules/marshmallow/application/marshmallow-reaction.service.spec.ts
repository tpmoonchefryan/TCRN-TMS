// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarshmallowReactionRepository } from '../infrastructure/marshmallow-reaction.repository';
import { MarshmallowReactionApplicationService } from './marshmallow-reaction.service';

describe('MarshmallowReactionApplicationService', () => {
  let service: MarshmallowReactionApplicationService;

  const mockRepository = {
    listSearchableTenantSchemas: vi.fn(),
    findPublishedMessageAccessInTenant: vi.fn(),
    findExistingReactionId: vi.fn(),
    deleteReaction: vi.fn(),
    insertReaction: vi.fn(),
    findReactionCounts: vi.fn(),
    updateMessageReactionCounts: vi.fn(),
    findUserReactions: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MarshmallowReactionApplicationService(
      mockRepository as unknown as MarshmallowReactionRepository,
    );
  });

  it('adds a reaction and refreshes cached counts through the layered repository boundary', async () => {
    mockRepository.listSearchableTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockRepository.findPublishedMessageAccessInTenant.mockResolvedValue({
      id: 'message-1',
      status: 'approved',
      configId: 'config-1',
      reactionsEnabled: true,
      allowedReactions: [],
    });
    mockRepository.findExistingReactionId.mockResolvedValue(null);
    mockRepository.insertReaction.mockResolvedValue(undefined);
    mockRepository.findReactionCounts.mockResolvedValue([
      { reaction: '❤️', count: BigInt(1) },
    ]);
    mockRepository.updateMessageReactionCounts.mockResolvedValue(undefined);

    await expect(
      service.toggleReaction('message-1', '❤️', {
        fingerprint: 'fp-1',
        ip: '127.0.0.1',
      }),
    ).resolves.toEqual({
      added: true,
      counts: { '❤️': 1 },
    });
  });

  it('removes an existing reaction and keeps zero-count maps available', async () => {
    mockRepository.listSearchableTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockRepository.findPublishedMessageAccessInTenant.mockResolvedValue({
      id: 'message-1',
      status: 'approved',
      configId: 'config-1',
      reactionsEnabled: true,
      allowedReactions: ['❤️'],
    });
    mockRepository.findExistingReactionId.mockResolvedValue('reaction-1');
    mockRepository.deleteReaction.mockResolvedValue(undefined);
    mockRepository.findReactionCounts.mockResolvedValue([]);
    mockRepository.updateMessageReactionCounts.mockResolvedValue(undefined);

    await expect(
      service.toggleReaction('message-1', '❤️', {
        fingerprint: 'fp-1',
        ip: '127.0.0.1',
      }),
    ).resolves.toEqual({
      added: false,
      counts: {},
    });
  });

  it('treats missing or non-approved messages as not found', async () => {
    mockRepository.listSearchableTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockRepository.findPublishedMessageAccessInTenant.mockResolvedValue(null);

    await expect(
      service.toggleReaction('missing-message', '❤️', {
        fingerprint: 'fp-1',
        ip: '127.0.0.1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects disabled reactions or invalid emojis through the domain policy', async () => {
    mockRepository.listSearchableTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockRepository.findPublishedMessageAccessInTenant.mockResolvedValue({
      id: 'message-1',
      status: 'approved',
      configId: 'config-1',
      reactionsEnabled: false,
      allowedReactions: [],
    });

    await expect(
      service.toggleReaction('message-1', '❤️', {
        fingerprint: 'fp-1',
        ip: '127.0.0.1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns user reactions directly when the caller already knows the tenant schema', async () => {
    mockRepository.findUserReactions.mockResolvedValue([
      { messageId: 'message-1', reaction: '❤️' },
      { messageId: 'message-1', reaction: '🔥' },
    ]);

    await expect(
      service.getUserReactions(['message-1'], 'fp-1', 'tenant_demo'),
    ).resolves.toEqual({
      'message-1': ['❤️', '🔥'],
    });
  });
});
