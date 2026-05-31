// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { LocalizedText } from '../constants/locale';

export const RUNTIME_FLAG_ADAPTER_CODES = [
  'tcrn_static_provider',
  'openfeature_bridge',
  'flagsmith_provider',
  'runtime_kill_switch_policy',
] as const;

export const RUNTIME_FLAG_CATEGORIES = [
  'kill_switch',
  'rollout',
  'experiment',
  'degraded_mode',
  'readiness_probe',
] as const;

export const RUNTIME_FLAG_PROVIDER_MODES = [
  'disabled',
  'local_stub',
  'test_fixture',
  'external_provided',
] as const;

export const RUNTIME_FLAG_READINESS_STATES = [
  'disabled',
  'not_configured',
  'local_stub',
  'external_provided',
  'sso_required',
  'healthy',
  'degraded',
  'unhealthy',
  'unsafe_url',
  'provider_unavailable',
] as const;

export const RUNTIME_FLAG_FAIL_BEHAVIORS = [
  'fail_closed',
  'fail_to_default',
  'no_product_effect',
] as const;

export const RUNTIME_FLAG_CONTEXT_KEYS = [
  'environment',
  'service',
  'flagCode',
  'tenantId',
  'tenantCode',
  'subsidiaryId',
  'talentId',
  'actorClass',
  'resolvedCapabilityCodes',
  'requestCategory',
  'correlationId',
] as const;

export const RUNTIME_FLAG_FORBIDDEN_CONTEXT_PATTERNS = [
  'email',
  'phone',
  'password',
  'token',
  'cookie',
  'secret',
  'customer',
  'pii',
  'requestBody',
  'responseBody',
] as const;

export type RuntimeFlagAdapterCode = (typeof RUNTIME_FLAG_ADAPTER_CODES)[number];
export type RuntimeFlagCategory = (typeof RUNTIME_FLAG_CATEGORIES)[number];
export type RuntimeFlagProviderMode = (typeof RUNTIME_FLAG_PROVIDER_MODES)[number];
export type RuntimeFlagReadinessState = (typeof RUNTIME_FLAG_READINESS_STATES)[number];
export type RuntimeFlagFailBehavior = (typeof RUNTIME_FLAG_FAIL_BEHAVIORS)[number];
export type RuntimeFlagContextKey = (typeof RUNTIME_FLAG_CONTEXT_KEYS)[number];

export interface RuntimeFlagAdapterDefinition {
  code: RuntimeFlagAdapterCode;
  label: string;
  localizedLabel: LocalizedText;
  kind: 'built_in_provider' | 'abstraction' | 'external_provider' | 'tcrn_policy';
  platformToolCode: 'flagsmith' | null;
  defaultEnabled: boolean;
  defaultReadinessState: RuntimeFlagReadinessState;
  ownerPhase: 'phase_6';
  humanUi: boolean;
  deepLink: boolean;
  evaluationCapability:
    | 'registry_defaults'
    | 'registered_provider_bridge'
    | 'registered_flags_only'
    | 'kill_switch_precedence';
  localDevModes: readonly RuntimeFlagProviderMode[];
  ssoRequirement: 'required' | 'not_applicable';
  licensePosture: string;
  sourceOfTruthBoundary: string;
  defaultNoProviderBehavior: string;
  sortOrder: number;
}

export interface RuntimeFlagDefinition {
  code: string;
  label: string;
  localizedLabel: LocalizedText;
  category: RuntimeFlagCategory;
  status: 'registered' | 'deprecated' | 'expired';
  ownerModule: string;
  defaultValue: boolean | string | number;
  failBehavior: RuntimeFlagFailBehavior;
  allowedContextKeys: readonly RuntimeFlagContextKey[];
  providerMapping: {
    adapterCode: RuntimeFlagAdapterCode;
    providerKey: string | null;
  };
  hasProductEffect: boolean;
  expiresAt: string | null;
  auditPolicy: 'evaluate_and_mutate' | 'mutate_only' | 'readiness_only';
  description: string;
  updatedAt: string;
  sortOrder: number;
}

