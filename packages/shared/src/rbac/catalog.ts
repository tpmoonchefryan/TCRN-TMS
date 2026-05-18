// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { LocalizedText } from '../constants/locale';

export const RBAC_CANONICAL_ACTIONS = [
  'read',
  'write',
  'delete',
  'execute',
  'admin',
] as const;

export type PermissionAction = (typeof RBAC_CANONICAL_ACTIONS)[number];

export const RBAC_ACTION_ALIASES = {
  create: 'write',
  update: 'write',
  export: 'execute',
} as const satisfies Record<string, PermissionAction>;

export type PermissionActionAlias = keyof typeof RBAC_ACTION_ALIASES;
export type PermissionActionInput = PermissionAction | PermissionActionAlias;

export const RBAC_ACTION_INPUTS = [
  'read',
  'write',
  'delete',
  'execute',
  'admin',
  'create',
  'update',
  'export',
] as const satisfies readonly PermissionActionInput[];

export const RBAC_MODULE_LABELS = {
  platform: { en: 'Platform', zh_HANS: '平台', zh_HANT: '平台', ja: 'プラットフォーム', ko: 'Platform', fr: 'Platform' },
  organization: { en: 'Organization', zh_HANS: '组织管理', zh_HANT: '组织管理', ja: '組織管理', ko: 'Organization', fr: 'Organization' },
  user: { en: 'User Access', zh_HANS: '用户与角色', zh_HANT: '用户与角色', ja: 'ユーザーと権限', ko: 'User Access', fr: 'User Access' },
  customer: { en: 'Customer', zh_HANS: '客户管理', zh_HANT: '客户管理', ja: '顧客管理', ko: 'Customer', fr: 'Customer' },
  config: { en: 'Configuration', zh_HANS: '配置管理', zh_HANT: '配置管理', ja: '設定管理', ko: 'Configuration', fr: 'Configuration' },
  external: { en: 'Content', zh_HANS: '内容管理', zh_HANT: '内容管理', ja: 'コンテンツ管理', ko: 'Content', fr: 'Content' },
  report: { en: 'Reports', zh_HANS: '报表管理', zh_HANT: '报表管理', ja: 'レポート管理', ko: 'Reports', fr: 'Reports' },
  integration: { en: 'Integration', zh_HANS: '集成管理', zh_HANT: '集成管理', ja: '連携管理', ko: 'Integration', fr: 'Integration' },
  security: { en: 'Security', zh_HANS: '安全管理', zh_HANT: '安全管理', ja: 'セキュリティ管理', ko: 'Security', fr: 'Security' },
  log: { en: 'Logs', zh_HANS: '日志审计', zh_HANT: '日志审计', ja: 'ログ監査', ko: 'Logs', fr: 'Logs' },
  compliance: { en: 'Compliance', zh_HANS: '合规', zh_HANT: '合规', ja: 'コンプライアンス', ko: 'Compliance', fr: 'Compliance' },
  email: { en: 'Email', zh_HANS: '邮件模板', zh_HANT: '邮件模板', ja: 'メールテンプレート', ko: 'Email', fr: 'Email' },
} as const;

export type RbacModuleCode = keyof typeof RBAC_MODULE_LABELS;
export const RBAC_ROLE_POLICY_EFFECTS = [
  'grant',
  'deny',
] as const;

export type RbacRolePolicyEffect = (typeof RBAC_ROLE_POLICY_EFFECTS)[number];
export type RbacTenantTier = 'ac' | 'standard';
export type RbacRoleScopeType = 'tenant' | 'subsidiary' | 'talent';

interface LocalizedLabel {
  name: LocalizedText;
}

export interface RbacResourceDefinition extends LocalizedLabel {
  code: string;
  module: RbacModuleCode;
  supportedActions: readonly PermissionAction[];
  sortOrder: number;
}

export interface RbacPolicyDefinition {
  resourceCode: string;
  action: PermissionAction;
}

export interface RbacRolePermissionTemplate {
  resourceCode: string;
  actions: readonly PermissionAction[];
  effect?: RbacRolePolicyEffect;
}

