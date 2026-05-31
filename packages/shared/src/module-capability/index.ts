import {
  createLocalizedText,
  pickLocalizedText,
  SUPPORTED_UI_LOCALES,
  type LocalizedText,
  type SupportedUiLocale,
} from '../constants/locale';
import { RBAC_RESOURCES, type PermissionActionInput, type RbacResourceCode } from '../rbac/catalog';

export const MODULE_CAPABILITY_REGISTRY_VERSION = '2026-05-27.phase-1' as const;

export const CAPABILITY_STATUSES = ['active', 'deprecated', 'future'] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

export const CAPABILITY_ASSIGNMENT_SOURCES = ['seed', 'migration', 'ac_manual', 'system'] as const;
export type CapabilityAssignmentSource = (typeof CAPABILITY_ASSIGNMENT_SOURCES)[number];

export const CAPABILITY_SCOPE_TYPES = ['tenant', 'subsidiary', 'talent'] as const;
export type CapabilityScopeType = (typeof CAPABILITY_SCOPE_TYPES)[number];

export interface CapabilityRbacRequirement {
  resourceCode: RbacResourceCode;
  actions: readonly PermissionActionInput[];
}

export interface ModuleDefinition {
  code: string;
  label: LocalizedText;
  description: LocalizedText;
  category: string;
  status: CapabilityStatus;
  sortOrder: number;
  ownerArea: string;
  defaultAssignmentPolicy: 'system' | 'standard_default' | 'manual' | 'future';
  supportedTenantTiers: readonly string[];
  supportedScopes: readonly CapabilityScopeType[];
  requiredCapabilities: readonly string[];
  requiredRbacResources: readonly RbacResourceCode[];
  menuBindings: readonly string[];
  apiBindings: readonly string[];
  settingsBindings: readonly string[];
  documentationGroup: string;
  stability: 'stable' | 'preview' | 'future';
}

export interface CapabilityDefinition {
  code: string;
  moduleCode: string;
  label: LocalizedText;
  description: LocalizedText;
  status: CapabilityStatus;
  assignable: boolean;
  assignmentScope: 'system' | 'ac' | 'tenant';
  runtimeScopes: readonly CapabilityScopeType[];
  dependencies: readonly string[];
  conflicts: readonly string[];
  requiredRbac: readonly CapabilityRbacRequirement[];
  menuBindings: readonly string[];
  apiBindings: readonly string[];
  settingsBindings: readonly string[];
  quotaKeys: readonly string[];
  auditEventTypes: readonly string[];
  migrationAliases: readonly string[];
  defaultEnabledForStandardTenant: boolean;
  sortOrder: number;
}

export interface CapabilityAssignmentInput {
  tenantId: string;
  capabilityCode: string;
  enabled: boolean;
  source: CapabilityAssignmentSource;
  assignedBy?: string | null;
  assignedAt?: string | Date | null;
  updatedBy?: string | null;
  updatedAt?: string | Date | null;
  version?: number;
  note?: string | null;
}

export interface CapabilitySummary {
  enabledCapabilityCodes: string[];
  labels: LocalizedText[];
  displayLabels: string[];
}

export interface EffectiveCapabilitySnapshot {
  tenantId: string;
  scopeType: CapabilityScopeType;
  scopeId: string | null;
  enabledCapabilityCodes: string[];
  disabledReasons: Record<string, string>;
  sourceAssignments: CapabilityAssignmentInput[];
  requiredRbacByCapability: Record<string, readonly CapabilityRbacRequirement[]>;
  registryVersion: string;
  resolvedAt: string;
}

const localized = (value: {
  en: string;
  zh_HANS: string;
  zh_HANT?: string;
  ja: string;
  ko: string;
  fr: string;
}) =>
  createLocalizedText({
    ...value,
    zh_HANT: value.zh_HANT ?? value.zh_HANS,
  });