export interface RuntimeFlagPolicy {
  allowedContextKeys: readonly RuntimeFlagContextKey[];
  forbiddenContextPatterns: readonly string[];
  productAuthority: string;
  providerAuthority: string;
  rawProviderRuleEditingAllowed: false;
  providerMayCreateUnknownFlags: false;
  tenantSettingsFeaturesAllowed: false;
  globalConfigFeatureFlagsAllowed: false;
}

const label = (en: string, zhHans: string, zhHant: string, ja: string, ko: string, fr: string) => ({
  en,
  zh_HANS: zhHans,
  zh_HANT: zhHant,
  ja,
  ko,
  fr,
});

const sourceOfTruthBoundary =
  'TCRN owns runtime flag definitions, context, defaults, fail behavior, audit, and entitlement separation; providers may return values only for registered flags and cannot grant modules, permissions, quotas, licenses, or scope applicability.';

export const RUNTIME_FLAG_ADAPTER_DEFINITIONS: readonly RuntimeFlagAdapterDefinition[] = [
  {
    code: 'tcrn_static_provider',
    label: 'TCRN Static Runtime Flag Provider',
    localizedLabel: label(
      'TCRN Static Runtime Flag Provider',
      'TCRN 静态运行时开关提供方',
      'TCRN 靜態執行期開關提供方',
      'TCRN 静的ランタイムフラグプロバイダー',
      'TCRN 정적 런타임 플래그 제공자',
      'Fournisseur statique de flags runtime TCRN'
    ),
    kind: 'built_in_provider',
    platformToolCode: null,
    defaultEnabled: true,
    defaultReadinessState: 'local_stub',
    ownerPhase: 'phase_6',
    humanUi: false,
    deepLink: false,
    evaluationCapability: 'registry_defaults',
    localDevModes: ['disabled', 'local_stub', 'test_fixture'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'Internal TCRN code, no external license impact.',
    sourceOfTruthBoundary,
    defaultNoProviderBehavior: 'Returns registry defaults and each flag fail behavior.',
    sortOrder: 10,
  },
  {
    code: 'openfeature_bridge',
    label: 'OpenFeature Provider Bridge',
    localizedLabel: label(
      'OpenFeature Provider Bridge',
      'OpenFeature 提供方桥接',
      'OpenFeature 提供方橋接',
      'OpenFeature プロバイダーブリッジ',
      'OpenFeature 제공자 브리지',
      'Pont fournisseur OpenFeature'
    ),
    kind: 'abstraction',
    platformToolCode: null,
    defaultEnabled: false,
    defaultReadinessState: 'disabled',
    ownerPhase: 'phase_6',
    humanUi: false,
    deepLink: false,
    evaluationCapability: 'registered_provider_bridge',
    localDevModes: ['disabled', 'local_stub', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'OpenFeature Apache-2.0 posture recorded before ready.',
    sourceOfTruthBoundary,
    defaultNoProviderBehavior: 'Falls back according to each registered flag fail behavior.',
    sortOrder: 20,
  },
  {
    code: 'flagsmith_provider',
    label: 'Flagsmith Runtime Flag Provider',
    localizedLabel: label(
      'Flagsmith Runtime Flag Provider',
      'Flagsmith 运行时开关提供方',
      'Flagsmith 執行期開關提供方',
      'Flagsmith ランタイムフラグプロバイダー',
      'Flagsmith 런타임 플래그 제공자',
      'Fournisseur Flagsmith de flags runtime'
    ),
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
    licensePosture: 'Flagsmith open-core edition/license/SBOM posture recorded before ready.',
    sourceOfTruthBoundary,
    defaultNoProviderBehavior: 'No remote calls; evaluation uses registry defaults.',
    sortOrder: 30,
  },
  {
    code: 'runtime_kill_switch_policy',
    label: 'Runtime Kill Switch Policy',
    localizedLabel: label(
      'Runtime Kill Switch Policy',
      '运行时 Kill Switch 策略',
      '執行期 Kill Switch 策略',
      'ランタイム Kill Switch ポリシー',
      '런타임 Kill Switch 정책',
      'Politique de kill switch runtime'
    ),
    kind: 'tcrn_policy',
    platformToolCode: null,
    defaultEnabled: true,
    defaultReadinessState: 'local_stub',
    ownerPhase: 'phase_6',
    humanUi: false,
    deepLink: false,
    evaluationCapability: 'kill_switch_precedence',
    localDevModes: ['local_stub', 'test_fixture'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'Internal TCRN code, no external license impact.',
    sourceOfTruthBoundary,
    defaultNoProviderBehavior:
      'Safety-critical switches fail closed; rollout flags fail to default.',
    sortOrder: 40,
  },
];

export const RUNTIME_FLAG_DEFINITIONS: readonly RuntimeFlagDefinition[] = [
  {
    code: 'runtime_flags.provider_readiness_probe',
    label: 'Provider Readiness Probe',
    localizedLabel: label(
      'Provider Readiness Probe',
      '提供方就绪性探针',
      '提供方就緒性探針',
      'プロバイダー準備プローブ',
      '제공자 준비 상태 프로브',
      'Sonde de readiness fournisseur'
    ),
    category: 'readiness_probe',
    status: 'registered',
    ownerModule: 'platform_control_plane',
    defaultValue: false,
    failBehavior: 'no_product_effect',
    allowedContextKeys: ['environment', 'service', 'flagCode', 'correlationId'],
    providerMapping: {
      adapterCode: 'tcrn_static_provider',
      providerKey: null,
    },
    hasProductEffect: false,
    expiresAt: null,
    auditPolicy: 'readiness_only',
    description:
      'Readiness-only fixture that proves registered-flag evaluation without product effect.',
    updatedAt: '2026-05-28T00:00:00.000Z',
    sortOrder: 10,
  },
  {
    code: 'runtime_flags.safe_degraded_mode_probe',
    label: 'Safe Degraded Mode Probe',
    localizedLabel: label(
      'Safe Degraded Mode Probe',
      '安全降级模式探针',
      '安全降級模式探針',
      '安全な縮退モードプローブ',
      '안전한 저하 모드 프로브',
      'Sonde de mode degrade sur'
    ),
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
      'tenantCode',
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
    description:
      'Non-business probe for degraded-mode evaluation; entitlement remains resolved before evaluation.',
    updatedAt: '2026-05-28T00:00:00.000Z',
    sortOrder: 20,
  },
];

export const RUNTIME_FLAG_POLICY: RuntimeFlagPolicy = {
  allowedContextKeys: RUNTIME_FLAG_CONTEXT_KEYS,
  forbiddenContextPatterns: RUNTIME_FLAG_FORBIDDEN_CONTEXT_PATTERNS,
  productAuthority:
    'TCRN Module/Capability Registry, RBAC, tenant settings, and product services remain the authority before runtime flag evaluation.',
  providerAuthority:
    'OpenFeature/Flagsmith may provide rollout values for registered flags only after TCRN validates context and entitlement.',
  rawProviderRuleEditingAllowed: false,
  providerMayCreateUnknownFlags: false,
  tenantSettingsFeaturesAllowed: false,
  globalConfigFeatureFlagsAllowed: false,
};

export function getRuntimeFlagAdapterDefinition(code: string) {
  return RUNTIME_FLAG_ADAPTER_DEFINITIONS.find((definition) => definition.code === code);
}

export function getRuntimeFlagDefinition(code: string) {
  return RUNTIME_FLAG_DEFINITIONS.find((definition) => definition.code === code);
}