export interface RbacRoleTemplate extends LocalizedLabel {
  code: string;
  description: string;
  isSystem: boolean;
  permissions: readonly RbacRolePermissionTemplate[];
  aliasOf?: string;
}

export interface RbacRoleWorkspaceAvailability {
  tenantTiers: readonly RbacTenantTier[];
  scopeTypes: readonly RbacRoleScopeType[];
}

const resource = <
  const TCode extends string,
  const TSupportedActions extends readonly PermissionAction[],
>(
  code: TCode,
  module: RbacModuleCode,
  names: LocalizedLabel,
  supportedActions: TSupportedActions,
  sortOrder: number,
): RbacResourceDefinition & { code: TCode; supportedActions: TSupportedActions } => ({
  code,
  module,
  ...names,
  supportedActions,
  sortOrder,
});

export const RBAC_RESOURCES = [
  resource('tenant.manage', 'platform', { name: { en: 'Tenant Management', zh_HANS: '租户管理', zh_HANT: '租户管理', ja: 'テナント管理', ko: 'Tenant Management', fr: 'Tenant Management' } }, RBAC_CANONICAL_ACTIONS, 10),

  resource('subsidiary', 'organization', { name: { en: 'Subsidiary', zh_HANS: '分级目录', zh_HANT: '分级目录', ja: '組織', ko: 'Subsidiary', fr: 'Subsidiary' } }, ['read', 'write', 'delete', 'admin'], 20),
  resource('talent', 'organization', { name: { en: 'Talent', zh_HANS: '艺人', zh_HANT: '艺人', ja: 'タレント', ko: 'Talent', fr: 'Talent' } }, ['read', 'write', 'delete', 'admin'], 30),

  resource('system_user', 'user', { name: { en: 'System User', zh_HANS: '系统用户', zh_HANT: '系统用户', ja: 'システムユーザー', ko: 'System User', fr: 'System User' } }, ['read', 'write', 'delete', 'admin'], 40),
  resource('role', 'user', { name: { en: 'Role', zh_HANS: '角色', zh_HANT: '角色', ja: 'ロール', ko: 'Role', fr: 'Role' } }, ['read', 'write', 'delete', 'admin'], 50),

  resource('customer.profile', 'customer', { name: { en: 'Customer Profile', zh_HANS: '客户档案', zh_HANT: '客户档案', ja: '顧客プロファイル', ko: 'Customer Profile', fr: 'Customer Profile' } }, ['read', 'write', 'delete', 'admin'], 60),
  resource('customer.pii', 'customer', { name: { en: 'Customer PII', zh_HANS: '客户敏感信息', zh_HANT: '客户敏感信息', ja: '顧客PII', ko: 'Customer PII', fr: 'Customer PII' } }, ['read', 'write', 'admin'], 70),
  resource('customer.membership', 'customer', { name: { en: 'Customer Membership', zh_HANS: '会员记录', zh_HANT: '会员记录', ja: 'メンバーシップ', ko: 'Customer Membership', fr: 'Customer Membership' } }, ['read', 'write', 'admin'], 80),
  resource('customer.import', 'customer', { name: { en: 'Customer Import', zh_HANS: '客户导入', zh_HANT: '客户导入', ja: '顧客インポート', ko: 'Customer Import', fr: 'Customer Import' } }, ['read', 'write', 'delete', 'admin'], 90),
  resource('customer.export', 'customer', { name: { en: 'Customer Export', zh_HANS: '客户导出', zh_HANT: '客户导出', ja: '顧客エクスポート', ko: 'Customer Export', fr: 'Customer Export' } }, ['read', 'write', 'delete', 'admin'], 100),

  resource('config.pii_service', 'config', { name: { en: 'PII Service Config', zh_HANS: 'PII服务配置', zh_HANT: 'PII服务配置', ja: 'PIIサービス設定', ko: 'PII Service Config', fr: 'PII Service Config' } }, ['read', 'write', 'admin'], 110),
  resource('config.profile_store', 'config', { name: { en: 'Profile Store', zh_HANS: '档案存储', zh_HANT: '档案存储', ja: 'プロファイルストア', ko: 'Profile Store', fr: 'Profile Store' } }, ['read', 'write', 'admin'], 120),
  resource('config.dictionary', 'config', { name: { en: 'Config Dictionary', zh_HANS: '配置字典', zh_HANT: '配置字典', ja: '設定辞書', ko: 'Config Dictionary', fr: 'Config Dictionary' } }, ['read', 'write', 'admin'], 130),
  resource('config.customer_status', 'config', { name: { en: 'Customer Status Config', zh_HANS: '客户状态配置', zh_HANT: '客户状态配置', ja: '顧客ステータス設定', ko: 'Customer Status Config', fr: 'Customer Status Config' } }, ['read', 'write', 'admin'], 140),
  resource('config.membership', 'config', { name: { en: 'Membership Config', zh_HANS: '会员配置', zh_HANT: '会员配置', ja: 'メンバーシップ設定', ko: 'Membership Config', fr: 'Membership Config' } }, ['read', 'write', 'admin'], 150),
  resource('config.platform_registry', 'config', { name: { en: 'Platform Registry', zh_HANS: '平台注册表', zh_HANT: '平台注册表', ja: 'プラットフォームレジストリ', ko: 'Platform Registry', fr: 'Platform Registry' } }, ['read', 'write', 'admin'], 160),
  resource('config.platform_settings', 'config', { name: { en: 'Platform Settings', zh_HANS: '平台设置', zh_HANT: '平台设置', ja: 'プラットフォーム設定', ko: 'Platform Settings', fr: 'Platform Settings' } }, ['read', 'write', 'admin'], 170),
  resource('settings', 'config', { name: { en: 'Settings', zh_HANS: '设置', zh_HANT: '设置', ja: '設定', ko: 'Settings', fr: 'Settings' } }, ['read', 'write', 'admin'], 175),

  resource('talent.homepage', 'external', { name: { en: 'Homepage', zh_HANS: '个人主页', zh_HANT: '个人主页', ja: 'ホームページ', ko: 'Homepage', fr: 'Homepage' } }, ['read', 'write', 'admin'], 180),
  resource('public_presence.document', 'external', { name: { en: 'Public Presence Document', zh_HANS: 'Public Presence 文档', zh_HANT: 'Public Presence 文档', ja: 'パブリックプレゼンス文書', ko: 'Public Presence Document', fr: 'Public Presence Document' } }, ['read', 'write', 'admin'], 182),
  resource('public_presence.review', 'external', { name: { en: 'Public Presence Review', zh_HANS: 'Public Presence 审核', zh_HANT: 'Public Presence 审核', ja: 'パブリックプレゼンスレビュー', ko: 'Public Presence Review', fr: 'Public Presence Review' } }, ['read', 'write', 'execute', 'admin'], 184),
  resource('public_presence.publish', 'external', { name: { en: 'Public Presence Publish', zh_HANS: 'Public Presence 发布', zh_HANT: 'Public Presence 发布', ja: 'パブリックプレゼンス公開', ko: 'Public Presence Publish', fr: 'Public Presence Publish' } }, ['write', 'execute', 'admin'], 186),
  resource('public_presence.rollback', 'external', { name: { en: 'Public Presence Rollback', zh_HANS: 'Public Presence 回滚', zh_HANT: 'Public Presence 回滚', ja: 'パブリックプレゼンスロールバック', ko: 'Public Presence Rollback', fr: 'Public Presence Rollback' } }, ['write', 'execute', 'admin'], 188),
  resource('public_presence.validation', 'external', { name: { en: 'Public Presence Validation', zh_HANS: 'Public Presence 校验', zh_HANT: 'Public Presence 校验', ja: 'パブリックプレゼンス検証', ko: 'Public Presence Validation', fr: 'Public Presence Validation' } }, ['read', 'write', 'execute', 'admin'], 190),
  resource('public_presence.audit', 'external', { name: { en: 'Public Presence Audit', zh_HANS: 'Public Presence 审计', zh_HANT: 'Public Presence 审计', ja: 'パブリックプレゼンス監査', ko: 'Public Presence Audit', fr: 'Public Presence Audit' } }, ['read', 'admin'], 192),
  resource('public_presence.ai_patch', 'external', { name: { en: 'Public Presence AI Patch', zh_HANS: 'Public Presence AI 修补', zh_HANT: 'Public Presence AI 修补', ja: 'パブリックプレゼンスAIパッチ', ko: 'Public Presence AI Patch', fr: 'Public Presence AI Patch' } }, ['execute', 'admin'], 194),
  resource('talent.marshmallow', 'external', { name: { en: 'Marshmallow', zh_HANS: '棉花糖', zh_HANT: '棉花糖', ja: 'マシュマロ', ko: 'Marshmallow', fr: 'Marshmallow' } }, ['read', 'write', 'execute', 'admin'], 196),

  resource('report.mfr', 'report', { name: { en: 'MFR Report', zh_HANS: 'MFR报表', zh_HANT: 'MFR报表', ja: 'MFRレポート', ko: 'MFR Report', fr: 'MFR Report' } }, ['read', 'execute', 'admin'], 200),

  resource('integration.adapter', 'integration', { name: { en: 'Integration Adapter', zh_HANS: '集成适配器', zh_HANT: '集成适配器', ja: '連携アダプター', ko: 'Integration Adapter', fr: 'Integration Adapter' } }, ['read', 'write', 'delete', 'admin'], 210),
  resource('integration.webhook', 'integration', { name: { en: 'Webhook', zh_HANS: 'Webhook', zh_HANT: 'Webhook', ja: 'Webhook', ko: 'Webhook', fr: 'Webhook' } }, ['read', 'write', 'delete', 'admin'], 220),
  resource('integration.consumer', 'integration', { name: { en: 'API Consumer', zh_HANS: 'API消费者', zh_HANT: 'API消费者', ja: 'APIコンシューマー', ko: 'API Consumer', fr: 'API Consumer' } }, ['read', 'write', 'delete', 'admin'], 230),

  resource('security.blocklist', 'security', { name: { en: 'Blocklist', zh_HANS: '屏蔽词', zh_HANT: '屏蔽词', ja: 'ブロックリスト', ko: 'Blocklist', fr: 'Blocklist' } }, ['read', 'write', 'delete', 'admin'], 240),
  resource('security.ip_rules', 'security', { name: { en: 'IP Rules', zh_HANS: 'IP规则', zh_HANT: 'IP规则', ja: 'IPルール', ko: 'IP Rules', fr: 'IP Rules' } }, ['read', 'write', 'delete', 'admin'], 250),
  resource('security.external_blocklist', 'security', { name: { en: 'External Blocklist', zh_HANS: '外部屏蔽名单', zh_HANT: '外部屏蔽名单', ja: '外部ブロックリスト', ko: 'External Blocklist', fr: 'External Blocklist' } }, ['read', 'write', 'delete', 'admin'], 260),

  resource('log.change_log', 'log', { name: { en: 'Change Log', zh_HANS: '变更日志', zh_HANT: '变更日志', ja: '変更ログ', ko: 'Change Log', fr: 'Change Log' } }, ['read'], 270),
  resource('log.integration_log', 'log', { name: { en: 'Integration Log', zh_HANS: '集成日志', zh_HANT: '集成日志', ja: '連携ログ', ko: 'Integration Log', fr: 'Integration Log' } }, ['read'], 280),
  resource('log.search', 'log', { name: { en: 'Log Search', zh_HANS: '日志搜索', zh_HANT: '日志搜索', ja: 'ログ検索', ko: 'Log Search', fr: 'Log Search' } }, ['read'], 290),
  resource('log.tech_log', 'log', { name: { en: 'Tech Event Log', zh_HANS: '技术事件日志', zh_HANT: '技术事件日志', ja: '技術イベントログ', ko: 'Tech Event Log', fr: 'Tech Event Log' } }, ['read'], 300),

  resource('compliance.report', 'compliance', { name: { en: 'Compliance Report', zh_HANS: '合规报表', zh_HANT: '合规报表', ja: 'コンプライアンスレポート', ko: 'Compliance Report', fr: 'Compliance Report' } }, ['read'], 310),
  resource('email.template', 'email', { name: { en: 'Email Template', zh_HANS: '邮件模板', zh_HANT: '邮件模板', ja: 'メールテンプレート', ko: 'Email Template', fr: 'Email Template' } }, ['read', 'write', 'delete', 'admin'], 320),
] as const satisfies readonly RbacResourceDefinition[];

