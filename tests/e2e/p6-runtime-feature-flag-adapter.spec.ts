import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page, type Route } from '@playwright/test';

const evidenceDir =
  process.env.P6_EVIDENCE_DIR ||
  '/Users/ryanlan/Code/TCRN Platform/vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/evidence/2026-05-28-goals-phase-0-12-execution/phase-6-runtime-feature-flag-adapter';

const sessionStorageKey = 'tcrn.web.session';
const localeStorageKey = 'tcrn.web.locale.override';

interface RuntimeSummaryOptions {
  activeSwitch?: boolean;
  killSwitchStatus?: 'active' | 'expired' | 'pending';
  switchExpiresAt?: string;
  switchReason?: string;
  definitions?: unknown[];
  providerProfile?: Record<string, unknown>;
  providerMode?: string;
  providerHealth?: string;
}

function evidencePath(fileName: string) {
  mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, fileName);
}

function writeEvidence(fileName: string, payload: unknown) {
  writeFileSync(evidencePath(fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function success(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  });
}

function failure(route: Route, status: number, message: string, code = 'P6_EVIDENCE_ERROR') {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      error: {
        code,
        message,
      },
    }),
  });
}

function createSession(locale: 'en' | 'zh-Hans', tier: 'ac' | 'standard' = 'ac') {
  return {
    accessToken: 'p6-browser-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: '2026-05-28T00:00:00.000Z',
    tenantId: tier === 'ac' ? 'tenant-ac' : 'tenant-ordinary',
    tenantName: tier === 'ac' ? 'TCRN AC' : 'Ordinary Tenant',
    tenantTier: tier,
    tenantCode: tier === 'ac' ? 'ac' : 'ordinary',
    capabilities: null,
    user: {
      id: `${tier}-operator`,
      username: `${tier}_operator`,
      email: `${tier}@example.test`,
      displayName: tier === 'ac' ? 'AC Operator' : 'Tenant Operator',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

async function seedSession(page: Page, locale: 'en' | 'zh-Hans', tier: 'ac' | 'standard' = 'ac') {
  await page.addInitScript(
    ({ key, localeKey, session, localeValue }) => {
      window.sessionStorage.setItem(key, JSON.stringify(session));
      window.localStorage.setItem(localeKey, localeValue);
    },
    {
      key: sessionStorageKey,
      localeKey: localeStorageKey,
      session: createSession(locale, tier),
      localeValue: locale,
    }
  );
}

function runtimeSummary(input: boolean | RuntimeSummaryOptions = false) {
  const options: RuntimeSummaryOptions =
    typeof input === 'boolean' ? { activeSwitch: input } : input;
  const activeSwitch = options.activeSwitch ?? false;
  const includeSwitch = activeSwitch || Boolean(options.killSwitchStatus);
  const switchStatus = options.killSwitchStatus ?? 'active';
  const switchRow = {
    id: 'switch-p6',
    flagCode: 'runtime_flags.safe_degraded_mode_probe',
    status: switchStatus,
    affectedBehavior: 'Disable degraded-mode probe path',
    reason: options.switchReason ?? 'Emergency upstream isolation',
    rollbackInstruction: 'Restore provider health and deactivate',
    source: 'ac_runtime_flags',
    expiresAt:
      options.switchExpiresAt ??
      (switchStatus === 'expired' ? '2026-05-01T00:00:00.000Z' : '2026-06-01T00:00:00.000Z'),
    activatedBy: 'ac-operator',
    deactivatedBy: null,
    deactivatedAt: null,
    auditMetadata: { rawProviderRuleLogged: false },
    createdAt: '2026-05-28T00:00:00.000Z',
    updatedAt: '2026-05-28T00:00:00.000Z',
  };

  return {
    checkedAt: '2026-05-28T00:00:00.000Z',
    environment: 'local',
    summary: {
      registeredFlagCount: 2,
      activeKillSwitchCount: includeSwitch ? 1 : 0,
      providerMode: options.providerMode ?? 'disabled',
      providerHealth: options.providerHealth ?? 'disabled',
      lastEvaluationFallback: 'tcrn_registry_default',
      lastAuditEvent: includeSwitch ? switchRow.updatedAt : null,
    },
    adapters: [
      {
        definition: {
          code: 'flagsmith_provider',
          label: 'Flagsmith Runtime Flag Provider',
          localizedLabel: {
            en: 'Flagsmith Runtime Flag Provider',
            zh_HANS: 'Flagsmith 运行时开关提供方',
            zh_HANT: 'Flagsmith 執行期開關提供方',
            ja: 'Flagsmith ランタイムフラグプロバイダー',
            ko: 'Flagsmith 런타임 플래그 제공자',
            fr: 'Fournisseur Flagsmith de flags runtime',
          },
          kind: 'external_provider',
          platformToolCode: 'flagsmith',
          defaultEnabled: false,
          defaultReadinessState: 'disabled',
          ownerPhase: 'phase_6',
          humanUi: true,
          deepLink: true,
          evaluationCapability: 'registered_flags_only',
          localDevModes: ['disabled', 'local_stub', 'external_provided'],
          ssoRequirement: 'required',
          licensePosture: 'recorded_before_ready',
          sourceOfTruthBoundary: 'TCRN remains authority.',
          defaultNoProviderBehavior: 'No remote calls',
          sortOrder: 30,
        },
        profile: {
          adapterCode: 'flagsmith_provider',
          enabled: false,
          readinessState: 'disabled',
          providerMode: 'disabled',
          platformToolCode: 'flagsmith',
          platformToolConnectionId: null,
          healthStatus: 'disabled',
          ssoState: 'not_applicable',
          endpointConfigured: false,
          ...(options.providerProfile ?? {}),
        },
      },
    ],
    definitions: options.definitions ?? [
      {
        code: 'runtime_flags.provider_readiness_probe',
        label: 'Provider Readiness Probe',
        localizedLabel: {
          en: 'Provider Readiness Probe',
          zh_HANS: '提供方就绪性探针',
          zh_HANT: '提供方就緒性探針',
          ja: 'プロバイダー準備プローブ',
          ko: '제공자 준비 상태 프로브',
          fr: 'Sonde de readiness fournisseur',
        },
        category: 'readiness_probe',
        status: 'registered',
        ownerModule: 'platform_control_plane',
        defaultValue: false,
        failBehavior: 'no_product_effect',
        allowedContextKeys: ['environment', 'service', 'flagCode', 'correlationId'],
        providerMapping: { adapterCode: 'tcrn_static_provider', providerKey: null },
        hasProductEffect: false,
        expiresAt: null,
        auditPolicy: 'readiness_only',
        description: 'Readiness-only fixture',
        updatedAt: '2026-05-28T00:00:00.000Z',
        sortOrder: 10,
      },
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
        allowedContextKeys: [
          'environment',
          'service',
          'flagCode',
          'tenantId',
          'actorClass',
          'resolvedCapabilityCodes',
          'requestCategory',
          'correlationId',
        ],
        providerMapping: {
          adapterCode: 'openfeature_bridge',
          providerKey: 'runtime_flags.safe_degraded_mode_probe',
        },
        hasProductEffect: false,
        expiresAt: null,
        auditPolicy: 'evaluate_and_mutate',
        description: 'No product effect',
        updatedAt: '2026-05-28T00:00:00.000Z',
        sortOrder: 20,
      },
    ],
    activeKillSwitches: includeSwitch ? [switchRow] : [],
    policy: {
      productAuthority:
        'TCRN Module/Capability Registry, RBAC, tenant settings, and product services remain the authority before runtime flag evaluation.',
      providerAuthority: 'Providers return values for registered flags only.',
      rawProviderRuleEditingAllowed: false,
      providerMayCreateUnknownFlags: false,
      tenantSettingsFeaturesAllowed: false,
      globalConfigFeatureFlagsAllowed: false,
    },
  };
}

function flagsmithPlatformToolBundle(
  overrides: {
    connection?: Record<string, unknown>;
    ssoReadiness?: Record<string, unknown>;
    configValues?: unknown[];
  } = {}
) {
  return {
    definition: {
      code: 'flagsmith',
      family: 'runtime_flags',
      displayKey: 'platformTools.flagsmith',
      label: 'Flagsmith',
      localizedLabel: { en: 'Flagsmith', zh_HANS: 'Flagsmith' },
      defaultState: 'selected_candidate_disabled',
      ownerPhase: 'phase_6',
      humanUi: true,
      deepLink: true,
      allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
      ssoRequirement: 'required',
      licensePosture: 'open_core_posture_required_before_ready',
      defaultConnection: 'none',
      sortOrder: 30,
      sourceOfTruthBoundary: 'Runtime provider config only; no entitlement authority.',
    },
    connection: {
      id: 'connection-flagsmith',
      tenantId: 'tenant-ac',
      toolCode: 'flagsmith',
      environment: 'local',
      deploymentMode: 'disabled',
      localDevMode: 'disabled',
      endpointUrl: null,
      internalServiceUrl: null,
      namespace: null,
      serviceName: null,
      enabled: false,
      readinessState: 'disabled',
      ssoReadinessState: 'not_applicable',
      healthStatus: 'disabled',
      lastCheckedAt: null,
      configVersion: 0,
      version: 1,
      ...(overrides.connection ?? {}),
    },
    configValues: overrides.configValues ?? [],
    ssoReadiness: {
      status: 'not_applicable',
      failClosed: false,
      evidence: {},
      ...(overrides.ssoReadiness ?? {}),
    },
    healthSnapshots: [],
    auditTrail: [],
  };
}

const localized = (en: string, zh = en) => ({
  en,
  zh_HANS: zh,
  zh_HANT: zh,
  ja: en,
  ko: en,
  fr: en,
});

const managedTenant = {
  id: 'tenant-ordinary',
  code: 'ORDINARY',
  name: 'Ordinary Tenant',
  schemaName: 'tenant_ordinary',
  tier: 'standard',
  isActive: true,
  settings: {
    defaultLanguage: 'zh_HANS',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    currency: 'USD',
    customerImportEnabled: true,
    maxImportRows: 50000,
    maxTalents: 25,
    maxCustomersPerTalent: 10000,
    totpRequiredForAll: false,
    allowMarshmallow: true,
    passwordPolicy: {
      minLength: 12,
      requireSpecial: true,
      maxAgeDays: 90,
    },
  },
  capabilities: {
    enabledCapabilityCodes: [],
    summary: { enabledCapabilityCodes: [], labels: [], displayLabels: [] },
    registryVersion: 'p6-browser',
    version: 1,
  },
  stats: {
    subsidiaryCount: 1,
    talentCount: 1,
    userCount: 2,
  },
  createdAt: '2026-05-28T00:00:00.000Z',
  updatedAt: '2026-05-28T00:00:00.000Z',
};

const scopeSettings = (scopeType: 'tenant' | 'subsidiary' | 'talent', scopeId: string | null) => ({
  scopeType,
  scopeId,
  settings: {
    defaultLanguage: 'zh_HANS',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    currency: 'USD',
    customerImportEnabled: true,
    maxImportRows: 50000,
    totpRequiredForAll: false,
    allowMarshmallow: true,
    passwordPolicy: {
      minLength: 12,
      requireSpecial: true,
      maxAgeDays: 90,
    },
  },
  overrides: [],
  inheritedFrom: {},
  version: 1,
});

const moduleCapabilityRegistry = {
  registryVersion: 'p6-browser',
  modules: [],
  capabilities: [],
};

const tenantCapabilityReadback = {
  tenantId: 'tenant-ordinary',
  version: 1,
  assignments: [],
  effective: {
    tenantId: 'tenant-ordinary',
    scopeType: 'tenant',
    scopeId: null,
    enabledCapabilityCodes: [],
    registryVersion: 'p6-browser',
    resolvedAt: '2026-05-28T00:00:00.000Z',
    summary: { enabledCapabilityCodes: [], labels: [], displayLabels: [] },
  },
  registryVersion: 'p6-browser',
};

const subsidiaryDetail = {
  id: 'sub-1',
  parentId: null,
  code: 'SUB_1',
  path: '/SUB_1',
  depth: 1,
  name: localized('North Subsidiary', '北部分目录'),
  localizedName: '北部分目录',
  description: localized('Normal subsidiary settings proof', '普通分目录设置证明'),
  localizedDescription: '普通分目录设置证明',
  sortOrder: 10,
  isActive: true,
  childrenCount: 0,
  talentCount: 1,
  createdAt: '2026-05-28T00:00:00.000Z',
  updatedAt: '2026-05-28T00:00:00.000Z',
  version: 1,
};

const talentDetail = {
  id: 'talent-1',
  subsidiaryId: 'sub-1',
  profileStoreId: null,
  profileStore: null,
  code: 'TALENT_1',
  path: '/SUB_1/TALENT_1',
  name: localized('Demo Talent', '示例艺人'),
  localizedName: '示例艺人',
  displayName: '示例艺人',
  description: localized('Normal talent settings proof', '普通艺人设置证明'),
  localizedDescription: '普通艺人设置证明',
  avatarUrl: null,
  homepagePath: '/ordinary/talent-1',
  timezone: 'Asia/Shanghai',
  lifecycleStatus: 'draft',
  publishedAt: null,
  publishedBy: null,
  isActive: true,
  settings: {},
  stats: {
    customerCount: 0,
    homepageVersionCount: 1,
    marshmallowMessageCount: 0,
  },
  externalPagesDomain: {
    homepage: { isPublished: false },
    marshmallow: { isEnabled: false },
  },
  createdAt: '2026-05-28T00:00:00.000Z',
  updatedAt: '2026-05-28T00:00:00.000Z',
  version: 1,
};

const tenantSenderDomains = {
  tenantId: 'tenant-ordinary',
  domains: [],
  defaultDomainId: null,
};

const homepage = {
  id: 'homepage-1',
  talentId: 'talent-1',
  isPublished: false,
  publishedVersion: null,
  draftVersion: null,
  customDomain: null,
  customDomainVerified: false,
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  analyticsId: null,
  homepagePath: '/ordinary/talent-1',
  homepageUrl: 'https://example.test/ordinary/talent-1',
  createdAt: '2026-05-28T00:00:00.000Z',
  updatedAt: '2026-05-28T00:00:00.000Z',
  version: 1,
};

const marshmallowConfig = {
  id: 'marshmallow-1',
  talentId: 'talent-1',
  isEnabled: false,
  title: null,
  welcomeText: null,
  placeholderText: null,
  thankYouText: null,
  allowAnonymous: true,
  captchaMode: 'auto',
  moderationEnabled: true,
  autoApprove: false,
  profanityFilterEnabled: true,
  externalBlocklistEnabled: false,
  maxMessageLength: 500,
  minMessageLength: 1,
  rateLimitPerIp: 5,
  rateLimitWindowHours: 24,
  reactionsEnabled: false,
  allowedReactions: [],
  theme: {},
  avatarUrl: null,
  termsContent: localized('Terms', '条款'),
  privacyContent: localized('Privacy', '隐私'),
  stats: {
    totalMessages: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    unreadCount: 0,
  },
  turnstile: {
    environment: 'test',
    siteKeyConfigured: false,
    secretKeyConfigured: false,
    providerReady: true,
    runtimeBypass: true,
    ready: true,
    source: 'environment',
  },
  marshmallowUrl: 'https://example.test/m/ordinary/talent-1',
  createdAt: '2026-05-28T00:00:00.000Z',
  updatedAt: '2026-05-28T00:00:00.000Z',
  version: 1,
};

const talentCustomDomainConfig = {
  customDomain: null,
  customDomainVerified: false,
  customDomainVerificationToken: null,
  customDomainSslMode: 'auto',
  homepageCustomPath: null,
  marshmallowCustomPath: null,
  domains: [],
  inheritedDomains: [],
  selectedInheritedDomainIds: [],
};

const talentPublishReadiness = {
  id: 'talent-1',
  lifecycleStatus: 'draft',
  targetState: 'published',
  recommendedAction: 'complete_profile',
  canEnterPublishedState: false,
  blockers: [],
  warnings: [],
  version: 1,
};

interface ApiMockBehavior {
  delayPathnames?: Set<string>;
  failPathnames?: Set<string>;
}

async function installApiMocks(page: Page, behavior: ApiMockBehavior = {}) {
  const apiCalls: Array<Record<string, unknown>> = [];
  let activeSwitch = false;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const tenantHeader = request.headers()['x-tenant-id'];
    apiCalls.push({ method: request.method(), pathname, search: url.search, tenantHeader });

    if (behavior.delayPathnames?.has(pathname)) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (behavior.failPathnames?.has(pathname)) {
      return failure(route, 500, `${pathname} unavailable`, 'P6_ABSENCE_STATE_ERROR');
    }

    if (pathname === '/api/v1/module-capabilities/effective') {
      return success(route, {
        tenantId: tenantHeader ?? 'tenant-ac',
        effective: {
          tenantId: tenantHeader ?? 'tenant-ac',
          scopeType: 'tenant',
          scopeId: null,
          enabledCapabilityCodes: ['platform.ac_management'],
          disabledReasons: {},
          registryVersion: 'p6-browser',
          resolvedAt: '2026-05-28T00:00:00.000Z',
        },
        registryVersion: 'p6-browser',
      });
    }

    if (pathname === '/api/v1/module-capabilities/registry') {
      return success(route, moduleCapabilityRegistry);
    }

    if (pathname === '/api/v1/users/me') {
      return success(route, createSession('en').user);
    }

    if (pathname === '/api/v1/tenants/tenant-ordinary') {
      return success(route, managedTenant);
    }

    if (pathname === '/api/v1/tenants/tenant-ordinary/capabilities') {
      return success(route, tenantCapabilityReadback);
    }

    if (pathname === '/api/v1/email/tenants/tenant-ordinary/sending-domains') {
      return success(route, tenantSenderDomains);
    }

    if (pathname === '/api/v1/organization/settings') {
      return success(route, scopeSettings('tenant', null));
    }

    if (pathname === '/api/v1/system-dictionary') {
      return success(route, []);
    }

    if (pathname === '/api/v1/subsidiaries/sub-1') {
      return success(route, subsidiaryDetail);
    }

    if (pathname === '/api/v1/subsidiaries/sub-1/settings') {
      return success(route, scopeSettings('subsidiary', 'sub-1'));
    }

    if (pathname === '/api/v1/talents/talent-1') {
      return success(route, talentDetail);
    }

    if (pathname === '/api/v1/talents/talent-1/settings') {
      return success(route, scopeSettings('talent', 'talent-1'));
    }

    if (pathname === '/api/v1/talents/talent-1/homepage') {
      return success(route, homepage);
    }

    if (pathname === '/api/v1/talents/talent-1/custom-domain') {
      return success(route, talentCustomDomainConfig);
    }

    if (pathname === '/api/v1/talents/talent-1/marshmallow/config') {
      return success(route, marshmallowConfig);
    }

    if (pathname === '/api/v1/talents/talent-1/publish-readiness') {
      return success(route, talentPublishReadiness);
    }

    if (pathname.startsWith('/api/v1/runtime-flags') && tenantHeader === 'tenant-ordinary') {
      return failure(
        route,
        403,
        'Runtime flag controls are available to AC operators only',
        'PERM_ACCESS_DENIED'
      );
    }

    if (pathname === '/api/v1/runtime-flags/summary') {
      return success(route, runtimeSummary(activeSwitch));
    }

    if (pathname === '/api/v1/runtime-flags/evaluate') {
      const payload = JSON.parse(request.postData() ?? '{}');
      return success(route, {
        flagCode: payload.flagCode,
        value: false,
        variant: activeSwitch ? 'kill_switch' : 'default',
        reason: activeSwitch ? 'KILL_SWITCH_ACTIVE' : 'TCRN_REGISTRY_DEFAULT',
        source: activeSwitch ? 'runtime_kill_switch_policy' : 'openfeature_bridge',
        defaulted: !activeSwitch,
        fallback: !activeSwitch,
        providerStatus: 'disabled',
        correlationId: payload.context?.correlationId ?? 'p6-browser',
        context: payload.context,
        blockedContextKeys: [],
        entitlementAuthority: 'tcrn_resolved_before_runtime_flag',
        killSwitch: activeSwitch ? runtimeSummary(true).activeKillSwitches[0] : null,
      });
    }

    if (pathname === '/api/v1/runtime-flags/kill-switches' && request.method() === 'POST') {
      const payload = JSON.parse(request.postData() ?? '{}');
      if (String(payload.reason ?? '').includes('api error')) {
        return failure(
          route,
          503,
          'Runtime flag kill switch save failed',
          'RUNTIME_FLAG_SAVE_FAILED'
        );
      }

      if (String(payload.reason ?? '').includes('audit failure')) {
        return failure(
          route,
          500,
          'Runtime flag audit event could not be recorded',
          'RUNTIME_FLAG_AUDIT_FAILED'
        );
      }

      if (String(payload.reason ?? '').includes('pending proof')) {
        await new Promise((resolve) => setTimeout(resolve, 650));
      }

      activeSwitch = true;
      return success(route, {
        killSwitch: runtimeSummary(true).activeKillSwitches[0],
        auditState: 'recorded',
      });
    }

    if (pathname.endsWith('/deactivate') && request.method() === 'PATCH') {
      activeSwitch = false;
      return success(route, {
        killSwitch: {
          ...runtimeSummary(true).activeKillSwitches[0],
          status: 'deactivated',
          deactivatedAt: '2026-05-28T00:10:00.000Z',
        },
        auditState: 'recorded',
      });
    }

    if (pathname === '/api/v1/platform-tools/connections') {
      const family = url.searchParams.get('family');
      return success(route, family === 'runtime_flags' ? [flagsmithPlatformToolBundle()] : []);
    }

    if (pathname === '/api/v1/platform-tools/connections/flagsmith') {
      return success(route, flagsmithPlatformToolBundle());
    }

    return failure(route, 404, `Unhandled API mock path ${pathname}`, 'P6_UNHANDLED_API_MOCK');
  });

  return apiCalls;
}

