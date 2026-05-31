// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database';
import { WebhookDeliveryRepository } from './webhook-delivery.repository';

describe('WebhookDeliveryRepository', () => {
  it('fails closed instead of falling back to tenant_template when tenant schema is missing', async () => {
    const prisma = {
      $queryRawUnsafe: vi.fn(),
    };
    const repository = new WebhookDeliveryRepository({
      getPrisma: () => prisma,
    } as unknown as DatabaseService);

    await expect(repository.findAttemptById(null as unknown as string, 'webhook-id', 'attempt-id'))
      .rejects.toThrow('Webhook delivery tenant schema is required');
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
