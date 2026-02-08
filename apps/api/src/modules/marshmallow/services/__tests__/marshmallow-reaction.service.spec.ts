// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { MarshmallowReactionService } from '../marshmallow-reaction.service';

describe.skip('MarshmallowReactionService', () => {
  let service: MarshmallowReactionService;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockPrisma: {
    $transaction: ReturnType<typeof vi.fn>;
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };

  const mockMessage = {
    id: 'message-123',
    tenant_schema: 'tenant_test',
    config_id: 'config-123',
    status: 'approved',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
      $queryRawUnsafe: vi.fn().mockResolvedValue([mockMessage]),
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    service = new MarshmallowReactionService(
      mockDatabaseService as DatabaseService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('toggleReaction', () => {
    it('should add reaction to message when not reacted', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockMessage]) // findMessageWithTenant
        .mockResolvedValueOnce([]) // check existing reaction
        .mockResolvedValueOnce([{ reaction: '❤️', count: BigInt(1) }]); // get counts

      const result = await service.toggleReaction(
        'message-123',
        '❤️',
        { fingerprint: 'fingerprint-abc', ip: '192.168.1.1' },
      );

      expect(result.added).toBe(true);
      expect(result.counts).toBeDefined();
    });

    it('should remove reaction when already reacted', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockMessage]) // findMessageWithTenant
        .mockResolvedValueOnce([{ id: 'reaction-123' }]) // existing reaction found
        .mockResolvedValueOnce([]); // get counts after removal

      const result = await service.toggleReaction(
        'message-123',
        '❤️',
        { fingerprint: 'fingerprint-abc', ip: '192.168.1.1' },
      );

      expect(result.added).toBe(false);
    });

    it('should throw NotFoundException for non-existent message', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await expect(
        service.toggleReaction('invalid-message', '❤️', { fingerprint: 'fp', ip: '1.1.1.1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserReactions', () => {
    it('should return user reactions for messages', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { message_id: 'message-123', reaction: '❤️' },
        { message_id: 'message-123', reaction: '👍' },
      ]);

      const result = await service.getUserReactions(
        ['message-123'],
        'fingerprint-abc',
        'tenant_test',
      );

      expect(result['message-123']).toContain('❤️');
      expect(result['message-123']).toContain('👍');
    });

    it('should return empty object when no reactions', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.getUserReactions(
        ['message-123'],
        'fingerprint-new',
        'tenant_test',
      );

      expect(Object.keys(result).length).toBe(0);
    });
  });
});
