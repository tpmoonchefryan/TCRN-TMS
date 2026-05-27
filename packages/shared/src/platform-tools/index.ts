// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { LocalizedText } from '../constants/locale';

export const PLATFORM_TOOL_FAMILIES = [
  'identity_provider',
  'observability_console',
  'runtime_flags',
  'webhook_delivery',
  'event_backbone',
  'api_gateway',
  'internal_tooling',
  'developer_portal',
  'external_authorization',
] as const;

export const PLATFORM_TOOL_STATES = [
  'readiness_candidate_disabled',
  'selected_candidate_disabled',
  'existing_infra_classification_disabled',
  'deferred_disabled',
  'deferred_shadow_disabled',
] as const;

export const PLATFORM_TOOL_LOCAL_DEV_MODES = [
  'disabled',
  'stubbed',
  'compose_opt_in',
  'external_provided',
] as const;

export const PLATFORM_TOOL_CONNECTION_ENVIRONMENTS = [
  'local',
  'shared_dev',
  'staging',
  'production',
] as const;

export const PLATFORM_TOOL_CONNECTION_STATES = [
  'not_configured',
  'disabled',
  'configured',
  'sso_required',
  'ready',
  'degraded',
  'unhealthy',
  'unsafe_url',
] as const;

export const PLATFORM_TOOL_HEALTH_STATES = [
  'unknown',
  'not_configured',
  'disabled',
  'healthy',
  'degraded',
  'unhealthy',
  'sso_required',
  'forbidden',
  'stale',
] as const;

export const PLATFORM_TOOL_SSO_STATES = ['blocked', 'ready', 'not_applicable'] as const;

export type PlatformToolFamily = (typeof PLATFORM_TOOL_FAMILIES)[number];
export type PlatformToolState = (typeof PLATFORM_TOOL_STATES)[number];
export type PlatformToolLocalDevMode = (typeof PLATFORM_TOOL_LOCAL_DEV_MODES)[number];
export type PlatformToolConnectionEnvironment =
  (typeof PLATFORM_TOOL_CONNECTION_ENVIRONMENTS)[number];
export type PlatformToolConnectionState = (typeof PLATFORM_TOOL_CONNECTION_STATES)[number];
export type PlatformToolHealthState = (typeof PLATFORM_TOOL_HEALTH_STATES)[number];
export type PlatformToolSsoState = (typeof PLATFORM_TOOL_SSO_STATES)[number];

export interface PlatformToolDefinition {
  code: string;
  family: PlatformToolFamily;
  displayKey: string;
  label: string;
  localizedLabel: LocalizedText;
  defaultState: PlatformToolState;
  ownerPhase: string;
  humanUi: boolean;
  deepLink: boolean;
  allowedLocalDevModes: readonly PlatformToolLocalDevMode[];
  ssoRequirement: 'required' | 'not_applicable';
  licensePosture: string;
  defaultConnection: 'none';
  sortOrder: number;
}

const label = (en: string, zhHans: string, zhHant: string, ja: string, ko: string, fr: string) => ({
  en,
  zh_HANS: zhHans,
  zh_HANT: zhHant,
  ja,
  ko,
  fr,
});

