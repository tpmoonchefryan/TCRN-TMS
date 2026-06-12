import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listPlatformToolConnections,
  type PlatformToolConnectionBundle,
  readPlatformToolConnection,
} from '@/domains/platform-tool-connections/api/platform-tool-connections.api';
import { PlatformToolConnectionsScreen } from '@/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen';

const mockRequest = vi.fn();
const localeState = {
  locale: 'en' as SupportedUiLocale,
  copy: null,
  setLocale: vi.fn(),
  availableLocales: [...SUPPORTED_UI_LOCALES],
};

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => localeState,
}));

vi.mock('@/domains/event-backbone/api/event-backbone.api', () => ({
  readEventBackboneSummary: vi.fn(),
}));

vi.mock('@/domains/platform-tool-connections/api/platform-tool-connections.api', () => ({
  listPlatformToolConnections: vi.fn(),
  readPlatformToolConnection: vi.fn(),
  readPlatformToolDeepLink: vi.fn(),
  runPlatformToolHealthCheck: vi.fn(),
  savePlatformToolConnection: vi.fn(),
}));

function buildToolBundle({
  code,
  label,
  readinessState,
  healthStatus,
  ssoStatus,
  enabled,
  localDevMode = 'disabled',
  deepLink = true,
}: {
  code: string;
  label: string;
  readinessState: string;
  healthStatus: string;
  ssoStatus: 'blocked' | 'ready' | 'not_applicable';
  enabled: boolean;
  localDevMode?: 'disabled' | 'stubbed' | 'compose_opt_in' | 'external_provided';
  deepLink?: boolean;
}): PlatformToolConnectionBundle {
  return {
    definition: {
      code,
      family: 'observability_console',
      displayKey: code.toLowerCase(),
      label,
      localizedLabel: { en: label, zh_HANS: label },
      defaultState: 'not_configured',
      ownerPhase: 'readiness',
      humanUi: true,
      deepLink,
      allowedLocalDevModes: ['disabled', 'stubbed'],
      ssoRequirement: ssoStatus === 'not_applicable' ? 'not_applicable' : 'required',
      licensePosture: 'optional',
      defaultConnection: 'none',
      sortOrder: 1,
      sourceOfTruthBoundary: 'summary_only',
    },
    connection: {
      id: enabled ? `${code.toLowerCase()}-connection` : null,
      toolCode: code,
      environment: 'local',
      deploymentMode: localDevMode,
      localDevMode,
      endpointUrl: null,
      internalServiceUrl: null,
      namespace: null,
      serviceName: null,
      enabled,
      readinessState,
      ssoReadinessState: ssoStatus,
      healthStatus,
      lastCheckedAt: null,
      configVersion: 1,
      version: 1,
    },
    configValues: [],
    ssoReadiness: {
      status: ssoStatus,
      failClosed: ssoStatus === 'blocked',
      evidence: {},
    },
    healthSnapshots: [],
    auditTrail: [],
  };
}

describe('PlatformToolConnectionsScreen', () => {
  beforeEach(() => {
    localeState.locale = 'en';
    mockRequest.mockReset();
    vi.mocked(listPlatformToolConnections).mockReset();
    vi.mocked(readPlatformToolConnection).mockReset();
  });

  it('explains platform-tool readiness and blocked actions without implying live readiness', async () => {
    const grafana = buildToolBundle({
      code: 'GRAFANA',
      label: 'Grafana',
      readinessState: 'not_configured',
      healthStatus: 'unknown',
      ssoStatus: 'blocked',
      enabled: false,
    });
    const stubbed = buildToolBundle({
      code: 'FLAGS',
      label: 'Flagsmith local stub',
      readinessState: 'configured',
      healthStatus: 'unknown',
      ssoStatus: 'not_applicable',
      enabled: true,
      localDevMode: 'stubbed',
      deepLink: false,
    });
    const ready = buildToolBundle({
      code: 'KEYCLOAK',
      label: 'Keycloak',
      readinessState: 'ready',
      healthStatus: 'healthy',
      ssoStatus: 'ready',
      enabled: true,
    });

    vi.mocked(listPlatformToolConnections).mockResolvedValue([grafana, stubbed, ready]);
    vi.mocked(readPlatformToolConnection).mockImplementation(async (_request, code) => {
      return [grafana, stubbed, ready].find((item) => item.definition.code === code) ?? grafana;
    });

    render(<PlatformToolConnectionsScreen tenantId="ac-tenant" />);

    expect(await screen.findAllByText('Grafana')).not.toHaveLength(0);
    expect(
      screen.getAllByText('Not configured: no enabled connection metadata exists for this AC environment.')
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText('Health unknown: no successful health proof has been recorded.')
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText(
        'SSO blocked: human-console access remains fail-closed until real SSO readiness is proven.'
      )
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText(
        'Open is disabled until the connection is enabled and a backend-approved deep link is available.'
      )
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText(
        'Local-dev stub only: useful for AC readiness proof, not production tool availability.'
      )
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText('Ready only reflects backend readiness metadata for this connection.')
    ).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Link unavailable: Grafana' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Link unavailable: Flagsmith local stub' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Open: Keycloak' })[0]).toBeEnabled();

    await waitFor(() => {
      expect(listPlatformToolConnections).toHaveBeenCalledWith(mockRequest, {
        environment: 'local',
        family: 'all',
      });
    });
  });
});