export type RbacResourceCode = (typeof RBAC_RESOURCES)[number]['code'];
export const RBAC_RESOURCE_CODES = RBAC_RESOURCES.map((definition) => definition.code) as [
  RbacResourceCode,
  ...RbacResourceCode[],
];

export const RBAC_RESOURCE_MAP: ReadonlyMap<RbacResourceCode, (typeof RBAC_RESOURCES)[number]> = new Map(
  RBAC_RESOURCES.map((definition) => [definition.code, definition]),
);

export function getRbacResourceDefinition(resourceCode: string): (typeof RBAC_RESOURCES)[number] | undefined {
  if (!RBAC_RESOURCE_MAP.has(resourceCode as RbacResourceCode)) {
    return undefined;
  }

  return RBAC_RESOURCE_MAP.get(resourceCode as RbacResourceCode);
}

export function getRbacResourceActions(resourceCode: string): readonly PermissionAction[] {
  const definition = getRbacResourceDefinition(resourceCode);

  if (!definition) {
    throw new Error(`Unknown RBAC resource code: ${resourceCode}`);
  }

  return definition.supportedActions;
}

const permission = (
  resourceCode: RbacResourceCode,
  actions: readonly PermissionAction[],
  effect: RbacRolePolicyEffect = 'grant',
): RbacRolePermissionTemplate => ({
  resourceCode,
  actions,
  effect,
});