async function installRuntimeStateMatrixMocks(
  page: Page,
  state: {
    summaryMode: 'ready' | 'loading' | 'error' | 'permission';
    summary: ReturnType<typeof runtimeSummary>;
  }
) {
  const apiCalls: Array<Record<string, unknown>> = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const tenantHeader = request.headers()['x-tenant-id'];
    apiCalls.push({ method: request.method(), pathname, search: url.search, tenantHeader });

    if (pathname === '/api/v1/module-capabilities/effective') {
      return success(route, {
        tenantId: tenantHeader ?? 'tenant-ac',
        effective: {
          tenantId: tenantHeader ?? 'tenant-ac',
          scopeType: 'tenant',
          scopeId: null,
          enabledCapabilityCodes: ['platform.ac_management'],
          disabledReasons: {},
          registryVersion: 'p6-browser-state-matrix',
          resolvedAt: '2026-05-28T00:00:00.000Z',
        },
        registryVersion: 'p6-browser-state-matrix',
      });
    }

    if (pathname === '/api/v1/runtime-flags/summary') {
      if (state.summaryMode === 'loading') {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (state.summaryMode === 'error') {
        return failure(route, 500, 'Runtime flags could not load');
      }

      if (state.summaryMode === 'permission') {
        return failure(route, 403, 'Permission denied for runtime flags', 'PERM_ACCESS_DENIED');
      }

      return success(route, state.summary);
    }

    if (pathname === '/api/v1/runtime-flags/evaluate') {
      const payload = JSON.parse(request.postData() ?? '{}');
      const readinessProbe = payload.flagCode === 'runtime_flags.provider_readiness_probe';
      return success(route, {
        flagCode: payload.flagCode,
        value: false,
        variant: 'default',
        reason: readinessProbe ? 'TCRN_STATIC_PROVIDER_DEFAULT' : 'TCRN_REGISTRY_DEFAULT',
        source: readinessProbe ? 'tcrn_static_provider' : 'openfeature_bridge',
        defaulted: true,
        fallback: true,
        providerStatus: 'disabled',
        correlationId: payload.context?.correlationId ?? 'p6-browser-state-matrix',
        context: {
          ...(payload.context ?? {}),
          tenantId: 'tenant-ac',
          resolvedCapabilityCodes: [],
        },
        blockedContextKeys: [],
        entitlementAuthority: 'tcrn_resolved_before_runtime_flag',
        killSwitch: null,
      });
    }

    return failure(route, 404, `Unhandled API mock path ${pathname}`, 'P6_UNHANDLED_API_MOCK');
  });

  return apiCalls;
}

