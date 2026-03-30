// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it, vi } from 'vitest';

import { runSingleFlightTask } from '../auth-session-single-flight';

describe('runSingleFlightTask', () => {
  it('reuses an existing in-flight promise', async () => {
    const existingPromise = Promise.resolve(true);
    const task = vi.fn();

    await expect(
      runSingleFlightTask({
        currentPromise: existingPromise,
        setPromise: vi.fn(),
        task,
        onStart: vi.fn(),
      })
    ).resolves.toBe(true);

    expect(task).not.toHaveBeenCalled();
  });

  it('starts a new task once and clears the stored promise after resolve', async () => {
    const storedPromises: Array<Promise<string> | null> = [];
    const onStart = vi.fn();

    await expect(
      runSingleFlightTask<string>({
        currentPromise: null,
        setPromise: (promise) => {
          storedPromises.push(promise);
        },
        task: vi.fn().mockResolvedValue('ready'),
        onStart,
      })
    ).resolves.toBe('ready');

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(storedPromises).toHaveLength(2);
    expect(storedPromises[0]).toBeInstanceOf(Promise);
    expect(storedPromises[1]).toBeNull();
  });

  it('clears the stored promise when the task rejects', async () => {
    const storedPromises: Array<Promise<never> | null> = [];

    await expect(
      runSingleFlightTask<never>({
        currentPromise: null,
        setPromise: (promise) => {
          storedPromises.push(promise);
        },
        task: vi.fn().mockRejectedValue(new Error('network down')),
      })
    ).rejects.toThrow('network down');

    expect(storedPromises).toHaveLength(2);
    expect(storedPromises[0]).toBeInstanceOf(Promise);
    expect(storedPromises[1]).toBeNull();
  });
});