const allActionsFor = (...resourceCodes: RbacResourceCode[]): RbacRolePermissionTemplate[] =>
  resourceCodes.map((resourceCode) =>
    permission(resourceCode, getRbacResourceActions(resourceCode)),
  );

const adminPermissions = [
  ...allActionsFor(
    'subsidiary',
    'talent',
    'system_user',
    'role',
    'customer.profile',
    'customer.pii',
    'customer.membership',
    'customer.import',
    'customer.export',
    'config.pii_service',
    'config.profile_store',
    'config.dictionary',
    'config.customer_status',
    'config.membership',
    'config.platform_registry',
    'config.platform_settings',
    'settings',
    'talent.homepage',
    'public_presence.document',
    'public_presence.review',
    'public_presence.publish',
    'public_presence.rollback',
    'public_presence.validation',
    'public_presence.audit',
    'public_presence.ai_patch',
    'talent.marshmallow',
    'report.mfr',
    'integration.adapter',
    'integration.webhook',
    'integration.consumer',
    'security.blocklist',
    'security.ip_rules',
    'security.external_blocklist',
    'log.change_log',
    'log.integration_log',
    'log.search',
    'log.tech_log',
    'compliance.report',
    'email.template',
  ),
] as const;

const viewerReadableResources = RBAC_RESOURCES
  .filter(
    (definition) =>
      definition.supportedActions.includes('read') &&
      definition.code !== 'tenant.manage' &&
      definition.code !== 'customer.pii' &&
      definition.code !== 'public_presence.audit' &&
      !definition.code.startsWith('security.'),
  )
  .map((definition) => permission(definition.code, ['read']));

