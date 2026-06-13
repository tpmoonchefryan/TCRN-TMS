// SPDX-License-Identifier: Apache-2.0
import type { LocalizedText } from '../constants/locale';

export const OBSERVABILITY_ADAPTER_CODES = [
  'otel_trace_exporter',
  'otel_metrics_exporter',
  'loki_log_backend',
  'tempo_trace_backend',
  'prometheus_metrics_backend',
  'prometheus_alert_rules',
  'grafana_console',
] as const;

export const OBSERVABILITY_SIGNAL_FAMILIES = [
  'logs',
  'traces',
  'metrics',
  'alerts',
  'dashboards',
] as const;

export const OBSERVABILITY_BACKEND_MODES = [
  'disabled',
  'local_stub',
  'compose_opt_in',
  'external_provided',
  'repository_readback',
] as const;

export const OBSERVABILITY_READINESS_STATES = [
  'disabled',
  'not_configured',
  'missing_config',
  'local_stub',
  'compose_opt_in_not_running',
  'external_provided',
  'repository_readback',
  'sso_required',
  'healthy',
  'degraded',
  'unhealthy',
  'unsafe_url',
] as const;

export type ObservabilityAdapterCode = (typeof OBSERVABILITY_ADAPTER_CODES)[number];
export type ObservabilitySignalFamily = (typeof OBSERVABILITY_SIGNAL_FAMILIES)[number];
export type ObservabilityBackendMode = (typeof OBSERVABILITY_BACKEND_MODES)[number];
export type ObservabilityReadinessState = (typeof OBSERVABILITY_READINESS_STATES)[number];

export interface ObservabilityAdapterDefinition {
  code: ObservabilityAdapterCode;
  label: string;
  localizedLabel: LocalizedText;
  signalFamily: ObservabilitySignalFamily;
  platformToolCode: 'grafana' | null;
  defaultEnabled: false;
  defaultReadinessState: ObservabilityReadinessState;
  ownerPhase: 'phase_5';
  humanUi: boolean;
  deepLink: boolean;
  safeQueryCapability:
    | 'none'
    | 'tcrn_safe_log_query'
    | 'trace_id_template_only'
    | 'bounded_ac_metric_preview'
    | 'alert_yaml_lint_only'
    | 'sso_gated_deep_link_template';
  localDevModes: readonly ObservabilityBackendMode[];
  ssoRequirement: 'required' | 'not_applicable';
  licensePosture: string;
  sourceOfTruthBoundary: string;
  defaultBackendState: string;
  sortOrder: number;
}