export const MODULE_DEFINITIONS = [
  {
    code: 'platform',
    label: localized({
      en: 'Platform Control',
      zh_HANS: '平台控制',
      ja: 'プラットフォーム制御',
      ko: 'Platform Control',
      fr: 'Controle plateforme',
    }),
    description: localized({
      en: 'AC-only platform administration and control-plane surfaces.',
      zh_HANS: '仅限 AC 的平台管理与控制平面界面。',
      ja: 'AC 専用のプラットフォーム管理と制御プレーン画面。',
      ko: 'AC 전용 플랫폼 관리 및 제어 평면 화면입니다.',
      fr: 'Surfaces de controle et administration reservees a AC.',
    }),
    category: 'platform',
    status: 'active',
    sortOrder: 10,
    ownerArea: 'AC',
    defaultAssignmentPolicy: 'system',
    supportedTenantTiers: ['ac'],
    supportedScopes: ['tenant'],
    requiredCapabilities: [],
    requiredRbacResources: ['tenant.manage'],
    menuBindings: ['ac.tenant-management', 'ac.system-dictionary'],
    apiBindings: [
      '/api/v1/tenants',
      '/api/v1/module-capabilities/registry',
      '/api/v1/api-registry',
    ],
    settingsBindings: [],
    documentationGroup: 'platform',
    stability: 'stable',
  },
  {
    code: 'core',
    label: localized({
      en: 'Core Workspace',
      zh_HANS: '核心工作区',
      ja: 'コアワークスペース',
      ko: 'Core Workspace',
      fr: 'Espace de travail principal',
    }),
    description: localized({
      en: 'Baseline organization, users, settings, and audit capabilities.',
      zh_HANS: '基础组织、用户、设置与审计能力。',
      ja: '組織、ユーザー、設定、監査の基本機能。',
      ko: '기본 조직, 사용자, 설정 및 감사 기능입니다.',
      fr: 'Capacites de base pour organisation, utilisateurs, reglages et audit.',
    }),
    category: 'core',
    status: 'active',
    sortOrder: 20,
    ownerArea: 'Core',
    defaultAssignmentPolicy: 'system',
    supportedTenantTiers: ['standard', 'enterprise', 'starter'],
    supportedScopes: ['tenant', 'subsidiary', 'talent'],
    requiredCapabilities: [],
    requiredRbacResources: ['tenant.manage', 'system_user', 'role', 'settings'],
    menuBindings: ['tenant.settings', 'tenant.users'],
    apiBindings: ['/api/v1/settings', '/api/v1/system-users'],
    settingsBindings: ['settings'],
    documentationGroup: 'core',
    stability: 'stable',
  },
  {
    code: 'public_presence',
    label: localized({
      en: 'Public Presence',
      zh_HANS: '公开主页',
      ja: '公開プレゼンス',
      ko: 'Public Presence',
      fr: 'Presence publique',
    }),
    description: localized({
      en: 'Homepage management, Studio, assets, preview, and publishing.',
      zh_HANS: '主页管理、Studio、资产、预览与发布。',
      ja: 'ホームページ管理、Studio、アセット、プレビュー、公開。',
      ko: '홈페이지 관리, Studio, 자산, 미리보기 및 게시입니다.',
      fr: 'Gestion de page publique, Studio, actifs, apercu et publication.',
    }),
    category: 'creator',
    status: 'active',
    sortOrder: 30,
    ownerArea: 'Public Presence',
    defaultAssignmentPolicy: 'standard_default',
    supportedTenantTiers: ['standard', 'enterprise', 'starter'],
    supportedScopes: ['tenant', 'subsidiary', 'talent'],
    requiredCapabilities: [],
    requiredRbacResources: ['talent.homepage'],
    menuBindings: ['tenant.homepage', 'talent.homepage'],
    apiBindings: ['/api/v1/homepage', '/api/v1/public-presence-assets'],
    settingsBindings: ['artistLifecycleFlow'],
    documentationGroup: 'public-presence',
    stability: 'stable',
  },
  {
    code: 'marshmallow',
    label: localized({
      en: 'Marshmallow Mailbox',
      zh_HANS: '棉花糖信箱',
      ja: 'マシュマロ受信箱',
      ko: 'Marshmallow Mailbox',
      fr: 'Boite Marshmallow',
    }),
    description: localized({
      en: 'Public inbox, moderation, replies, and export management.',
      zh_HANS: '公开信箱、审核、回复与导出管理。',
      ja: '公開受信箱、モデレーション、返信、エクスポート管理。',
      ko: '공개 받은함, 검수, 답장 및 내보내기 관리입니다.',
      fr: 'Boite publique, moderation, reponses et exports.',
    }),
    category: 'creator',
    status: 'active',
    sortOrder: 40,
    ownerArea: 'Marshmallow',
    defaultAssignmentPolicy: 'standard_default',
    supportedTenantTiers: ['standard', 'enterprise', 'starter'],
    supportedScopes: ['tenant', 'subsidiary', 'talent'],
    requiredCapabilities: [],
    requiredRbacResources: ['talent.marshmallow'],
    menuBindings: ['talent.marshmallow'],
    apiBindings: ['/api/v1/marshmallow'],
    settingsBindings: ['marshmallow'],
    documentationGroup: 'marshmallow',
    stability: 'stable',
  },
  {
    code: 'reports',
    label: localized({
      en: 'Reports',
      zh_HANS: '报表',
      ja: 'レポート',
      ko: 'Reports',
      fr: 'Rapports',
    }),
    description: localized({
      en: 'Managed reports and exports such as MFR.',
      zh_HANS: '托管报表与导出，例如 MFR。',
      ja: 'MFR などの管理レポートとエクスポート。',
      ko: 'MFR 같은 관리형 보고서 및 내보내기입니다.',
      fr: 'Rapports et exports geres comme MFR.',
    }),
    category: 'operations',
    status: 'active',
    sortOrder: 50,
    ownerArea: 'Reports',
    defaultAssignmentPolicy: 'manual',
    supportedTenantTiers: ['standard', 'enterprise', 'starter'],
    supportedScopes: ['tenant'],
    requiredCapabilities: [],
    requiredRbacResources: ['report.mfr'],
    menuBindings: ['tenant.reports'],
    apiBindings: ['/api/v1/reports'],
    settingsBindings: [],
    documentationGroup: 'reports',
    stability: 'stable',
  },
  {
    code: 'integration',
    label: localized({
      en: 'Integrations',
      zh_HANS: '集成',
      ja: '連携',
      ko: 'Integrations',
      fr: 'Integrations',
    }),
    description: localized({
      en: 'Tenant-facing webhooks and interface configuration.',
      zh_HANS: '面向租户的 webhook 与接口配置。',
      ja: 'テナント向け Webhook とインターフェース設定。',
      ko: '테넌트용 webhook 및 인터페이스 설정입니다.',
      fr: 'Webhooks et configuration d interfaces cote tenant.',
    }),
    category: 'operations',
    status: 'active',
    sortOrder: 60,
    ownerArea: 'Integration',
    defaultAssignmentPolicy: 'manual',
    supportedTenantTiers: ['standard', 'enterprise', 'starter'],
    supportedScopes: ['tenant'],
    requiredCapabilities: [],
    requiredRbacResources: ['integration.webhook'],
    menuBindings: ['tenant.webhooks', 'tenant.interface-management'],
    apiBindings: ['/api/v1/webhooks', '/api/v1/integration'],
    settingsBindings: [],
    documentationGroup: 'integration',
    stability: 'stable',
  },
  {
    code: 'observability',
    label: localized({
      en: 'Product Audit',
      zh_HANS: '产品审计',
      ja: 'プロダクト監査',
      ko: 'Product Audit',
      fr: 'Audit produit',
    }),
    description: localized({
      en: 'TMS product logs and audit views, not external dashboards.',
      zh_HANS: 'TMS 产品日志与审计视图，不是外部仪表盘。',
      ja: 'TMS の製品ログと監査ビュー。外部ダッシュボードではありません。',
      ko: '외부 대시보드가 아닌 TMS 제품 로그 및 감사 화면입니다.',
      fr: 'Journaux et vues d audit TMS, pas des tableaux externes.',
    }),
    category: 'operations',
    status: 'active',
    sortOrder: 70,
    ownerArea: 'Observability',
    defaultAssignmentPolicy: 'system',
    supportedTenantTiers: ['standard', 'enterprise', 'starter'],
    supportedScopes: ['tenant'],
    requiredCapabilities: [],
    requiredRbacResources: ['log.change_log'],
    menuBindings: ['tenant.observability'],
    apiBindings: ['/api/v1/logs'],
    settingsBindings: [],
    documentationGroup: 'observability',
    stability: 'stable',
  },
] as const satisfies readonly ModuleDefinition[];