export const RBAC_ROLE_TEMPLATES: readonly RbacRoleTemplate[] = [
  {
    code: 'PLATFORM_ADMIN',
    name: { en: 'Platform Administrator', zh_HANS: '平台管理员', zh_HANT: '平台管理员', ja: 'プラットフォーム管理者', ko: 'Platform Administrator', fr: 'Platform Administrator' },
    description: 'AC tenant administrator with platform-wide access',
    isSystem: true,
    permissions: allActionsFor(...RBAC_RESOURCES.map((definition) => definition.code)),
  },
  {
    code: 'ADMIN',
    name: { en: 'Administrator', zh_HANS: '管理员', zh_HANT: '管理员', ja: '管理者', ko: 'Administrator', fr: 'Administrator' },
    description: 'Full access within assigned scope (tenant/subsidiary/talent)',
    isSystem: true,
    permissions: adminPermissions,
  },
  {
    code: 'TENANT_ADMIN',
    name: { en: 'Tenant Administrator', zh_HANS: '租户管理员', zh_HANT: '租户管理员', ja: 'テナント管理者', ko: 'Tenant Administrator', fr: 'Tenant Administrator' },
    description: 'Compatibility alias for ADMIN during RBAC contract migration',
    isSystem: true,
    aliasOf: 'ADMIN',
    permissions: adminPermissions,
  },
  {
    code: 'TALENT_MANAGER',
    name: { en: 'Talent Manager', zh_HANS: '艺人经理', zh_HANT: '艺人经理', ja: 'タレントマネージャー', ko: 'Talent Manager', fr: 'Talent Manager' },
    description: 'Manage talent operations, organization structure, and scoped user assignments',
    isSystem: false,
    permissions: [
      ...allActionsFor('subsidiary', 'talent'),
      permission('system_user', ['read', 'write', 'admin']),
      permission('role', ['read', 'write', 'admin']),
      permission('config.customer_status', ['read']),
      permission('config.membership', ['read']),
      permission('config.platform_settings', ['read']),
      permission('settings', ['read']),
      permission('integration.consumer', ['read']),
      permission('log.change_log', ['read']),
    ],
  },
  {
    code: 'CONTENT_MANAGER',
    name: { en: 'Content Manager', zh_HANS: '内容管理员', zh_HANT: '内容管理员', ja: 'コンテンツマネージャー', ko: 'Content Manager', fr: 'Content Manager' },
    description: 'Homepage, marshmallow, and moderation content management',
    isSystem: false,
    permissions: [
      ...allActionsFor('talent.homepage', 'talent.marshmallow', 'security.external_blocklist'),
      permission('public_presence.document', ['read', 'write']),
      permission('public_presence.review', ['read', 'write']),
      permission('public_presence.publish', ['write']),
      permission('public_presence.rollback', ['write']),
      permission('public_presence.validation', ['read', 'write']),
      permission('public_presence.audit', ['read']),
      permission('config.platform_settings', ['read']),
      permission('settings', ['read']),
      permission('log.change_log', ['read']),
    ],
  },
  {
    code: 'CUSTOMER_MANAGER',
    name: { en: 'Customer Manager', zh_HANS: '客户经理', zh_HANT: '客户经理', ja: '顧客マネージャー', ko: 'Customer Manager', fr: 'Customer Manager' },
    description: 'Customer profile, membership, import, export, and PII management',
    isSystem: false,
    permissions: [
      permission('customer.profile', ['read', 'write', 'delete']),
      permission('customer.pii', ['read', 'write']),
      permission('customer.membership', ['read', 'write']),
      permission('customer.import', ['read', 'write', 'delete']),
      permission('customer.export', ['read', 'write', 'delete']),
      permission('config.customer_status', ['read']),
      permission('config.membership', ['read']),
      permission('integration.consumer', ['read']),
      permission('log.change_log', ['read']),
    ],
  },
  {
    code: 'VIEWER',
    name: { en: 'Viewer', zh_HANS: '只读访问者', zh_HANT: '只读访问者', ja: '閲覧者', ko: 'Viewer', fr: 'Viewer' },
    description: 'Read-only access to non-sensitive resources within assigned scope',
    isSystem: false,
    permissions: [
      ...viewerReadableResources,
      permission('customer.pii', ['read'], 'deny'),
    ],
  },
  {
    code: 'INTEGRATION_MANAGER',
    name: { en: 'Integration Manager', zh_HANS: '集成管理员', zh_HANT: '集成管理员', ja: '連携マネージャー', ko: 'Integration Manager', fr: 'Integration Manager' },
    description: 'Integration adapter, webhook, and consumer management',
    isSystem: false,
    permissions: [
      ...allActionsFor('integration.adapter', 'integration.webhook', 'integration.consumer', 'config.platform_registry'),
      permission('log.integration_log', ['read']),
    ],
  },
] as const;