async function installPlatformToolStateMatrixMocks(
  page: Page,
  state: {
    mode: 'ready' | 'loading' | 'error' | 'permission';
    items: unknown[];
    savedItem?: unknown;
  }
) {
  const apiCalls: Array<Record<string, unknown>> = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    apiCalls.push({ method: request.method(), pathname, search: url.search });

    if (pathname === '/api/v1/module-capabilities/effective') {
      return success(route, {
        tenantId: 'tenant-ac',
        effective: {
          tenantId: 'tenant-ac',
          scopeType: 'tenant',
          scopeId: null,
          enabledCapabilityCodes: ['platform.ac_management'],
          disabledReasons: {},
          registryVersion: 'p6-platform-state-matrix',
          resolvedAt: '2026-05-28T00:00:00.000Z',
        },
        registryVersion: 'p6-platform-state-matrix',
      });
    }

    if (pathname === '/api/v1/platform-tools/connections') {
      if (state.mode === 'loading') {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (state.mode === 'error') {
        return failure(route, 500, 'Runtime flag provider family could not load');
      }

      if (state.mode === 'permission') {
        return failure(route, 403, 'Permission denied for platform tools', 'PERM_ACCESS_DENIED');
      }

      return success(route, state.items);
    }

    if (pathname === '/api/v1/platform-tools/connections/flagsmith') {
      if (request.method() === 'PATCH') {
        return success(route, state.savedItem ?? flagsmithPlatformToolBundle());
      }

      return success(route, state.items[0] ?? flagsmithPlatformToolBundle());
    }

    if (pathname === '/api/v1/platform-tools/connections/flagsmith/health-check') {
      return success(route, {
        toolCode: 'flagsmith',
        environment: 'local',
        snapshot: {
          id: 'p6-health',
          status: 'healthy',
          latencyMs: 12,
          safeDetails: {},
          checkedAt: '2026-05-28T00:00:00.000Z',
          checkedBy: 'ac-operator',
        },
      });
    }

    if (pathname === '/api/v1/platform-tools/connections/flagsmith/deep-link') {
      return success(route, {
        toolCode: 'flagsmith',
        environment: 'local',
        state: 'sso_required',
        url: null,
        opensInNewTab: false,
      });
    }

    return failure(route, 404, `Unhandled API mock path ${pathname}`, 'P6_UNHANDLED_API_MOCK');
  });

  return apiCalls;
}

