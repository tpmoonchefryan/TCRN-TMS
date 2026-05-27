// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import { PlatformToolsService } from './platform-tools.service';

function buildService() {
  return new PlatformToolsService({
    getPrisma: () => ({}),
  } as never);
}

function buildDefinition(overrides: Record<string, unknown> = {}) {
  return {
    code: 'grafana',
    family: 'observability_console',
    displayKey: 'platformTools.grafana',
    label: 'Grafana',
    localizedLabel: {},
    defaultState: 'selected_candidate_disabled',
    ownerPhase: 'Phase 5',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'compose_opt_in', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'pending',
    defaultConnection: 'none',
    sortOrder: 20,
    sourceOfTruthBoundary:
      'TCRN owns platform tool connection metadata; the external tool never owns product authority.',
    ...overrides,
  } as never;
}

function buildConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    tenant_id: '00000000-0000-0000-0000-0000000000ac',
    tool_code: 'grafana',
    environment: 'local',
    deployment_mode: 'stubbed',
    local_dev_mode: 'stubbed',
    endpoint_url: 'https://example.com/tcrn-platform-tool-grafana',
    internal_service_url: null,
    namespace: null,
    service_name: null,
    enabled: true,
    readiness_state: 'configured',
    sso_readiness_state: 'ready',
    health_status: 'healthy',
    last_checked_at: new Date('2026-05-28T00:00:00.000Z'),
    config_version: 1,
    created_at: new Date('2026-05-28T00:00:00.000Z'),
    updated_at: new Date('2026-05-28T00:00:00.000Z'),
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  } as never;
}

describe('PlatformToolsService', () => {
  it('redacts secret config values and secret references on readback', () => {
    const service = buildService();
    const result = service['serializeConnection']({
      definition: buildDefinition(),
      connection: buildConnection(),
      configs: [
        {
          config_key: 'client_secret',
          config_value: { plaintext: 'never-return-this' },
          is_secret: true,
          secret_ref: 'env:PLATFORM_TOOL_GRAFANA_CLIENT_SECRET',
          secret_status: 'external_reference',
          updated_at: new Date('2026-05-28T00:00:00.000Z'),
          updated_by: null,
        },
      ],
      healthSnapshots: [],
      ssoReadiness: {
        tool_code: 'grafana',
        status: 'ready',
        fail_closed: true,
        evidence: {},
      },
      auditEvents: [],
      environment: 'local',
    });

    expect(result.configValues).toEqual([
      expect.objectContaining({
        configKey: 'client_secret',
        value: '[redacted]',
        secretRef: '[redacted]',
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('never-return-this');
    expect(JSON.stringify(result)).not.toContain('PLATFORM_TOOL_GRAFANA_CLIENT_SECRET');
  });

  it.each([
    ['missing connection', null, { status: 'ready' }, 'not_configured'],
    [
      'disabled connection',
      buildConnection({ enabled: false }),
      { status: 'ready' },
      'disabled',
    ],
    [
      'missing endpoint',
      buildConnection({ endpoint_url: null }),
      { status: 'ready' },
      'not_configured',
    ],
    [
      'unsafe endpoint',
      buildConnection({ endpoint_url: 'http://127.0.0.1:3000' }),
      { status: 'ready' },
      'unsafe_url',
    ],
    [
      'blocked SSO',
      buildConnection({ sso_readiness_state: 'blocked' }),
      { status: 'blocked' },
      'sso_required',
    ],
    [
      'unhealthy connection',
      buildConnection({ health_status: 'unhealthy' }),
      { status: 'ready' },
      'unhealthy',
    ],
  ])('fails closed for deep link state: %s', async (_case, connection, sso, expected) => {
    const service = buildService();

    await expect(
      service['getDeepLinkDenialReason'](buildDefinition(), connection, {
        tool_code: 'grafana',
        fail_closed: true,
        evidence: {},
        ...sso,
      } as never)
    ).resolves.toBe(expected);
  });

  it('allows a deep link only after AC-safe connection, SSO, URL, and health gates pass', async () => {
    const service = buildService();

    await expect(
      service['getDeepLinkDenialReason'](buildDefinition(), buildConnection(), {
        tool_code: 'grafana',
        status: 'ready',
        fail_closed: true,
        evidence: {},
      })
    ).resolves.toBeNull();
  });
});