const DEFAULT_ROLE_WORKSPACE_AVAILABILITY: RbacRoleWorkspaceAvailability = {
  tenantTiers: ['ac', 'standard'],
  scopeTypes: ['tenant', 'subsidiary', 'talent'],
};

export const RBAC_ROLE_WORKSPACE_AVAILABILITY: Readonly<Record<string, RbacRoleWorkspaceAvailability>> = {
  PLATFORM_ADMIN: {
    tenantTiers: ['ac'],
    scopeTypes: ['tenant'],
  },
  ADMIN: {
    tenantTiers: ['ac', 'standard'],
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
  },
  TENANT_ADMIN: {
    tenantTiers: ['ac', 'standard'],
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
  },
  TALENT_MANAGER: {
    tenantTiers: ['standard'],
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
  },
  CONTENT_MANAGER: {
    tenantTiers: ['standard'],
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
  },
  CUSTOMER_MANAGER: {
    tenantTiers: ['standard'],
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
  },
  VIEWER: {
    tenantTiers: ['ac', 'standard'],
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
  },
  INTEGRATION_MANAGER: {
    tenantTiers: ['ac', 'standard'],
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
  },
} as const;

export function getRbacRoleWorkspaceAvailability(
  roleCode: string,
): RbacRoleWorkspaceAvailability {
  return RBAC_ROLE_WORKSPACE_AVAILABILITY[roleCode] ?? DEFAULT_ROLE_WORKSPACE_AVAILABILITY;
}