export interface ObservabilitySignalPolicy {
  allowedAttributeKeys: readonly string[];
  forbiddenAttributePatterns: readonly string[];
  maxQueryRangeHours: number;
  maxResultLimit: number;
  rawQueryAllowedForOrdinaryTenants: false;
  productAuthority: string;
  externalToolAuthority: string;
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
  'TCRN owns product audit/log facts, redaction, tenant labels, and signal policy; external observability tools may only provide AC-only readiness, storage, visualization, or SSO-gated links.';

export const OBSERVABILITY_ADAPTER_DEFINITIONS: readonly ObservabilityAdapterDefinition[] = [
  {
    code: 'otel_trace_exporter',
    label: 'OpenTelemetry Trace Exporter',
    localizedLabel: label(
      'OpenTelemetry Trace Exporter',
      'OpenTelemetry 追踪导出器',
      'OpenTelemetry 追蹤匯出器',
      'OpenTelemetry トレースエクスポーター',
      'OpenTelemetry 추적 내보내기',
      'Exportateur de traces OpenTelemetry'
    ),
    signalFamily: 'traces',
    platformToolCode: null,
    defaultEnabled: false,
    defaultReadinessState: 'disabled',
    ownerPhase: 'phase_5',
    humanUi: false,
    deepLink: false,
    safeQueryCapability: 'none',
    localDevModes: ['disabled', 'local_stub', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'OpenTelemetry CNCF Apache-2.0 posture recorded before ready',
    sourceOfTruthBoundary,
    defaultBackendState: 'No backend when OTEL_ENABLED=false or trace endpoint is missing.',
    sortOrder: 10,
  },
  {
    code: 'otel_metrics_exporter',
    label: 'OpenTelemetry Metrics Exporter',
    localizedLabel: label(
      'OpenTelemetry Metrics Exporter',
      'OpenTelemetry 指标导出器',
      'OpenTelemetry 指標匯出器',
      'OpenTelemetry メトリクスエクスポーター',
      'OpenTelemetry 메트릭 내보내기',
      'Exportateur de metriques OpenTelemetry'
    ),
    signalFamily: 'metrics',
    platformToolCode: null,
    defaultEnabled: false,
    defaultReadinessState: 'disabled',
    ownerPhase: 'phase_5',
    humanUi: false,
    deepLink: false,
    safeQueryCapability: 'none',
    localDevModes: ['disabled', 'local_stub', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'OpenTelemetry CNCF Apache-2.0 posture recorded before ready',
    sourceOfTruthBoundary,
    defaultBackendState:
      'Metrics export requires OTEL_EXPORTER_OTLP_METRICS_ENDPOINT and must not be inferred from the trace endpoint.',
    sortOrder: 20,
  },
  {
    code: 'loki_log_backend',
    label: 'Loki Log Backend',
    localizedLabel: label(
      'Loki Log Backend',
      'Loki 日志后端',
      'Loki 日誌後端',
      'Loki ログバックエンド',
      'Loki 로그 백엔드',
      'Backend de journaux Loki'
    ),
    signalFamily: 'logs',
    platformToolCode: null,
    defaultEnabled: false,
    defaultReadinessState: 'disabled',
    ownerPhase: 'phase_5',
    humanUi: false,
    deepLink: false,
    safeQueryCapability: 'tcrn_safe_log_query',
    localDevModes: ['disabled', 'compose_opt_in', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'Loki AGPL or edition posture recorded before ready',
    sourceOfTruthBoundary,
    defaultBackendState: 'LOKI_ENABLED=false returns empty safe results.',
    sortOrder: 30,
  },
  {
    code: 'tempo_trace_backend',
    label: 'Tempo Trace Backend',
    localizedLabel: label(
      'Tempo Trace Backend',
      'Tempo 追踪后端',
      'Tempo 追蹤後端',
      'Tempo トレースバックエンド',
      'Tempo 추적 백엔드',
      'Backend de traces Tempo'
    ),
    signalFamily: 'traces',
    platformToolCode: null,
    defaultEnabled: false,
    defaultReadinessState: 'disabled',
    ownerPhase: 'phase_5',
    humanUi: false,
    deepLink: false,
    safeQueryCapability: 'trace_id_template_only',
    localDevModes: ['disabled', 'compose_opt_in', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'Tempo AGPL or edition posture recorded before ready',
    sourceOfTruthBoundary,
    defaultBackendState: 'No trace backend when compose profile is disabled or not connected.',
    sortOrder: 40,
  },
  {
    code: 'prometheus_metrics_backend',
    label: 'Prometheus Metrics Backend',
    localizedLabel: label(
      'Prometheus Metrics Backend',
      'Prometheus 指标后端',
      'Prometheus 指標後端',
      'Prometheus メトリクスバックエンド',
      'Prometheus 메트릭 백엔드',
      'Backend de metriques Prometheus'
    ),
    signalFamily: 'metrics',
    platformToolCode: null,
    defaultEnabled: false,
    defaultReadinessState: 'disabled',
    ownerPhase: 'phase_5',
    humanUi: false,
    deepLink: false,
    safeQueryCapability: 'bounded_ac_metric_preview',
    localDevModes: ['disabled', 'external_provided'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'Prometheus Apache-2.0 posture recorded before ready',
    sourceOfTruthBoundary,
    defaultBackendState: 'No Prometheus deployment proof in Phase 5.',
    sortOrder: 50,
  },
  {
    code: 'prometheus_alert_rules',
    label: 'Prometheus Alert Rule Readiness',
    localizedLabel: label(
      'Prometheus Alert Rule Readiness',
      'Prometheus 告警规则就绪性',
      'Prometheus 警示規則就緒性',
      'Prometheus アラートルール準備状況',
      'Prometheus 알림 규칙 준비 상태',
      'Preparation des regles d alerte Prometheus'
    ),
    signalFamily: 'alerts',
    platformToolCode: null,
    defaultEnabled: false,
    defaultReadinessState: 'repository_readback',
    ownerPhase: 'phase_5',
    humanUi: false,
    deepLink: false,
    safeQueryCapability: 'alert_yaml_lint_only',
    localDevModes: ['repository_readback', 'local_stub'],
    ssoRequirement: 'not_applicable',
    licensePosture: 'Prometheus rule syntax and license posture recorded before ready',
    sourceOfTruthBoundary,
    defaultBackendState: 'Alert YAML is readiness input, not server deployment proof.',
    sortOrder: 60,
  },
  {
    code: 'grafana_console',
    label: 'Grafana Observability Console',
    localizedLabel: label(
      'Grafana Observability Console',
      'Grafana 可观测性控制台',
      'Grafana 可觀測性主控台',
      'Grafana オブザーバビリティコンソール',
      'Grafana 관측성 콘솔',
      'Console d observabilite Grafana'
    ),
    signalFamily: 'dashboards',
    platformToolCode: 'grafana',
    defaultEnabled: false,
    defaultReadinessState: 'disabled',
    ownerPhase: 'phase_5',
    humanUi: true,
    deepLink: true,
    safeQueryCapability: 'sso_gated_deep_link_template',
    localDevModes: ['disabled', 'external_provided', 'local_stub'],
    ssoRequirement: 'required',
    licensePosture: 'Grafana AGPL, Enterprise, or Cloud edition posture recorded before ready',
    sourceOfTruthBoundary,
    defaultBackendState: 'No Grafana service is installed or assumed by Phase 5.',
    sortOrder: 70,
  },
] as const;

export const OBSERVABILITY_SIGNAL_POLICY: ObservabilitySignalPolicy = {
  allowedAttributeKeys: [
    'tenant_id',
    'request_id',
    'trace_id',
    'span_id',
    'severity',
    'stream',
    'event_type',
    'scope',
    'status',
    'consumer_code',
    'latency_ms',
  ],
  forbiddenAttributePatterns: [
    'password',
    'token',
    'authorization',
    'cookie',
    'client_secret',
    'api_key',
    'private_key',
    'requestBody',
    'responseBody',
    'email',
    'phone',
    'customer',
    'pii',
  ],
  maxQueryRangeHours: 24,
  maxResultLimit: 100,
  rawQueryAllowedForOrdinaryTenants: false,
  productAuthority:
    'TCRN database logs and audit records remain the product audit source of truth.',
  externalToolAuthority:
    'External observability tools may store, query, or visualize exported telemetry after AC-owned readiness policy only.',
};

export function getObservabilityAdapterDefinition(code: string) {
  return OBSERVABILITY_ADAPTER_DEFINITIONS.find((definition) => definition.code === code) ?? null;
}