export const PLATFORM_TOOL_DEFINITIONS = [
  {
    code: 'keycloak',
    family: 'identity_provider',
    displayKey: 'platformTools.keycloak',
    label: 'Keycloak',
    localizedLabel: label('Keycloak', 'Keycloak', 'Keycloak', 'Keycloak', 'Keycloak', 'Keycloak'),
    defaultState: 'readiness_candidate_disabled',
    ownerPhase: 'phase_3_foundation_or_later_owner_approved_iam_migration',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'apache_2_compatible_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 10,
  },
  {
    code: 'grafana',
    family: 'observability_console',
    displayKey: 'platformTools.grafana',
    label: 'Grafana',
    localizedLabel: label('Grafana', 'Grafana', 'Grafana', 'Grafana', 'Grafana', 'Grafana'),
    defaultState: 'selected_candidate_disabled',
    ownerPhase: 'phase_5',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'compose_opt_in', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'agpl_or_enterprise_edition_posture_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 20,
  },
  {
    code: 'flagsmith',
    family: 'runtime_flags',
    displayKey: 'platformTools.flagsmith',
    label: 'Flagsmith',
    localizedLabel: label('Flagsmith', 'Flagsmith', 'Flagsmith', 'Flagsmith', 'Flagsmith', 'Flagsmith'),
    defaultState: 'selected_candidate_disabled',
    ownerPhase: 'phase_6',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'open_core_edition_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 30,
  },
  {
    code: 'svix',
    family: 'webhook_delivery',
    displayKey: 'platformTools.svix',
    label: 'Svix',
    localizedLabel: label('Svix', 'Svix', 'Svix', 'Svix', 'Svix', 'Svix'),
    defaultState: 'selected_candidate_disabled',
    ownerPhase: 'phase_7',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'open_source_or_edition_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 40,
  },
  {
    code: 'nats-jetstream',
    family: 'event_backbone',
    displayKey: 'platformTools.natsJetstream',
    label: 'NATS JetStream',
    localizedLabel: label(
      'NATS JetStream',
      'NATS JetStream',
      'NATS JetStream',
      'NATS JetStream',
      'NATS JetStream',
      'NATS JetStream'
    ),
    defaultState: 'existing_infra_classification_disabled',
    ownerPhase: 'phase_8',
    humanUi: false,
    deepLink: false,
    allowedLocalDevModes: ['disabled', 'compose_opt_in', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'apache_2_evidence_retained',
    defaultConnection: 'none',
    sortOrder: 50,
  },
  {
    code: 'apisix',
    family: 'api_gateway',
    displayKey: 'platformTools.apisix',
    label: 'Apache APISIX',
    localizedLabel: label(
      'Apache APISIX',
      'Apache APISIX',
      'Apache APISIX',
      'Apache APISIX',
      'Apache APISIX',
      'Apache APISIX'
    ),
    defaultState: 'selected_candidate_disabled',
    ownerPhase: 'phase_10',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'apache_2_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 60,
  },
  {
    code: 'appsmith',
    family: 'internal_tooling',
    displayKey: 'platformTools.appsmith',
    label: 'Appsmith',
    localizedLabel: label('Appsmith', 'Appsmith', 'Appsmith', 'Appsmith', 'Appsmith', 'Appsmith'),
    defaultState: 'deferred_disabled',
    ownerPhase: 'later_owner_approved_phase',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'apache_2_or_edition_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 70,
  },
  {
    code: 'backstage',
    family: 'developer_portal',
    displayKey: 'platformTools.backstage',
    label: 'Backstage',
    localizedLabel: label('Backstage', 'Backstage', 'Backstage', 'Backstage', 'Backstage', 'Backstage'),
    defaultState: 'deferred_disabled',
    ownerPhase: 'later_owner_approved_phase',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'apache_2_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 80,
  },
  {
    code: 'openfga',
    family: 'external_authorization',
    displayKey: 'platformTools.openfga',
    label: 'OpenFGA',
    localizedLabel: label('OpenFGA', 'OpenFGA', 'OpenFGA', 'OpenFGA', 'OpenFGA', 'OpenFGA'),
    defaultState: 'deferred_shadow_disabled',
    ownerPhase: 'later_owner_approved_phase',
    humanUi: false,
    deepLink: false,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'apache_2_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 90,
  },
  {
    code: 'opa',
    family: 'external_authorization',
    displayKey: 'platformTools.opa',
    label: 'OPA',
    localizedLabel: label('OPA', 'OPA', 'OPA', 'OPA', 'OPA', 'OPA'),
    defaultState: 'deferred_shadow_disabled',
    ownerPhase: 'later_owner_approved_phase',
    humanUi: false,
    deepLink: false,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'apache_2_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 100,
  },
  {
    code: 'cerbos',
    family: 'external_authorization',
    displayKey: 'platformTools.cerbos',
    label: 'Cerbos',
    localizedLabel: label('Cerbos', 'Cerbos', 'Cerbos', 'Cerbos', 'Cerbos', 'Cerbos'),
    defaultState: 'deferred_shadow_disabled',
    ownerPhase: 'later_owner_approved_phase',
    humanUi: true,
    deepLink: true,
    allowedLocalDevModes: ['disabled', 'stubbed', 'external_provided'],
    ssoRequirement: 'required',
    licensePosture: 'apache_2_or_edition_evidence_required_before_ready',
    defaultConnection: 'none',
    sortOrder: 110,
  },
] as const satisfies readonly PlatformToolDefinition[];

export type PlatformToolCode = (typeof PLATFORM_TOOL_DEFINITIONS)[number]['code'];
export const PLATFORM_TOOL_CODES = PLATFORM_TOOL_DEFINITIONS.map((definition) => definition.code) as [
  PlatformToolCode,
  ...PlatformToolCode[],
];

export function getPlatformToolDefinition(code: string): PlatformToolDefinition | undefined {
  return PLATFORM_TOOL_DEFINITIONS.find((definition) => definition.code === code);
}
