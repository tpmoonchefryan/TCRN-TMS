import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupportedUiLocale } from '@tcrn/shared';

import { RuntimeFlagsScreen } from './RuntimeFlagsScreen';

const mockRequest = vi.fn();
const push = vi.fn();
const localeState = {
  locale: 'en' as SupportedUiLocale,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => localeState,
}));

const summary = {
  checkedAt: '2026-05-28T00:00:00.000Z',
  environment: 'local',
  summary: {
    registeredFlagCount: 2,
    activeKillSwitchCount: 0,
    providerMode: 'disabled',
    providerHealth: 'disabled',
    lastEvaluationFallback: 'tcrn_registry_default',
    lastAuditEvent: null,
  },
  adapters: [
    {
      definition: {
        code: 'flagsmith_provider',
      },
      profile: {
        readinessState: 'disabled',
        ssoState: 'blocked',
        endpointConfigured: false,
      },
    },
  ],
  definitions: [
    {
      code: 'runtime_flags.safe_degraded_mode_probe',
      label: 'Safe Degraded Mode Probe',
      localizedLabel: {
        en: 'Safe Degraded Mode Probe',
        zh_HANS: '安全降级模式探针',
        zh_HANT: '安全降級模式探針',
        ja: '安全な縮退モードプローブ',
        ko: '안전한 저하 모드 프로브',
        fr: 'Sonde de mode degrade sur',
      },
      category: 'degraded_mode',
      status: 'registered',
      ownerModule: 'platform_control_plane',
      defaultValue: false,
      failBehavior: 'fail_to_default',
      providerMapping: {
        adapterCode: 'openfeature_bridge',
        providerKey: 'runtime_flags.safe_degraded_mode_probe',
      },
      updatedAt: '2026-05-28T00:00:00.000Z',
    },
  ],
  activeKillSwitches: [],
  policy: {
    productAuthority:
      'TCRN Module/Capability Registry, RBAC, tenant settings, and product services remain the authority before runtime flag evaluation.',
  },
};

describe('RuntimeFlagsScreen', () => {
  beforeEach(() => {
    localeState.locale = 'en';
    mockRequest.mockReset();
    push.mockReset();
  });

  it('renders AC runtime flag controls and opens the provider setup family', async () => {
    mockRequest.mockResolvedValue(summary);

    render(<RuntimeFlagsScreen tenantId="tenant-ac" />);

    expect(await screen.findByRole('heading', { name: 'Runtime Flags' })).toBeInTheDocument();
    expect(screen.getAllByText('runtime_flags.safe_degraded_mode_probe').length).toBeGreaterThan(0);
    expect(screen.getByText('Provider readiness')).toBeInTheDocument();
    expect(screen.getByText('No active kill switches')).toBeInTheDocument();
    expect(screen.getByText(/Module\/Capability Registry/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open provider setup' }));
    expect(push).toHaveBeenCalledWith('/ac/tenant-ac/platform-tools?family=runtime_flags');
  });

  it('runs a safe evaluation preview with AC-only context', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/runtime-flags/summary?environment=local') {
        return summary;
      }

      if (path === '/api/v1/runtime-flags/evaluate') {
        return {
          flagCode: 'runtime_flags.safe_degraded_mode_probe',
          value: false,
          variant: 'default',
          reason: 'TCRN_REGISTRY_DEFAULT',
          source: 'openfeature_bridge',
          defaulted: true,
          fallback: true,
          providerStatus: 'disabled',
          correlationId: 'p6-runtime_flags.safe_degraded_mode_probe',
          context: {
            environment: 'local',
            service: 'web',
            actorClass: 'ac_operator',
            resolvedCapabilityCodes: ['platform.ac_management'],
          },
          blockedContextKeys: [],
          entitlementAuthority: 'tcrn_resolved_before_runtime_flag',
          killSwitch: null,
        };
      }

      throw new Error(`Unhandled request ${path}`);
    });

    render(<RuntimeFlagsScreen tenantId="tenant-ac" />);

    const previewButtons = await screen.findAllByRole('button', {
      name: /Preview: runtime_flags.safe_degraded_mode_probe/,
    });
    fireEvent.click(previewButtons[0]);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/runtime-flags/evaluate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"actorClass":"ac_operator"'),
        })
      );
    });
    const previewPayload = JSON.parse(
      String(
        mockRequest.mock.calls.find((call) => call[0] === '/api/v1/runtime-flags/evaluate')?.[1]
          ?.body ?? '{}'
      )
    );
    expect(previewPayload.context).not.toHaveProperty('tenantId');
    expect(previewPayload.context).not.toHaveProperty('resolvedCapabilityCodes');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('TCRN_REGISTRY_DEFAULT')).toBeInTheDocument();
  });

  it('requires all confirmation fields before submitting a kill switch', async () => {
    mockRequest.mockResolvedValue(summary);

    render(<RuntimeFlagsScreen tenantId="tenant-ac" />);

    const activateButtons = await screen.findAllByRole('button', {
      name: /Activate kill switch: runtime_flags.safe_degraded_mode_probe/,
    });
    fireEvent.click(activateButtons[0]);

    const submit = await screen.findByRole('button', { name: 'Activate kill switch' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Emergency test' },
    });
    fireEvent.change(screen.getByLabelText('Affected behavior'), {
      target: { value: 'Disable probe' },
    });
    fireEvent.change(screen.getByLabelText('Rollback instruction'), {
      target: { value: 'Deactivate after test' },
    });
    fireEvent.click(screen.getByLabelText('I confirm this is an emergency runtime control.'));

    expect(submit).toBeEnabled();
  });
});
