import { describe, expect, it, vi } from 'vitest';

import {
  listPlatformToolConnections,
  readPlatformToolConnection,
  readPlatformToolDeepLink,
  runPlatformToolHealthCheck,
  savePlatformToolConnection,
} from './platform-tool-connections.api';

describe('platform tool connections API', () => {
  it('uses the AC-only platform-tools API family', async () => {
    const request = vi.fn().mockResolvedValue([]);

    await listPlatformToolConnections(request, {
      environment: 'shared_dev',
      family: 'observability_console',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/platform-tools/connections?environment=shared_dev&family=observability_console'
    );
  });

  it('builds detail, health, deep-link, and mutation paths without ordinary tenant routes', async () => {
    const request = vi.fn().mockResolvedValue({});

    await readPlatformToolConnection(request, 'grafana', 'local');
    await runPlatformToolHealthCheck(request, 'grafana', 'local');
    await readPlatformToolDeepLink(request, 'grafana', 'local');
    await savePlatformToolConnection(request, 'grafana', {
      environment: 'local',
      enabled: false,
    });

    expect(request.mock.calls.map(([path]) => path)).toEqual([
      '/api/v1/platform-tools/connections/grafana?environment=local',
      '/api/v1/platform-tools/connections/grafana/health-check?environment=local',
      '/api/v1/platform-tools/connections/grafana/deep-link?environment=local',
      '/api/v1/platform-tools/connections/grafana',
    ]);
    expect(JSON.stringify(request.mock.calls)).not.toContain('/tenant/');
  });
});