export const CAPABILITY_DEFINITIONS = [
  {
    code: 'platform.ac_management',
    moduleCode: 'platform',
    label: localized({
      en: 'AC Management',
      zh_HANS: 'AC 管理',
      ja: 'AC 管理',
      ko: 'AC Management',
      fr: 'Administration AC',
    }),
    description: localized({
      en: 'Admin Console tenant and platform operator capabilities.',
      zh_HANS: 'Admin Console 租户与平台运营能力。',
      ja: 'Admin Console テナントとプラットフォーム運用機能。',
      ko: 'Admin Console 테넌트 및 플랫폼 운영 기능입니다.',
      fr: 'Capacites Admin Console et operateur plateforme.',
    }),
    status: 'active',
    assignable: false,
    assignmentScope: 'system',
    runtimeScopes: ['tenant'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [{ resourceCode: 'tenant.manage', actions: ['read', 'create', 'update'] }],
    menuBindings: ['ac.tenant-management'],
    apiBindings: ['/api/v1/tenants'],
    settingsBindings: [],
    quotaKeys: [],
    auditEventTypes: ['tenant.capability.changed'],
    migrationAliases: ['tenant_management', 'platform_admin'],
    defaultEnabledForStandardTenant: false,
    sortOrder: 10,
  },
  {
    code: 'core.organization',
    moduleCode: 'core',
    label: localized({
      en: 'Organization',
      zh_HANS: '组织',
      ja: '組織',
      ko: 'Organization',
      fr: 'Organisation',
    }),
    description: localized({
      en: 'Base organization, subsidiary, and talent workspace.',
      zh_HANS: '基础组织、分级目录与艺人工作区。',
      ja: '基本組織、サブ組織、タレントワークスペース。',
      ko: '기본 조직, 하위 조직 및 탤런트 작업 공간입니다.',
      fr: 'Espace organisation, filiales et talents de base.',
    }),
    status: 'active',
    assignable: false,
    assignmentScope: 'system',
    runtimeScopes: ['tenant', 'subsidiary', 'talent'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [{ resourceCode: 'talent', actions: ['read'] }],
    menuBindings: ['tenant.organization'],
    apiBindings: ['/api/v1/talents', '/api/v1/subsidiaries'],
    settingsBindings: [],
    quotaKeys: ['maxTalents', 'maxCustomersPerTalent'],
    auditEventTypes: [],
    migrationAliases: [],
    defaultEnabledForStandardTenant: true,
    sortOrder: 20,
  },
  {
    code: 'core.user_access',
    moduleCode: 'core',
    label: localized({
      en: 'User Access',
      zh_HANS: '用户访问',
      ja: 'ユーザーアクセス',
      ko: 'User Access',
      fr: 'Acces utilisateur',
    }),
    description: localized({
      en: 'Users, roles, permissions, and delegated access.',
      zh_HANS: '用户、角色、权限与委派访问。',
      ja: 'ユーザー、ロール、権限、委任アクセス。',
      ko: '사용자, 역할, 권한 및 위임 접근입니다.',
      fr: 'Utilisateurs, roles, permissions et delegation.',
    }),
    status: 'active',
    assignable: false,
    assignmentScope: 'system',
    runtimeScopes: ['tenant'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [
      { resourceCode: 'system_user', actions: ['read'] },
      { resourceCode: 'role', actions: ['read'] },
    ],
    menuBindings: ['tenant.users', 'tenant.roles'],
    apiBindings: ['/api/v1/system-users', '/api/v1/roles'],
    settingsBindings: [],
    quotaKeys: [],
    auditEventTypes: [],
    migrationAliases: [],
    defaultEnabledForStandardTenant: true,
    sortOrder: 30,
  },
  {
    code: 'core.settings',
    moduleCode: 'core',
    label: localized({
      en: 'Settings',
      zh_HANS: '设置',
      ja: '設定',
      ko: 'Settings',
      fr: 'Reglages',
    }),
    description: localized({
      en: 'Product settings and scoped configuration.',
      zh_HANS: '产品设置与分级配置。',
      ja: 'プロダクト設定とスコープ別設定。',
      ko: '제품 설정 및 범위별 구성입니다.',
      fr: 'Reglages produit et configuration par portee.',
    }),
    status: 'active',
    assignable: false,
    assignmentScope: 'system',
    runtimeScopes: ['tenant', 'subsidiary', 'talent'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [{ resourceCode: 'settings', actions: ['read'] }],
    menuBindings: ['tenant.settings'],
    apiBindings: ['/api/v1/settings'],
    settingsBindings: ['settings'],
    quotaKeys: [],
    auditEventTypes: [],
    migrationAliases: [],
    defaultEnabledForStandardTenant: true,
    sortOrder: 40,
  },
  {
    code: 'public_presence.homepage',
    moduleCode: 'public_presence',
    label: localized({
      en: 'Homepage Studio',
      zh_HANS: '主页 Studio',
      ja: 'ホームページ Studio',
      ko: 'Homepage Studio',
      fr: 'Studio de page publique',
    }),
    description: localized({
      en: 'Homepage Management, Studio, reusable assets, preview, and publish.',
      zh_HANS: '主页管理、Studio、可复用资产、预览与发布。',
      ja: 'ホームページ管理、Studio、再利用アセット、プレビュー、公開。',
      ko: '홈페이지 관리, Studio, 재사용 자산, 미리보기 및 게시입니다.',
      fr: 'Gestion, Studio, actifs reutilisables, apercu et publication.',
    }),
    status: 'active',
    assignable: true,
    assignmentScope: 'tenant',
    runtimeScopes: ['tenant', 'subsidiary', 'talent'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [{ resourceCode: 'talent.homepage', actions: ['read', 'update'] }],
    menuBindings: ['talent.homepage', 'tenant.public-presence'],
    apiBindings: ['/api/v1/homepage', '/api/v1/public-presence-assets'],
    settingsBindings: ['artistLifecycleFlow'],
    quotaKeys: [],
    auditEventTypes: ['tenant.capability.changed'],
    migrationAliases: ['homepage'],
    defaultEnabledForStandardTenant: true,
    sortOrder: 50,
  },
  {
    code: 'marshmallow.mailbox',
    moduleCode: 'marshmallow',
    label: localized({
      en: 'Marshmallow Mailbox',
      zh_HANS: '棉花糖信箱',
      ja: 'マシュマロ受信箱',
      ko: 'Marshmallow Mailbox',
      fr: 'Boite Marshmallow',
    }),
    description: localized({
      en: 'Mailbox configuration, moderation, replies, and exports.',
      zh_HANS: '信箱配置、审核、回复与导出。',
      ja: '受信箱設定、モデレーション、返信、エクスポート。',
      ko: '메일함 설정, 검수, 답장 및 내보내기입니다.',
      fr: 'Configuration, moderation, reponses et exports.',
    }),
    status: 'active',
    assignable: true,
    assignmentScope: 'tenant',
    runtimeScopes: ['tenant', 'subsidiary', 'talent'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [{ resourceCode: 'talent.marshmallow', actions: ['read', 'update'] }],
    menuBindings: ['talent.marshmallow'],
    apiBindings: ['/api/v1/marshmallow'],
    settingsBindings: ['marshmallow'],
    quotaKeys: [],
    auditEventTypes: ['tenant.capability.changed'],
    migrationAliases: ['marshmallow'],
    defaultEnabledForStandardTenant: true,
    sortOrder: 60,
  },
  {
    code: 'reports.mfr',
    moduleCode: 'reports',
    label: localized({
      en: 'MFR Reports',
      zh_HANS: 'MFR 报表',
      ja: 'MFR レポート',
      ko: 'MFR Reports',
      fr: 'Rapports MFR',
    }),
    description: localized({
      en: 'Managed report catalog and exports.',
      zh_HANS: '托管报表目录与导出。',
      ja: '管理レポートカタログとエクスポート。',
      ko: '관리형 보고서 카탈로그 및 내보내기입니다.',
      fr: 'Catalogue de rapports et exports geres.',
    }),
    status: 'active',
    assignable: true,
    assignmentScope: 'tenant',
    runtimeScopes: ['tenant'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [{ resourceCode: 'report.mfr', actions: ['read', 'export'] }],
    menuBindings: ['tenant.reports'],
    apiBindings: ['/api/v1/reports'],
    settingsBindings: [],
    quotaKeys: [],
    auditEventTypes: ['tenant.capability.changed'],
    migrationAliases: ['advancedReports'],
    defaultEnabledForStandardTenant: false,
    sortOrder: 70,
  },
  {
    code: 'integration.webhooks',
    moduleCode: 'integration',
    label: localized({
      en: 'Tenant Webhooks',
      zh_HANS: '租户 Webhook',
      ja: 'テナント Webhook',
      ko: 'Tenant Webhooks',
      fr: 'Webhooks tenant',
    }),
    description: localized({
      en: 'Tenant-facing webhooks and interface-management settings.',
      zh_HANS: '面向租户的 webhook 与接口管理设置。',
      ja: 'テナント向け Webhook とインターフェース管理設定。',
      ko: '테넌트용 webhook 및 인터페이스 관리 설정입니다.',
      fr: 'Webhooks tenant et reglages d interface.',
    }),
    status: 'active',
    assignable: true,
    assignmentScope: 'tenant',
    runtimeScopes: ['tenant'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [{ resourceCode: 'integration.webhook', actions: ['read', 'update'] }],
    menuBindings: ['tenant.webhooks', 'tenant.interface-management'],
    apiBindings: ['/api/v1/integration'],
    settingsBindings: [],
    quotaKeys: [],
    auditEventTypes: ['tenant.capability.changed'],
    migrationAliases: ['apiIntegration', 'webhooks'],
    defaultEnabledForStandardTenant: false,
    sortOrder: 80,
  },
  {
    code: 'observability.product_audit',
    moduleCode: 'observability',
    label: localized({
      en: 'Product Audit',
      zh_HANS: '产品审计',
      ja: 'プロダクト監査',
      ko: 'Product Audit',
      fr: 'Audit produit',
    }),
    description: localized({
      en: 'Current TMS product audit and change-log visibility.',
      zh_HANS: '当前 TMS 产品审计与变更日志可见性。',
      ja: '現在の TMS 製品監査と変更ログの表示。',
      ko: '현재 TMS 제품 감사 및 변경 로그 보기입니다.',
      fr: 'Audit produit TMS actuel et journaux de changement.',
    }),
    status: 'active',
    assignable: false,
    assignmentScope: 'system',
    runtimeScopes: ['tenant'],
    dependencies: [],
    conflicts: [],
    requiredRbac: [{ resourceCode: 'log.change_log', actions: ['read'] }],
    menuBindings: ['tenant.observability'],
    apiBindings: ['/api/v1/logs/change-logs'],
    settingsBindings: [],
    quotaKeys: [],
    auditEventTypes: [],
    migrationAliases: [],
    defaultEnabledForStandardTenant: true,
    sortOrder: 90,
  },
] as const satisfies readonly CapabilityDefinition[];

export type CapabilityCode = (typeof CAPABILITY_DEFINITIONS)[number]['code'];

export const CAPABILITY_BY_CODE: ReadonlyMap<string, CapabilityDefinition> = new Map<
  string,
  CapabilityDefinition
>(CAPABILITY_DEFINITIONS.map((capability) => [capability.code, capability]));

export const ASSIGNABLE_CAPABILITY_CODES = CAPABILITY_DEFINITIONS.filter(
  (capability) => capability.assignable
).map((capability) => capability.code);

export const DEFAULT_STANDARD_TENANT_CAPABILITY_CODES = CAPABILITY_DEFINITIONS.filter(
  (capability) => capability.assignable && capability.defaultEnabledForStandardTenant
).map((capability) => capability.code);

export const MODULE_CAPABILITY_REGISTRY = {
  registryVersion: MODULE_CAPABILITY_REGISTRY_VERSION,
  modules: MODULE_DEFINITIONS,
  capabilities: CAPABILITY_DEFINITIONS,
} as const;

export function getCapabilityDefinition(code: string): CapabilityDefinition | undefined {
  return CAPABILITY_BY_CODE.get(code);
}

export function isAssignableCapabilityCode(code: string): code is CapabilityCode {
  return Boolean(CAPABILITY_BY_CODE.get(code)?.assignable);
}

export function normalizeAssignableCapabilityCodes(codes: readonly string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  const invalid: string[] = [];
  const locked: string[] = [];

  for (const code of codes) {
    const trimmed = code.trim();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    const definition = CAPABILITY_BY_CODE.get(trimmed);

    if (!definition) {
      invalid.push(trimmed);
      continue;
    }

    if (!definition.assignable) {
      locked.push(trimmed);
      continue;
    }

    normalized.push(trimmed);
  }

  normalized.sort(compareCapabilityCodes);

  return {
    enabledCapabilityCodes: normalized,
    invalidCapabilityCodes: invalid,
    nonAssignableCapabilityCodes: locked,
  };
}

export function compareCapabilityCodes(left: string, right: string) {
  const leftDefinition = CAPABILITY_BY_CODE.get(left);
  const rightDefinition = CAPABILITY_BY_CODE.get(right);
  const leftSort = leftDefinition?.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightSort = rightDefinition?.sortOrder ?? Number.MAX_SAFE_INTEGER;

  if (leftSort !== rightSort) {
    return leftSort - rightSort;
  }

  return left.localeCompare(right);
}

export function buildDefaultCapabilityCodesForTenant(tier?: string | null) {
  if (tier === 'ac') {
    return [] as string[];
  }

  return [...DEFAULT_STANDARD_TENANT_CAPABILITY_CODES];
}

export function mapLegacyFeatureSettings(input: unknown, tier?: string | null) {
  const codes = new Set<string>(buildDefaultCapabilityCodesForTenant(tier));
  const unsupported: string[] = [];

  const addAlias = (alias: string, enabled: boolean) => {
    if (!enabled) {
      return;
    }

    const matched = CAPABILITY_DEFINITIONS.find((capability) =>
      (capability.migrationAliases as readonly string[]).includes(alias)
    );

    if (matched?.assignable) {
      codes.add(matched.code);
      return;
    }

    unsupported.push(alias);
  };

  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') {
        addAlias(item, true);
      }
    }
  } else if (input && typeof input === 'object') {
    for (const [key, value] of Object.entries(input)) {
      addAlias(key, value === true);
    }
  }

  return {
    enabledCapabilityCodes: Array.from(codes).sort(compareCapabilityCodes),
    unsupportedLegacyFeatureKeys: unsupported.sort(),
  };
}

export function stripLegacyFeatureSettings(settings: Record<string, unknown> = {}) {
  const { features: _features, ...nextSettings } = settings;
  return nextSettings;
}

export function summarizeCapabilities(
  enabledCapabilityCodes: readonly string[],
  locale?: SupportedUiLocale | string | null
): CapabilitySummary {
  const sortedCodes = [...enabledCapabilityCodes].sort(compareCapabilityCodes);
  const labels = sortedCodes
    .map((code) => CAPABILITY_BY_CODE.get(code)?.label)
    .filter((label): label is LocalizedText => Boolean(label));

  return {
    enabledCapabilityCodes: sortedCodes,
    labels,
    displayLabels: labels.map((label) => pickLocalizedText(label, locale)),
  };
}

export function assertModuleCapabilityRegistry() {
  const moduleCodes = new Set(MODULE_DEFINITIONS.map((module) => module.code));
  const capabilityCodes = new Set<string>();
  const rbacCodes = new Set(RBAC_RESOURCES.map((resource) => resource.code));
  const problems: string[] = [];

  for (const module of MODULE_DEFINITIONS) {
    for (const locale of SUPPORTED_UI_LOCALES) {
      if (!module.label[locale] || !module.description[locale]) {
        problems.push(`module ${module.code} missing localized ${locale} text`);
      }
    }

    for (const resourceCode of module.requiredRbacResources) {
      if (!rbacCodes.has(resourceCode)) {
        problems.push(`module ${module.code} references unknown RBAC resource ${resourceCode}`);
      }
    }
  }

  for (const capability of CAPABILITY_DEFINITIONS) {
    if (capabilityCodes.has(capability.code)) {
      problems.push(`duplicate capability code ${capability.code}`);
    }

    capabilityCodes.add(capability.code);

    if (!moduleCodes.has(capability.moduleCode)) {
      problems.push(
        `capability ${capability.code} references unknown module ${capability.moduleCode}`
      );
    }

    for (const locale of SUPPORTED_UI_LOCALES) {
      if (!capability.label[locale] || !capability.description[locale]) {
        problems.push(`capability ${capability.code} missing localized ${locale} text`);
      }
    }

    for (const dependency of capability.dependencies) {
      if (!CAPABILITY_BY_CODE.has(dependency)) {
        problems.push(`capability ${capability.code} references unknown dependency ${dependency}`);
      }
    }

    for (const rbac of capability.requiredRbac) {
      if (!rbacCodes.has(rbac.resourceCode)) {
        problems.push(
          `capability ${capability.code} references unknown RBAC resource ${rbac.resourceCode}`
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Module capability registry invalid:\n${problems.join('\n')}`);
  }
}
