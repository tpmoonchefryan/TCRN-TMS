// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it, vi } from 'vitest';

import { OBSERVABILITY_ADAPTER_CODES } from '@tcrn/shared';

import { ObservabilityAdaptersService } from './observability-adapters.service';

function buildService(input: {
  env?: Record<string, string>;
  connections?: Array<Record<string, unknown>>;
  sso?: Array<Record<string, unknown>>;
} = {}) {
  const env = input.env ?? {};
  const prisma = {
    $executeRawUnsafe: vi.fn(async () => 1),
    $queryRawUnsafe: vi.fn(async (query: string, ...params: unknown[]) => {
      if (query.includes('FROM public.platform_tool_connection') && query.includes('LIMIT 1')) {
        const [tenantId, toolCode, environment] = params;
        return (input.connections ?? []).filter(
          (row) =>
            row.tenant_id === tenantId &&
            row.tool_code === toolCode &&
            row.environment === environment
        );
      }

      if (query.includes('FROM public.platform_tool_connection')) {
        return input.connections ?? [];
      }

      if (query.includes('FROM public.platform_external_tool_sso_readiness')) {
        if (params.length > 0) {
          return (input.sso ?? []).filter((row) => row.tool_code === params[0]);
        }

        return input.sso ?? [];
      }

      if (query.includes('.system_user')) {
        return [{ is_active: true }];
      }

      return [];
    }),
  };
  const databaseService = {
    getPrisma: () => prisma,
  };
  const configService = {
    get: vi.fn((key: string, fallback = '') => env[key] ?? fallback),
  };

    return {
      service: new ObservabilityAdaptersService(databaseService as never, configService as never),
      prisma,
  };
}

const context = {
  tenantId: '00000000-0000-0000-0000-0000000000ac',
  tenantSchema: 'tenant_ac',
  actorId: '00000000-0000-0000-0000-00000000ac01',
};

describe('ObservabilityAdaptersService', () => {
  it('returns the locked Phase 5 catalog and keeps Jaeger deferred', async () => {
    const { service } = buildService();
    const definitions = await service.listDefinitions(context);

    expect(definitions.map((definition) => definition.code)).toEqual(OBSERVABILITY_ADAPTER_CODES);
    expect(definitions).toHaveLength(7);
    expect(definitions.some((definition) => String(definition.code) === 'jaeger_trace_ui')).toBe(false);
    expect(definitions.every((definition) => definition.defaultEnabled === false)).toBe(true);
  });

  it('does not infer metrics export readiness from the trace endpoint', async () => {
    const { service } = buildService({
      env: {
        OTEL_ENABLED: 'true',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://tempo:4318',
      },
    });

    const summary = await service.getSummary({ environment: 'local' }, context);
    const trace = summary.find((item) => item.definition.code === 'otel_trace_exporter');
    const metrics = summary.find((item) => item.definition.code === 'otel_metrics_exporter');

    expect(trace?.profile).toEqual(
      expect.objectContaining({
        enabled: true,
        readinessState: 'external_provided',
        endpointConfigured: true,
      })
    );
    expect(metrics?.profile).toEqual(
      expect.objectContaining({
        enabled: false,
        readinessState: 'missing_config',
        endpointConfigured: false,
      })
    );
  });

  it('fails Grafana deep links closed until enabled, SSO-ready, healthy, and URL-safe', async () => {
    const connection = {
      id: 'connection-grafana',
      tenant_id: context.tenantId,
      tool_code: 'grafana',
      environment: 'local',
      deployment_mode: 'external_provided',
      local_dev_mode: 'external_provided',
      endpoint_url: 'https://grafana.example.test',
      enabled: false,
      readiness_state: 'configured',
      sso_readiness_state: 'ready',
      health_status: 'healthy',
      last_checked_at: null,
      updated_at: new Date('2026-05-28T00:00:00.000Z'),
      version: 1,
    };
    const { service, prisma } = buildService({
      connections: [connection],
      sso: [{ tool_code: 'grafana', status: 'ready', fail_closed: true }],
    });

    await expect(service.getDeepLink('grafana_console', { environment: 'local' }, context)).resolves.toEqual(
      expect.objectContaining({
        state: 'disabled',
        url: null,
      })
    );
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('platform_tool_audit_event'),
      context.tenantId,
      connection.id,
      'grafana',
      'observability.deep_link.denied',
      context.actorId,
      expect.stringContaining('"state":"disabled"'),
      null,
      null,
      null
    );

    connection.enabled = true;
    connection.endpoint_url = 'http://127.0.0.1:3000';

    await expect(service.getDeepLink('grafana_console', { environment: 'local' }, context)).resolves.toEqual(
      expect.objectContaining({
        state: 'unsafe_url',
        url: null,
      })
    );
  });

  it('fails closed when the actor is missing or no longer active', async () => {
    const { service, prisma } = buildService();

    await expect(service.listDefinitions({ ...context, actorId: undefined })).rejects.toThrow(
      'Observability adapter requests require an active AC operator'
    );

    prisma.$queryRawUnsafe.mockImplementationOnce(async (query: string) => {
      if (query.includes('.system_user')) {
        return [];
      }

      return [];
    });

    await expect(service.listDefinitions(context)).rejects.toThrow('Account is disabled');
  });

  it('fails closed when deep-link audit cannot be written', async () => {
    const connection = {
      id: 'connection-grafana',
      tenant_id: context.tenantId,
      tool_code: 'grafana',
      environment: 'local',
      deployment_mode: 'external_provided',
      local_dev_mode: 'external_provided',
      endpoint_url: 'http://127.0.0.1:3000',
      enabled: true,
      readiness_state: 'configured',
      sso_readiness_state: 'ready',
      health_status: 'healthy',
      last_checked_at: null,
      updated_at: new Date('2026-05-28T00:00:00.000Z'),
      version: 1,
    };
    const { service, prisma } = buildService({
      connections: [connection],
      sso: [{ tool_code: 'grafana', status: 'ready', fail_closed: true }],
    });
    prisma.$executeRawUnsafe.mockRejectedValueOnce(new Error('audit unavailable'));

    await expect(service.getDeepLink('grafana_console', { environment: 'local' }, context)).resolves.toEqual(
      expect.objectContaining({
        state: 'audit_failed',
        url: null,
      })
    );
  });
});