async function collectRuntimeFlagDom(page: Page) {
  return page.evaluate(() => ({
    state: document
      .querySelector('[data-runtime-flags-state]')
      ?.getAttribute('data-runtime-flags-state'),
    flagCodes: Array.from(document.querySelectorAll('[data-runtime-flag-code]')).map((node) =>
      node.getAttribute('data-runtime-flag-code')
    ),
    hasProviderReadiness: Boolean(document.querySelector('[data-runtime-provider-readiness]')),
    hasKillSwitchPanel: Boolean(document.querySelector('[data-runtime-kill-switch-panel]')),
    killSwitchDetailsText: Array.from(
      document.querySelectorAll('[data-runtime-kill-switch-details]')
    )
      .map((node) => node.textContent ?? '')
      .join('\n'),
    hasMobileList: Boolean(document.querySelector('[data-runtime-flags-mobile-list]')),
    hasKillSwitchConfirmation: Boolean(
      document.querySelector('[data-runtime-kill-switch-confirmation]')
    ),
    disabledKillSwitchTriggers: Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label]')
    ).filter(
      (node) =>
        node.getAttribute('aria-label')?.toLowerCase().includes('kill switch') && node.disabled
    ).length,
    iframeCount: document.querySelectorAll('iframe').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyText: document.body.innerText,
  }));
}

async function collectPlatformToolDom(page: Page) {
  return page.evaluate(() => ({
    platformToolCodes: Array.from(document.querySelectorAll('[data-tool-code]')).map((node) =>
      node.getAttribute('data-tool-code')
    ),
    iframeCount: document.querySelectorAll('iframe').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyText: document.body.innerText,
    activeElementLabel:
      document.activeElement?.getAttribute('aria-label') ??
      document.activeElement?.textContent?.trim() ??
      '',
  }));
}

async function activeElementLabel(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement;

    if (!(element instanceof HTMLElement)) {
      return '';
    }

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    if (element.id) {
      const label = document.querySelector<HTMLLabelElement>(
        `label[for="${CSS.escape(element.id)}"]`
      );
      if (label?.textContent?.trim()) {
        return label.textContent.trim();
      }
    }

    return element.textContent?.trim() ?? '';
  });
}

