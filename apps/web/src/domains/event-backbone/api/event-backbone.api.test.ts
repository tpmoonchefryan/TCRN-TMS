import { describe, expect, it, vi } from 'vitest';

import { readEventBackboneSummary } from './event-backbone.api';

describe('event backbone API', () => {
  it('reads the AC-only event backbone summary from platform scope', async () => {
    const request = vi.fn().mockResolvedValue({});

    await readEventBackboneSummary(request, 'shared_dev');

    expect(request).toHaveBeenCalledWith(
      '/api/v1/event-backbone/summary?environment=shared_dev'
    );
    expect(JSON.stringify(request.mock.calls)).not.toContain('/tenant/');
  });
});
