// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it, vi } from 'vitest';

import { runSessionBootstrap } from '@/stores/auth-session-bootstrap';

describe('runSessionBootstrap', () => {
  it('returns ready when both tasks succeed', async () => {
    const result = await runSessionBootstrap({
      talents: vi.fn().mockResolvedValue({ success: true }),
      permissions: vi.fn().mockResolvedValue({ success: true }),
    });

    expect(result).toEqual({
      status: 'ready',
      tasks: {
        talents: { success: true },
        permissions: { success: true },
      },
      errors: null,
    });
  });

  it('returns degraded and preserves per-task errors when one task fails', async () => {
    const result = await runSessionBootstrap({
      talents: vi.fn().mockResolvedValue({ success: false, error: 'tree unavailable' }),
      permissions: vi.fn().mockResolvedValue({ success: true }),
    });

    expect(result.status).toBe('degraded');
    expect(result.tasks.talents).toEqual({ success: false, error: 'tree unavailable' });
    expect(result.tasks.permissions).toEqual({ success: true });
    expect(result.errors).toEqual({ talents: 'tree unavailable' });
  });

  it('converts thrown task errors into degraded results', async () => {
    const result = await runSessionBootstrap({
      talents: vi.fn().mockRejectedValue(new Error('network down')),
      permissions: vi.fn().mockResolvedValue({ success: true }),
    });

    expect(result.status).toBe('degraded');
    expect(result.tasks.talents).toEqual({ success: false, error: 'network down' });
    expect(result.errors).toEqual({ talents: 'network down' });
  });

  it('starts both tasks without waiting for the first to finish', async () => {
    const order: string[] = [];

    const talents = vi.fn(async () => {
      order.push('talents:start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('talents:end');
      return { success: true };
    });

    const permissions = vi.fn(async () => {
      order.push('permissions:start');
      return { success: true };
    });

    await runSessionBootstrap({ talents, permissions });

    expect(order.indexOf('permissions:start')).toBeGreaterThan(-1);
    expect(order.indexOf('permissions:start')).toBeLessThan(order.indexOf('talents:end'));
  });
});