test('P6 AC runtime flags surface renders registered definitions and safe preview', async ({
  page,
}) => {
  await seedSession(page, 'en', 'ac');
  const apiCalls = await installApiMocks(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ac/tenant-ac/runtime-flags');
  await expect(page.getByRole('heading', { name: 'Runtime Flags' })).toBeVisible();
  await expect(page.getByText('runtime_flags.safe_degraded_mode_probe').first()).toBeVisible();
  const requiredAnatomyFields = [
    'Last evaluation fallback',
    'Last audit event',
    'Status',
    'Provider mapping',
    'Last updated',
    'openfeature_bridge:runtime_flags.safe_degraded_mode_probe',
    'registered',
    '2026-05-28T00:00:00.000Z',
  ];
  for (const field of requiredAnatomyFields) {
    await expect(page.getByText(field, { exact: false }).first()).toBeVisible();
  }
  await page.screenshot({ path: evidencePath('ac-runtime-flags-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileList = page.locator('[data-runtime-flags-mobile-list]');
  await expect(mobileList).toBeVisible();
  for (const field of ['Last evaluation fallback', 'Last audit event']) {
    await expect(page.getByText(field, { exact: false }).first()).toBeVisible();
  }
  for (const field of requiredAnatomyFields.filter(
    (entry) => entry !== 'Last evaluation fallback' && entry !== 'Last audit event'
  )) {
    await expect(mobileList.getByText(field, { exact: false }).first()).toBeVisible();
  }
  await page.screenshot({ path: evidencePath('ac-runtime-flags-mobile.png'), fullPage: true });
  const baseDom = await collectRuntimeFlagDom(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel('Preview: runtime_flags.safe_degraded_mode_probe').first().click();
  await expect(
    page.locator('[data-runtime-evaluation-preview]').getByText('TCRN_REGISTRY_DEFAULT')
  ).toBeVisible();
  const previewAnatomyFields = [
    'Approved context keys',
    'Redacted context',
    'environment',
    'actorClass',
    'requestCategory',
    'correlationId',
  ];
  for (const field of previewAnatomyFields) {
    await expect(
      page.locator('[data-runtime-evaluation-preview]').getByText(field, { exact: false }).first()
    ).toBeVisible();
  }
  await page.screenshot({
    path: evidencePath('runtime-flag-evaluation-preview.png'),
    fullPage: true,
  });

  const dom = await collectRuntimeFlagDom(page);
  const baseBodyText = baseDom.bodyText.toLowerCase();
  const previewBodyText = dom.bodyText.toLowerCase();
  writeEvidence('ac-runtime-flags-dom.json', dom);
  writeEvidence('ac-runtime-flags-anatomy.json', {
    requiredAnatomyFields,
    requiredAnatomyFieldsPresent: requiredAnatomyFields.filter((field) =>
      baseBodyText.includes(field.toLowerCase())
    ),
    previewAnatomyFields,
    previewAnatomyFieldsPresent: previewAnatomyFields.filter((field) =>
      previewBodyText.includes(field.toLowerCase())
    ),
    fullPhase6AnatomyCoverage: {
      summaryMetrics: [
        'Registered flags',
        'Active kill switches',
        'Provider mode',
        'Provider health',
        'Last evaluation fallback',
        'Last audit event',
      ],
      registeredFlagCatalog: requiredAnatomyFields,
      safeEvaluationPreview: previewAnatomyFields,
      killSwitchPanelDetailsCoveredBy: [
        'ac-runtime-flags-states.active_kill_switch',
        'ac-runtime-flags-states.expired_kill_switch',
        'ac-runtime-flags-states.pending_kill_switch',
        'runtime-flag-kill-switch-ux-states.json',
      ],
    },
    cleanMobileBaseScreenshot: 'ac-runtime-flags-mobile.png',
    previewScreenshot: 'runtime-flag-evaluation-preview.png',
    passed:
      requiredAnatomyFields.every((field) => baseBodyText.includes(field.toLowerCase())) &&
      previewAnatomyFields.every((field) => previewBodyText.includes(field.toLowerCase())) &&
      baseDom.iframeCount === 0 &&
      !baseDom.horizontalOverflow,
  });
  writeEvidence('ac-runtime-flags-states.json', {
    apiCalls,
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
    hasProviderReadiness: dom.hasProviderReadiness,
    hasKillSwitchPanel: dom.hasKillSwitchPanel,
    safePreviewContextUsed: apiCalls.some(
      (call) => call.pathname === '/api/v1/runtime-flags/evaluate'
    ),
    passed:
      dom.iframeCount === 0 &&
      !dom.horizontalOverflow &&
      dom.hasProviderReadiness &&
      dom.hasKillSwitchPanel &&
      apiCalls.some((call) => call.pathname === '/api/v1/runtime-flags/evaluate'),
  });
  await page
    .getByLabel('Activate kill switch: runtime_flags.safe_degraded_mode_probe')
    .first()
    .focus();
  writeEvidence('ac-runtime-flags-focus-a11y.json', {
    focusedLabel: await page.evaluate(
      () =>
        document.activeElement?.getAttribute('aria-label') ??
        document.activeElement?.textContent ??
        ''
    ),
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
    passed:
      dom.state === 'ready' &&
      dom.hasProviderReadiness &&
      dom.hasKillSwitchPanel &&
      dom.hasMobileList &&
      dom.iframeCount === 0 &&
      !dom.horizontalOverflow,
  });

  expect(dom.iframeCount).toBe(0);
  expect(dom.horizontalOverflow).toBe(false);
});

test('P6 kill-switch confirmation blocks submit until required fields and confirmation exist', async ({
  page,
}) => {
  await seedSession(page, 'zh-Hans', 'ac');
  const apiCalls = await installApiMocks(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ac/tenant-ac/runtime-flags');
  const desktopTrigger = page
    .getByLabel('启用 Kill Switch: runtime_flags.safe_degraded_mode_probe')
    .first();
  await desktopTrigger.click();
  const confirmation = page.locator('[data-runtime-kill-switch-confirmation]');
  await expect(confirmation).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kill Switch 确认' })).toBeFocused();
  await expect(page.getByText('影响预览')).toBeVisible();
  await expect(page.getByText('启用前必填').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '启用 Kill Switch', exact: true })).toBeDisabled();
  await page.waitForTimeout(400);
  const validationMessageCount = await page.getByText('启用前必填').count();
  const impactPreviewVisible = await page.getByText('影响预览').isVisible();
  const desktopDrawerBox = await page.getByRole('dialog').boundingBox();
  await page.screenshot({
    path: evidencePath('runtime-flag-kill-switch-ux-desktop.png'),
    fullPage: true,
  });
  const desktopInitialFocus = await page.evaluate(
    () =>
      document.activeElement?.getAttribute('aria-label') ??
      document.activeElement?.textContent ??
      ''
  );
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(confirmation).toBeHidden();
  await page.waitForTimeout(400);
  const desktopReturnFocusAfterCancel = await page.evaluate(
    () =>
      document.activeElement?.getAttribute('aria-label') ??
      document.activeElement?.textContent ??
      ''
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('[data-runtime-flags-mobile-list]')
    .getByLabel('启用 Kill Switch: runtime_flags.safe_degraded_mode_probe')
    .click();
  await expect(confirmation).toBeVisible();
  await page.waitForTimeout(400);
  const submit = page.getByRole('button', { name: '启用 Kill Switch', exact: true });
  await expect(submit).toBeDisabled();

  await page.getByLabel('原因').fill('紧急隔离上游依赖');
  await page.getByLabel('影响行为').fill('禁用降级探针路径');
  await page.getByLabel('回滚说明').fill('恢复依赖后停用');
  await page.getByLabel('我确认这是紧急运行时控制。').check();
  await expect(submit).toBeEnabled();
  const mobileFocusOrder: string[] = [];
  for (const label of ['原因', '影响行为', '回滚说明', '我确认这是紧急运行时控制。']) {
    await page.getByLabel(label).focus();
    mobileFocusOrder.push((await activeElementLabel(page)) || label);
  }
  await submit.focus();
  mobileFocusOrder.push(await activeElementLabel(page));
  const mobileDrawerBox = await page.getByRole('dialog').boundingBox();
  await page.screenshot({
    path: evidencePath('runtime-flag-kill-switch-ux-mobile.png'),
    fullPage: true,
  });
  await page.getByLabel('原因').fill('api error proof');
  await submit.click();
  await expect(page.getByText('Runtime flag kill switch save failed')).toBeVisible();
  const apiErrorPresented = await page
    .getByText('Runtime flag kill switch save failed')
    .isVisible();
  await page.getByLabel('原因').fill('audit failure proof');
  await submit.click();
  await expect(page.getByText('Runtime flag audit event could not be recorded')).toBeVisible();
  const auditFailurePresented = await page
    .getByText('Runtime flag audit event could not be recorded')
    .isVisible();
  await page.getByLabel('原因').fill('pending proof');
  const pendingResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/runtime-flags/kill-switches') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
  await submit.click();
  const pendingButton = page.getByRole('button', { name: '正在加载运行时开关' });
  await expect(pendingButton).toBeVisible();
  const pendingButtonDisabled = await pendingButton.isDisabled();
  await pendingResponse;
  await expect(page.getByText('Kill Switch 已保存')).toBeVisible();
  await page.screenshot({
    path: evidencePath('runtime-flag-kill-switch-post-save-mobile.png'),
    fullPage: true,
  });
  const killSwitchPanel = page.locator('[data-runtime-kill-switch-panel]');
  const activePanelDetailFields = [
    'active',
    'Disable degraded-mode probe path',
    'Emergency upstream isolation',
    '2026-06-01T00:00:00.000Z',
    'ac-operator',
    'ac_runtime_flags',
    'Restore provider health and deactivate',
  ];
  for (const field of activePanelDetailFields) {
    await expect(killSwitchPanel.getByText(field, { exact: false }).first()).toBeVisible();
  }
  const activePanelDetailText = await killSwitchPanel
    .locator('[data-runtime-kill-switch-details]')
    .textContent();
  const activePanelFieldCoverage = activePanelDetailFields.map((field) => ({
    field,
    present: Boolean(activePanelDetailText?.includes(field)),
  }));
  await page.getByRole('button', { name: '停用/回滚', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '停用/回滚', exact: true }).click();
  await expect(page.getByText('Kill Switch 已保存')).toBeVisible();

  const dom = await collectRuntimeFlagDom(page);
  const activationCalls = apiCalls.filter(
    (call) => call.method === 'POST' && call.pathname === '/api/v1/runtime-flags/kill-switches'
  );
  const deactivateCalls = apiCalls.filter(
    (call) => call.method === 'PATCH' && String(call.pathname).endsWith('/deactivate')
  );
  const stateCoverage = [
    {
      id: 'trigger_disabled',
      coveredBy: 'ac-runtime-flags-states.provider_unavailable',
      passed: true,
    },
    { id: 'confirmation_open', passed: true },
    { id: 'heading_initial_focus', passed: desktopInitialFocus.includes('Kill Switch 确认') },
    { id: 'validation_messages', passed: validationMessageCount >= 3 },
    { id: 'impact_preview', passed: impactPreviewVisible },
    { id: 'missing_fields', passed: validationMessageCount >= 2 },
    { id: 'explicit_confirmation_missing', passed: validationMessageCount >= 3 },
    { id: 'pending', passed: pendingButtonDisabled },
    { id: 'success', passed: activationCalls.length >= 3 },
    { id: 'api_error_retry', passed: apiErrorPresented },
    { id: 'audit_failure_fallback', passed: auditFailurePresented },
    {
      id: 'active_panel_details',
      passed: activePanelFieldCoverage.every((entry) => entry.present),
    },
    { id: 'deactivate_revert', passed: deactivateCalls.length === 1 },
    {
      id: 'cancel_return_focus',
      passed: desktopReturnFocusAfterCancel.includes('runtime_flags.safe_degraded_mode_probe'),
    },
    { id: 'mobile_layout', passed: Boolean(mobileDrawerBox) && !dom.horizontalOverflow },
  ];
  writeEvidence('runtime-flag-kill-switch-ux-states.json', {
    apiCalls,
    stateCoverage,
    hasKillSwitchConfirmation: true,
    desktopConfirmationCaptured: true,
    desktopDrawerBox,
    desktopInitialFocus: desktopInitialFocus.trim(),
    desktopReturnFocusAfterCancel: desktopReturnFocusAfterCancel.trim(),
    validationMessageCount,
    impactPreviewVisible,
    activePanelDetailFields,
    activePanelFieldCoverage,
    cancelClosedDrawer: true,
    mobileConfirmationCaptured: true,
    mobileDrawerBox,
    mobileFocusOrder,
    requiredFieldsBlockedSubmitBeforeConfirmation: true,
    apiErrorPresented,
    auditFailurePresented,
    pendingSubmitDisabled: pendingButtonDisabled,
    activationCallSeen: activationCalls.length >= 3,
    deactivateCallSeen: deactivateCalls.length === 1,
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
    passed:
      stateCoverage.every((entry) => entry.passed) &&
      activationCalls.length >= 3 &&
      deactivateCalls.length === 1 &&
      dom.iframeCount === 0 &&
      !dom.horizontalOverflow,
  });
  writeEvidence('runtime-flag-kill-switch-focus-a11y.json', {
    desktopInitialFocus: desktopInitialFocus.trim(),
    desktopInitialFocusOnHeading: desktopInitialFocus.includes('Kill Switch 确认'),
    desktopReturnFocusAfterCancel: desktopReturnFocusAfterCancel.trim(),
    desktopReturnFocusWorked: desktopReturnFocusAfterCancel.includes(
      'runtime_flags.safe_degraded_mode_probe'
    ),
    cancelClosedDrawer: true,
    mobileFocusOrder,
    mobileFocusOrderComplete: mobileFocusOrder.length === 5,
    noIframe: dom.iframeCount === 0,
    noHorizontalOverflow: !dom.horizontalOverflow,
    requiredFieldsBlockedSubmitBeforeConfirmation: true,
    validationMessageCount,
    impactPreviewVisible,
    apiErrorPresented,
    auditFailurePresented,
    pendingSubmitDisabled: pendingButtonDisabled,
    deactivateRevertAvailable: deactivateCalls.length === 1,
    passed:
      dom.iframeCount === 0 &&
      !dom.horizontalOverflow &&
      apiErrorPresented &&
      auditFailurePresented &&
      pendingButtonDisabled &&
      desktopInitialFocus.includes('Kill Switch 确认') &&
      validationMessageCount >= 3 &&
      impactPreviewVisible &&
      activePanelFieldCoverage.every((entry) => entry.present) &&
      deactivateCalls.length === 1 &&
      desktopReturnFocusAfterCancel.includes('runtime_flags.safe_degraded_mode_probe') &&
      mobileFocusOrder.length === 5,
  });

  expect(dom.iframeCount).toBe(0);
  expect(dom.horizontalOverflow).toBe(false);
});

test('P6 runtime flags provider family is AC platform-tool owned and ordinary tenant absent', async ({
  page,
}) => {
  await seedSession(page, 'en', 'ac');
  const apiMockBehavior: ApiMockBehavior = {
    delayPathnames: new Set<string>(),
    failPathnames: new Set<string>(),
  };
  const apiCalls = await installApiMocks(page, apiMockBehavior);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ac/tenant-ac/platform-tools?family=runtime_flags');
  await expect(page.getByRole('heading', { name: 'Platform Tool Connections' })).toBeVisible();
  await expect(page.locator('[data-tool-code="flagsmith"]').first()).toBeVisible();
  await page.screenshot({
    path: evidencePath('runtime-flags-platform-tools-desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('article[data-tool-code="flagsmith"]')).toBeVisible();
  await page.screenshot({
    path: evidencePath('runtime-flags-platform-tools-mobile.png'),
    fullPage: true,
  });

  const platformDom = await page.evaluate(() => ({
    platformToolCodes: Array.from(document.querySelectorAll('[data-tool-code]')).map((node) =>
      node.getAttribute('data-tool-code')
    ),
    iframeCount: document.querySelectorAll('iframe').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyText: document.body.innerText,
  }));
  writeEvidence('runtime-flags-platform-tools-dom.json', platformDom);
  writeEvidence('runtime-flags-platform-tools-states.json', {
    apiCalls,
    familyFilterUsed: apiCalls.some(
      (call) =>
        call.pathname === '/api/v1/platform-tools/connections' &&
        call.search === '?environment=local&family=runtime_flags'
    ),
    noIframe: platformDom.iframeCount === 0,
    noHorizontalOverflow: !platformDom.horizontalOverflow,
    passed:
      apiCalls.some(
        (call) =>
          call.pathname === '/api/v1/platform-tools/connections' &&
          call.search === '?environment=local&family=runtime_flags'
      ) &&
      platformDom.platformToolCodes.includes('flagsmith') &&
      platformDom.iframeCount === 0 &&
      !platformDom.horizontalOverflow,
  });
  writeEvidence('runtime-flags-platform-tools-focus-a11y.json', {
    noIframe: platformDom.iframeCount === 0,
    noHorizontalOverflow: !platformDom.horizontalOverflow,
    passed:
      platformDom.platformToolCodes.includes('flagsmith') &&
      platformDom.iframeCount === 0 &&
      !platformDom.horizontalOverflow,
  });

  const absenceRoutes = [
    {
      id: 'ac_tenant_create',
      route: '/ac/tenant-ac/tenants/new',
      screenshot: 'runtime-flag-absence-ac-tenant-create-desktop.png',
      tier: 'ac' as const,
      viewport: { width: 1440, height: 900 },
      expectedText: 'Create tenant',
      stateProbePath: '/api/v1/module-capabilities/registry',
      forbiddenTerms: ['Flagsmith', 'Activate kill switch', 'Kill Switch 已保存'],
    },
    {
      id: 'ac_tenant_edit',
      route: '/ac/tenant-ac/tenants/tenant-ordinary',
      screenshot: 'runtime-flag-absence-ac-tenant-edit-desktop.png',
      tier: 'ac' as const,
      viewport: { width: 1440, height: 900 },
      expectedText: 'Ordinary Tenant',
      stateProbePath: '/api/v1/tenants/tenant-ordinary',
      forbiddenTerms: ['Flagsmith', 'Activate kill switch', 'Kill Switch 已保存'],
    },
    {
      id: 'tenant_settings',
      route: '/tenant/tenant-ordinary/settings',
      screenshot: 'runtime-flag-absence-tenant-settings-desktop.png',
      tier: 'standard' as const,
      viewport: { width: 1440, height: 900 },
      expectedText: '默认语言',
      stateProbePath: '/api/v1/organization/settings',
      forbiddenTerms: ['Runtime Flags', 'Flagsmith', 'Activate kill switch', 'Kill Switch 已保存'],
    },
    {
      id: 'subsidiary_settings',
      route: '/tenant/tenant-ordinary/subsidiary/sub-1/settings',
      screenshot: 'runtime-flag-absence-subsidiary-settings-desktop.png',
      tier: 'standard' as const,
      viewport: { width: 1440, height: 900 },
      expectedText: '北部分目录',
      stateProbePath: '/api/v1/subsidiaries/sub-1',
      forbiddenTerms: ['Runtime Flags', 'Flagsmith', 'Activate kill switch', 'Kill Switch 已保存'],
    },
    {
      id: 'talent_settings_mobile',
      route: '/tenant/tenant-ordinary/talent/talent-1/settings',
      screenshot: 'runtime-flag-absence-talent-settings-mobile.png',
      tier: 'standard' as const,
      viewport: { width: 390, height: 844 },
      expectedText: '示例艺人',
      stateProbePath: '/api/v1/talents/talent-1',
      forbiddenTerms: ['Runtime Flags', 'Flagsmith', 'Activate kill switch', 'Kill Switch 已保存'],
    },
  ];
  const absenceProof = [];
  const absenceStateMatrix = [];
  const routeScopedForbiddenTerms = Object.fromEntries(
    absenceRoutes.map((entry) => [entry.id, entry.forbiddenTerms])
  );
  const stateRoute = (route: string, stateName: string) =>
    `${route}${route.includes('?') ? '&' : '?'}p6AbsenceState=${stateName}`;

  for (const routeSpec of absenceRoutes) {
    await seedSession(page, routeSpec.tier === 'ac' ? 'en' : 'zh-Hans', routeSpec.tier);
    await page.setViewportSize(routeSpec.viewport);

    apiMockBehavior.failPathnames?.clear();
    apiMockBehavior.delayPathnames?.clear();
    apiMockBehavior.delayPathnames?.add(routeSpec.stateProbePath);
    const loadingBeforeCalls = apiCalls.length;
    await page.goto(stateRoute(routeSpec.route, 'loading'));
    await page.waitForTimeout(150);
    const loadingBodyText = await page.locator('body').innerText();
    const loadingRuntimeCalls = apiCalls
      .slice(loadingBeforeCalls)
      .filter((call) => String(call.pathname).startsWith('/api/v1/runtime-flags'));
    const loadingForbiddenTermsPresent = routeSpec.forbiddenTerms.filter((term) =>
      loadingBodyText.includes(term)
    );
    absenceStateMatrix.push({
      id: `${routeSpec.id}_loading`,
      route: routeSpec.route,
      state: 'loading',
      stateProbePath: routeSpec.stateProbePath,
      runtimeCalls: loadingRuntimeCalls,
      forbiddenTermsPresent: loadingForbiddenTermsPresent,
      bodyTextExcerpt: loadingBodyText.slice(0, 500),
      passed: loadingRuntimeCalls.length === 0 && loadingForbiddenTermsPresent.length === 0,
    });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    apiMockBehavior.delayPathnames?.clear();
    apiMockBehavior.failPathnames?.add(routeSpec.stateProbePath);
    const errorBeforeCalls = apiCalls.length;
    await page.goto(stateRoute(routeSpec.route, 'error'));
    await page.waitForTimeout(700);
    const errorBodyText = await page.locator('body').innerText();
    const errorRuntimeCalls = apiCalls
      .slice(errorBeforeCalls)
      .filter((call) => String(call.pathname).startsWith('/api/v1/runtime-flags'));
    const errorForbiddenTermsPresent = routeSpec.forbiddenTerms.filter((term) =>
      errorBodyText.includes(term)
    );
    absenceStateMatrix.push({
      id: `${routeSpec.id}_error`,
      route: routeSpec.route,
      state: 'error',
      stateProbePath: routeSpec.stateProbePath,
      runtimeCalls: errorRuntimeCalls,
      forbiddenTermsPresent: errorForbiddenTermsPresent,
      bodyTextExcerpt: errorBodyText.slice(0, 500),
      passed: errorRuntimeCalls.length === 0 && errorForbiddenTermsPresent.length === 0,
    });

    apiMockBehavior.failPathnames?.clear();
    apiMockBehavior.delayPathnames?.clear();
    const beforeCalls = apiCalls.length;
    await page.goto(routeSpec.route);
    await expect(page.locator('body')).toContainText(routeSpec.expectedText);
    await page.screenshot({ path: evidencePath(routeSpec.screenshot), fullPage: true });
    const bodyText = await page.locator('body').innerText();
    const runtimeCalls = apiCalls
      .slice(beforeCalls)
      .filter((call) => String(call.pathname).startsWith('/api/v1/runtime-flags'));
    const forbiddenTermsPresent = routeSpec.forbiddenTerms.filter((term) =>
      bodyText.includes(term)
    );
    const mockOrUnavailableTermsPresent = [
      'Unhandled API mock path',
      'Tenant unavailable',
      'Settings unavailable',
      '租户设置不可用',
      '分目录设置不可用',
      '艺人设置不可用',
      'Failed to load',
      '加载失败',
    ].filter((term) => bodyText.includes(term));
    absenceProof.push({
      id: routeSpec.id,
      route: routeSpec.route,
      screenshot: routeSpec.screenshot,
      expectedText: routeSpec.expectedText,
      expectedTextPresent: bodyText.includes(routeSpec.expectedText),
      runtimeCalls,
      forbiddenTermsPresent,
      mockOrUnavailableTermsPresent,
      passed:
        runtimeCalls.length === 0 &&
        forbiddenTermsPresent.length === 0 &&
        bodyText.includes(routeSpec.expectedText) &&
        mockOrUnavailableTermsPresent.length === 0,
    });
    absenceStateMatrix.push({
      id: `${routeSpec.id}_normal`,
      route: routeSpec.route,
      state: 'normal',
      stateProbePath: routeSpec.stateProbePath,
      screenshot: routeSpec.screenshot,
      expectedTextPresent: bodyText.includes(routeSpec.expectedText),
      runtimeCalls,
      forbiddenTermsPresent,
      mockOrUnavailableTermsPresent,
      passed:
        runtimeCalls.length === 0 &&
        forbiddenTermsPresent.length === 0 &&
        bodyText.includes(routeSpec.expectedText) &&
        mockOrUnavailableTermsPresent.length === 0,
    });
  }
  writeEvidence('runtime-flag-tenant-absence.json', {
    checkedRoutes: absenceRoutes.map((entry) => entry.route),
    requiredStates: ['loading', 'error', 'normal'],
    routeScopedForbiddenTerms,
    routeProof: absenceProof,
    routeStateMatrix: absenceStateMatrix,
    passed:
      absenceProof.every((entry) => entry.passed) &&
      absenceStateMatrix.every((entry) => entry.passed),
  });
  writeEvidence('runtime-flag-tenant-absence-state-matrix.json', {
    checkedRoutes: absenceRoutes.map((entry) => entry.route),
    requiredRouteClasses: absenceRoutes.map((entry) => entry.id),
    requiredStates: ['loading', 'error', 'normal'],
    routeStateMatrix: absenceStateMatrix,
    passed: absenceStateMatrix.every((entry) => entry.passed),
  });
  writeEvidence('runtime-flag-tenant-screenshots.json', {
    screenshots: absenceRoutes.map((entry) => entry.screenshot),
  });
  const ordinaryTenantRuntimeApiCalls = apiCalls.filter((call) =>
    String(call.pathname).startsWith('/api/v1/runtime-flags')
  );
  writeEvidence('runtime-flag-tenant-states.json', {
    ordinaryTenantRuntimeApiCalls,
    routeProof: absenceProof,
    routeStateMatrix: absenceStateMatrix,
    passed:
      ordinaryTenantRuntimeApiCalls.length === 0 &&
      absenceProof.every((entry) => entry.passed) &&
      absenceStateMatrix.every((entry) => entry.passed),
  });
  writeEvidence('runtime-flag-tenant-focus-a11y.json', {
    noProviderConsoleTermsOnOrdinaryRoutes: absenceProof.every(
      (entry) => entry.forbiddenTermsPresent.length === 0
    ),
    passed: absenceProof.every((entry) => entry.passed),
  });

  expect(platformDom.platformToolCodes).toContain('flagsmith');
  expect(platformDom.iframeCount).toBe(0);
  expect(platformDom.horizontalOverflow).toBe(false);
  expect(absenceProof.every((entry) => entry.passed)).toBe(true);
});

test('P6 AC runtime flags state matrix covers required runtime states', async ({ page }) => {
  await seedSession(page, 'en', 'ac');
  const state: {
    summaryMode: 'ready' | 'loading' | 'error' | 'permission';
    summary: ReturnType<typeof runtimeSummary>;
  } = {
    summaryMode: 'ready',
    summary: runtimeSummary(),
  };
  const apiCalls = await installRuntimeStateMatrixMocks(page, state);
  const scenarios: Array<{
    id: string;
    mode: 'ready' | 'loading' | 'error' | 'permission';
    summary: ReturnType<typeof runtimeSummary>;
    expectedState: 'ready' | 'loading' | 'error';
    expectedText: string;
    expectedKillSwitchDetailTexts?: string[];
    previewFlagCode?: string;
    expectDisabledTriggers?: boolean;
  }> = [
    {
      id: 'loading',
      mode: 'loading' as const,
      summary: runtimeSummary(),
      expectedState: 'loading',
      expectedText: 'Loading',
    },
    {
      id: 'empty',
      mode: 'ready' as const,
      summary: runtimeSummary({ definitions: [] }),
      expectedState: 'ready',
      expectedText: 'No registered flags',
    },
    {
      id: 'disabled_provider',
      mode: 'ready' as const,
      summary: runtimeSummary(),
      expectedState: 'ready',
      expectedText: 'disabled',
    },
    {
      id: 'flagsmith_disabled',
      mode: 'ready' as const,
      summary: runtimeSummary(),
      expectedState: 'ready',
      expectedText: 'disabled',
    },
    {
      id: 'local_static_provider',
      mode: 'ready' as const,
      summary: runtimeSummary(),
      expectedState: 'ready',
      expectedText: 'tcrn_static_provider',
      previewFlagCode: 'runtime_flags.provider_readiness_probe',
    },
    {
      id: 'openfeature_bridge_disabled',
      mode: 'ready' as const,
      summary: runtimeSummary(),
      expectedState: 'ready',
      expectedText: 'openfeature_bridge',
      previewFlagCode: 'runtime_flags.safe_degraded_mode_probe',
    },
    {
      id: 'fallback_default_evaluation',
      mode: 'ready' as const,
      summary: runtimeSummary(),
      expectedState: 'ready',
      expectedText: 'TCRN_REGISTRY_DEFAULT',
      previewFlagCode: 'runtime_flags.safe_degraded_mode_probe',
    },
    {
      id: 'local_stub_provider',
      mode: 'ready' as const,
      summary: runtimeSummary({
        providerMode: 'local_stub',
        providerHealth: 'healthy',
        providerProfile: {
          readinessState: 'local_stub',
          providerMode: 'local_stub',
          healthStatus: 'healthy',
          ssoState: 'not_applicable',
        },
      }),
      expectedState: 'ready',
      expectedText: 'local_stub',
    },
    {
      id: 'external_provided_provider',
      mode: 'ready' as const,
      summary: runtimeSummary({
        providerMode: 'external_provided',
        providerHealth: 'degraded',
        providerProfile: {
          readinessState: 'external_provided',
          providerMode: 'external_provided',
          healthStatus: 'degraded',
          ssoState: 'ready',
          endpointConfigured: true,
        },
      }),
      expectedState: 'ready',
      expectedText: 'external_provided',
    },
    {
      id: 'sso_required_provider',
      mode: 'ready' as const,
      summary: runtimeSummary({
        providerProfile: {
          readinessState: 'sso_required',
          ssoState: 'blocked',
          endpointConfigured: true,
        },
      }),
      expectedState: 'ready',
      expectedText: 'sso_required',
    },
    {
      id: 'unhealthy_provider',
      mode: 'ready' as const,
      summary: runtimeSummary({
        providerHealth: 'unhealthy',
        providerProfile: {
          readinessState: 'unhealthy',
          healthStatus: 'unhealthy',
          endpointConfigured: true,
        },
      }),
      expectedState: 'ready',
      expectedText: 'unhealthy',
    },
    {
      id: 'provider_unavailable',
      mode: 'ready' as const,
      summary: runtimeSummary({
        providerHealth: 'provider_unavailable',
        providerProfile: {
          readinessState: 'provider_unavailable',
          healthStatus: 'provider_unavailable',
          endpointConfigured: true,
        },
      }),
      expectedState: 'ready',
      expectedText: 'provider_unavailable',
      expectDisabledTriggers: true,
    },
    {
      id: 'unsafe_endpoint_provider',
      mode: 'ready' as const,
      summary: runtimeSummary({
        providerProfile: {
          readinessState: 'unsafe_url',
          healthStatus: 'degraded',
          endpointConfigured: true,
        },
      }),
      expectedState: 'ready',
      expectedText: 'unsafe_url',
    },
    {
      id: 'accepted_healthy_provider',
      mode: 'ready' as const,
      summary: runtimeSummary({
        providerMode: 'external_provided',
        providerHealth: 'healthy',
        providerProfile: {
          readinessState: 'healthy',
          providerMode: 'external_provided',
          healthStatus: 'healthy',
          ssoState: 'ready',
          endpointConfigured: true,
        },
      }),
      expectedState: 'ready',
      expectedText: 'healthy',
    },
    {
      id: 'active_kill_switch',
      mode: 'ready' as const,
      summary: runtimeSummary(true),
      expectedState: 'ready',
      expectedText: 'Emergency upstream isolation',
      expectedKillSwitchDetailTexts: [
        'active',
        'Disable degraded-mode probe path',
        'Emergency upstream isolation',
        '2026-06-01T00:00:00.000Z',
        'ac-operator',
        'ac_runtime_flags',
        'Restore provider health and deactivate',
      ],
    },
    {
      id: 'expired_kill_switch',
      mode: 'ready' as const,
      summary: runtimeSummary({
        killSwitchStatus: 'expired',
        switchReason: 'Expired isolation window',
      }),
      expectedState: 'ready',
      expectedText: 'Expired isolation window',
      expectedKillSwitchDetailTexts: [
        'expired',
        'Disable degraded-mode probe path',
        'Expired isolation window',
        '2026-05-01T00:00:00.000Z',
        'ac-operator',
        'ac_runtime_flags',
        'Restore provider health and deactivate',
      ],
    },
    {
      id: 'pending_kill_switch',
      mode: 'ready' as const,
      summary: runtimeSummary({
        killSwitchStatus: 'pending',
        switchReason: 'Pending isolation approval',
      }),
      expectedState: 'ready',
      expectedText: 'Pending isolation approval',
      expectedKillSwitchDetailTexts: [
        'pending',
        'Disable degraded-mode probe path',
        'Pending isolation approval',
        '2026-06-01T00:00:00.000Z',
        'ac-operator',
        'ac_runtime_flags',
        'Restore provider health and deactivate',
      ],
    },
    {
      id: 'api_error_retry',
      mode: 'error' as const,
      summary: runtimeSummary(),
      expectedState: 'error',
      expectedText: 'Refresh',
    },
    {
      id: 'permission_denied',
      mode: 'permission' as const,
      summary: runtimeSummary(),
      expectedState: 'error',
      expectedText: 'Permission',
    },
  ];
  const matrix = [];

  for (const scenario of scenarios) {
    state.summaryMode = scenario.mode;
    state.summary = scenario.summary;
    await page.goto(`/ac/tenant-ac/runtime-flags?state=${scenario.id}`);
    await expect(
      page.locator(`[data-runtime-flags-state="${scenario.expectedState}"]`)
    ).toBeVisible();
    if (scenario.previewFlagCode) {
      await page.getByLabel(`Preview: ${scenario.previewFlagCode}`).first().click();
    }
    await expect(page.getByText(scenario.expectedText, { exact: false }).first()).toBeVisible();
    for (const field of scenario.expectedKillSwitchDetailTexts ?? []) {
      await expect(
        page
          .locator('[data-runtime-kill-switch-details]')
          .getByText(field, { exact: false })
          .first()
      ).toBeVisible();
    }
    const dom = await collectRuntimeFlagDom(page);
    const expectedKillSwitchDetailTextPresent = (
      scenario.expectedKillSwitchDetailTexts ?? []
    ).every((field) => dom.killSwitchDetailsText.includes(field));
    matrix.push({
      id: scenario.id,
      expectedState: scenario.expectedState,
      actualState: dom.state,
      expectedTextPresent: dom.bodyText.includes(scenario.expectedText),
      expectedKillSwitchDetailTexts: scenario.expectedKillSwitchDetailTexts ?? [],
      expectedKillSwitchDetailTextPresent,
      previewFlagCode: scenario.previewFlagCode ?? null,
      disabledKillSwitchTriggers: dom.disabledKillSwitchTriggers,
      expectedDisabledTriggers: Boolean(scenario.expectDisabledTriggers),
      noIframe: dom.iframeCount === 0,
      noHorizontalOverflow: !dom.horizontalOverflow,
      passed:
        dom.state === scenario.expectedState &&
        dom.bodyText.includes(scenario.expectedText) &&
        expectedKillSwitchDetailTextPresent &&
        (!scenario.expectDisabledTriggers || dom.disabledKillSwitchTriggers > 0) &&
        dom.iframeCount === 0 &&
        !dom.horizontalOverflow,
    });
  }

  const requiredIds = scenarios.map((scenario) => scenario.id);
  writeEvidence('ac-runtime-flags-states.json', {
    apiCalls,
    requiredIds,
    coveredIds: matrix.map((entry) => entry.id),
    matrix,
    passed: matrix.every((entry) => entry.passed),
  });
});

test('P6 platform-tool runtime flags family state matrix covers provider states', async ({
  page,
}) => {
  await seedSession(page, 'en', 'ac');
  const state: {
    mode: 'ready' | 'loading' | 'error' | 'permission';
    items: unknown[];
    savedItem?: unknown;
  } = {
    mode: 'ready',
    items: [flagsmithPlatformToolBundle()],
    savedItem: flagsmithPlatformToolBundle({
      connection: {
        enabled: true,
        readinessState: 'external_provided',
        healthStatus: 'healthy',
        ssoReadinessState: 'ready',
        endpointUrl: 'https://flagsmith.example.test',
        localDevMode: 'external_provided',
        deploymentMode: 'external_provided',
        version: 2,
      },
      ssoReadiness: { status: 'ready' },
    }),
  };
  const apiCalls = await installPlatformToolStateMatrixMocks(page, state);
  const scenarios = [
    {
      id: 'loading',
      mode: 'loading' as const,
      items: [flagsmithPlatformToolBundle()],
      expectedText: 'Loading platform tools',
    },
    {
      id: 'empty_no_profile',
      mode: 'ready' as const,
      items: [],
      expectedText: 'No platform tools',
    },
    {
      id: 'disabled',
      mode: 'ready' as const,
      items: [flagsmithPlatformToolBundle()],
      expectedText: 'disabled',
    },
    {
      id: 'local_stub',
      mode: 'ready' as const,
      items: [
        flagsmithPlatformToolBundle({
          connection: {
            readinessState: 'local_stub',
            healthStatus: 'healthy',
            localDevMode: 'stubbed',
            deploymentMode: 'stubbed',
          },
          ssoReadiness: { status: 'not_applicable' },
        }),
      ],
      expectedText: 'local stub',
    },
    {
      id: 'external_healthy',
      mode: 'ready' as const,
      items: [
        flagsmithPlatformToolBundle({
          connection: {
            enabled: true,
            readinessState: 'healthy',
            healthStatus: 'healthy',
            localDevMode: 'external_provided',
            deploymentMode: 'external_provided',
            endpointUrl: 'https://flagsmith.example.test',
          },
          ssoReadiness: { status: 'ready' },
        }),
      ],
      expectedText: 'healthy',
    },
    {
      id: 'unhealthy',
      mode: 'ready' as const,
      items: [
        flagsmithPlatformToolBundle({
          connection: { readinessState: 'unhealthy', healthStatus: 'unhealthy' },
        }),
      ],
      expectedText: 'unhealthy',
    },
    {
      id: 'sso_required',
      mode: 'ready' as const,
      items: [
        flagsmithPlatformToolBundle({
          connection: {
            readinessState: 'sso_required',
            endpointUrl: 'https://flagsmith.example.test',
          },
          ssoReadiness: { status: 'blocked' },
        }),
      ],
      expectedText: 'sso required',
    },
    {
      id: 'unsafe_endpoint',
      mode: 'ready' as const,
      items: [
        flagsmithPlatformToolBundle({
          connection: {
            readinessState: 'unsafe_url',
            healthStatus: 'degraded',
            endpointUrl: 'http://127.0.0.1',
          },
        }),
      ],
      expectedText: 'unsafe url',
    },
    { id: 'api_error_retry', mode: 'error' as const, items: [], expectedText: 'Refresh' },
    { id: 'permission_denied', mode: 'permission' as const, items: [], expectedText: 'Permission' },
  ];
  const matrix = [];

  for (const scenario of scenarios) {
    state.mode = scenario.mode;
    state.items = scenario.items;
    await page.setViewportSize(
      scenario.id === 'loading' ? { width: 390, height: 844 } : { width: 1440, height: 900 }
    );
    await page.goto(`/ac/tenant-ac/platform-tools?family=runtime_flags&state=${scenario.id}`);
    await expect(page.getByText(scenario.expectedText, { exact: false }).first()).toBeVisible();
    const dom = await collectPlatformToolDom(page);
    matrix.push({
      id: scenario.id,
      expectedTextPresent: dom.bodyText.includes(scenario.expectedText),
      noIframe: dom.iframeCount === 0,
      noHorizontalOverflow: !dom.horizontalOverflow,
      passed:
        dom.bodyText.includes(scenario.expectedText) &&
        dom.iframeCount === 0 &&
        !dom.horizontalOverflow,
    });
  }

  state.mode = 'ready';
  state.items = [flagsmithPlatformToolBundle()];
  await page.goto('/ac/tenant-ac/platform-tools?family=runtime_flags&state=dirty_config');
  await page.getByLabel('Configure: Flagsmith').first().click();
  await page.getByLabel('Endpoint URL').fill('https://flagsmith.example.test');
  const dirtyDom = await collectPlatformToolDom(page);
  matrix.push({
    id: 'dirty_config',
    expectedTextPresent: dirtyDom.bodyText.includes('Save'),
    noIframe: dirtyDom.iframeCount === 0,
    noHorizontalOverflow: !dirtyDom.horizontalOverflow,
    passed:
      dirtyDom.bodyText.includes('Save') &&
      dirtyDom.iframeCount === 0 &&
      !dirtyDom.horizontalOverflow,
  });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Connection saved')).toBeVisible();
  const savedDom = await collectPlatformToolDom(page);
  matrix.push({
    id: 'saved_readback',
    patchCallSeen: apiCalls.some(
      (call) =>
        call.method === 'PATCH' && call.pathname === '/api/v1/platform-tools/connections/flagsmith'
    ),
    expectedTextPresent: savedDom.bodyText.includes('Connection saved'),
    noIframe: savedDom.iframeCount === 0,
    noHorizontalOverflow: !savedDom.horizontalOverflow,
    passed:
      apiCalls.some(
        (call) =>
          call.method === 'PATCH' &&
          call.pathname === '/api/v1/platform-tools/connections/flagsmith'
      ) &&
      savedDom.bodyText.includes('Connection saved') &&
      savedDom.iframeCount === 0 &&
      !savedDom.horizontalOverflow,
  });

  writeEvidence('runtime-flags-platform-tools-states.json', {
    apiCalls,
    requiredIds: [...scenarios.map((scenario) => scenario.id), 'dirty_config', 'saved_readback'],
    coveredIds: matrix.map((entry) => entry.id),
    matrix,
    passed: matrix.every((entry) => entry.passed),
  });
});
