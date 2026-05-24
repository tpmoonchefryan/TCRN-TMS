import { describe, expect, it, vi } from 'vitest';

import {
  createScopedAdapter,
  createTenantAdapter,
  listAdapterDefinitions,
} from './interface-management.api';

describe('interface-management.api', () => {
  it('loads the current addable adapter catalog from the Integration API', async () => {
    const request = vi.fn(async (path: string) => {
      if (path === '/api/v1/integration/adapter-definitions') {
        return [{ key: 'ai-adapter' }];
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    await expect(listAdapterDefinitions(request as never)).resolves.toEqual([
      { key: 'ai-adapter' },
    ]);
  });

  it('sends tenant-root AI Adapter create payloads through the tenant adapter endpoint', async () => {
    const request = vi.fn(async () => ({ id: 'adapter-ai-1' }));

    await createTenantAdapter(request as never, {
      definitionKey: 'ai-adapter',
      inherit: true,
      configs: [
        { configKey: 'provider', configValue: 'OPENAI' },
        { configKey: 'endpoint_path', configValue: '/v1/responses' },
        { configKey: 'model', configValue: 'gpt-example' },
        { configKey: 'token', configValue: 'provider-token' },
      ],
    });

    expect(request).toHaveBeenCalledWith(
      '/api/v1/integration/adapters',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          definitionKey: 'ai-adapter',
          inherit: true,
          configs: [
            { configKey: 'provider', configValue: 'OPENAI' },
            { configKey: 'endpoint_path', configValue: '/v1/responses' },
            { configKey: 'model', configValue: 'gpt-example' },
            { configKey: 'token', configValue: 'provider-token' },
          ],
        }),
      })
    );
  });

  it('sends scoped AI Adapter create payloads through explicit owner-root endpoints', async () => {
    const request = vi.fn(async () => ({ id: 'adapter-ai-1' }));

    await createScopedAdapter(
      request as never,
      {
        ownerType: 'talent',
        ownerId: 'talent-1',
      },
      {
        definitionKey: 'ai-adapter',
        inherit: false,
        configs: [
          { configKey: 'provider', configValue: 'GEMINI' },
          { configKey: 'endpoint_path', configValue: '/v1beta/models/{model}:generateContent' },
          { configKey: 'model', configValue: 'gemini-example' },
          { configKey: 'token', configValue: 'provider-token' },
        ],
      }
    );

    expect(request).toHaveBeenCalledWith(
      '/api/v1/talents/talent-1/integration/adapters',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          definitionKey: 'ai-adapter',
          inherit: false,
          configs: [
            { configKey: 'provider', configValue: 'GEMINI' },
            { configKey: 'endpoint_path', configValue: '/v1beta/models/{model}:generateContent' },
            { configKey: 'model', configValue: 'gemini-example' },
            { configKey: 'token', configValue: 'provider-token' },
          ],
        }),
      })
    );
  });
});