export function isRbacRoleAvailableForTenantTier(
  roleCode: string,
  tenantTier: RbacTenantTier,
): boolean {
  return getRbacRoleWorkspaceAvailability(roleCode).tenantTiers.includes(tenantTier);
}

export function isRbacRoleAvailableForScopeType(
  roleCode: string,
  scopeType: RbacRoleScopeType,
): boolean {
  return getRbacRoleWorkspaceAvailability(roleCode).scopeTypes.includes(scopeType);
}

export const RBAC_POLICY_DEFINITIONS: readonly RbacPolicyDefinition[] = (() => {
  const policies = new Map<string, RbacPolicyDefinition>();

  const addPolicy = (resourceCode: string, action: PermissionAction) => {
    policies.set(`${resourceCode}:${action}`, { resourceCode, action });
  };

  for (const definition of RBAC_RESOURCES) {
    for (const action of definition.supportedActions) {
      addPolicy(definition.code, action);
    }
  }

  for (const role of RBAC_ROLE_TEMPLATES) {
    for (const entry of role.permissions) {
      for (const action of entry.actions) {
        addPolicy(entry.resourceCode, action);
      }
    }
  }

  return Array.from(policies.values()).sort((left, right) => {
    if (left.resourceCode === right.resourceCode) {
      return RBAC_CANONICAL_ACTIONS.indexOf(left.action) - RBAC_CANONICAL_ACTIONS.indexOf(right.action);
    }

    return left.resourceCode.localeCompare(right.resourceCode);
  });
})();

export function normalizePermissionAction<T extends string>(
  action: T,
): T extends PermissionActionInput ? PermissionAction : string {
  return (RBAC_ACTION_ALIASES[action as PermissionActionAlias] ?? action) as
    T extends PermissionActionInput ? PermissionAction : string;
}

export function isCanonicalPermissionAction(action: string): action is PermissionAction {
  return (RBAC_CANONICAL_ACTIONS as readonly string[]).includes(action);
}

export function resolveRbacPermission(
  resourceCode: string,
  action: PermissionActionInput,
): {
  resourceCode: RbacResourceCode;
  checkedAction: PermissionAction;
  supportedActions: readonly PermissionAction[];
} {
  const definition = getRbacResourceDefinition(resourceCode);

  if (!definition) {
    throw new Error(`Unknown RBAC resource code: ${resourceCode}`);
  }

  const checkedAction = normalizePermissionAction(action);

  if (!definition.supportedActions.includes(checkedAction)) {
    throw new Error(
      `Unsupported RBAC permission ${resourceCode}:${action} (checked as ${resourceCode}:${checkedAction}). Supported actions: ${definition.supportedActions.join(', ')}`,
    );
  }

  return {
    resourceCode: definition.code as RbacResourceCode,
    checkedAction,
    supportedActions: definition.supportedActions,
  };
}
