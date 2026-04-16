// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarshmallowReactionApplicationService } from '../../application/marshmallow-reaction.service';
import { MarshmallowReactionService } from '../marshmallow-reaction.service';

describe('MarshmallowReactionService', () => {
  let service: MarshmallowReactionService;

  const mockApplicationService = {
    toggleReaction: vi.fn(),
    getUserReactions: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MarshmallowReactionService(
      mockApplicationService as unknown as MarshmallowReactionApplicationService,
    );
  });

  it('delegates public reaction toggles to the layered application service', async () => {
    mockApplicationService.toggleReaction.mockResolvedValue({
      added: true,
      counts: { '❤️': 1 },
    });

    await expect(
      service.toggleReaction('message-123', '❤️', {
        fingerprint: 'fingerprint-abc',
        ip: '192.168.1.1',
      }),
    ).resolves.toEqual({
      added: true,
      counts: { '❤️': 1 },
    });
  });

  it('keeps user-reaction lookups available through the compatibility facade', async () => {
    mockApplicationService.getUserReactions.mockResolvedValue({
      'message-123': ['❤️', '👍'],
    });

    await expect(
      service.getUserReactions(
        ['message-123'],
        'fingerprint-abc',
        'tenant_test',
      ),
    ).resolves.toEqual({
      'message-123': ['❤️', '👍'],
    });
  });
});
