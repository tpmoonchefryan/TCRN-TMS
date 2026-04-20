// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

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
  platform: { en: 'Platform', zh: '平台', ja: 'プラットフォーム' },
  organization: { en: 'Organization', zh: '组织管理', ja: '組織管理' },
  user: { en: 'User Access', zh: '用户与角色', ja: 'ユーザーと権限' },
  customer: { en: 'Customer', zh: '客户管理', ja: '顧客管理' },
  config: { en: 'Configuration', zh: '配置管理', ja: '設定管理' },
  external: { en: 'Content', zh: '内容管理', ja: 'コンテンツ管理' },
  report: { en: 'Reports', zh: '报表管理', ja: 'レポート管理' },
  integration: { en: 'Integration', zh: '集成管理', ja: '連携管理' },
  security: { en: 'Security', zh: '安全管理', ja: 'セキュリティ管理' },
  log: { en: 'Logs', zh: '日志审计', ja: 'ログ監査' },
  compliance: { en: 'Compliance', zh: '合规', ja: 'コンプライアンス' },
  email: { en: 'Email', zh: '邮件模板', ja: 'メールテンプレート' },
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
  nameEn: string;
  nameZh: string;
  nameJa: string;
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
  resource('tenant.manage', 'platform', { nameEn: 'Tenant Management', nameZh: '租户管理', nameJa: 'テナント管理' }, RBAC_CANONICAL_ACTIONS, 10),

  resource('subsidiary', 'organization', { nameEn: 'Subsidiary', nameZh: '分级目录', nameJa: '組織' }, ['read', 'write', 'delete', 'admin'], 20),
  resource('talent', 'organization', { nameEn: 'Talent', nameZh: '艺人', nameJa: 'タレント' }, ['read', 'write', 'delete', 'admin'], 30),

  resource('system_user', 'user', { nameEn: 'System User', nameZh: '系统用户', nameJa: 'システムユーザー' }, ['read', 'write', 'delete', 'admin'], 40),
  resource('role', 'user', { nameEn: 'Role', nameZh: '角色', nameJa: 'ロール' }, ['read', 'write', 'delete', 'admin'], 50),

  resource('customer.profile', 'customer', { nameEn: 'Customer Profile', nameZh: '客户档案', nameJa: '顧客プロファイル' }, ['read', 'write', 'delete', 'admin'], 60),
  resource('customer.pii', 'customer', { nameEn: 'Customer PII', nameZh: '客户敏感信息', nameJa: '顧客PII' }, ['read', 'write', 'admin'], 70),
  resource('customer.membership', 'customer', { nameEn: 'Customer Membership', nameZh: '会员记录', nameJa: 'メンバーシップ' }, ['read', 'write', 'admin'], 80),
  resource('customer.import', 'customer', { nameEn: 'Customer Import', nameZh: '客户导入', nameJa: '顧客インポート' }, ['read', 'write', 'delete', 'admin'], 90),
  resource('customer.export', 'customer', { nameEn: 'Customer Export', nameZh: '客户导出', nameJa: '顧客エクスポート' }, ['read', 'write', 'delete', 'admin'], 100),

  resource('config.pii_service', 'config', { nameEn: 'PII Service Config', nameZh: 'PII服务配置', nameJa: 'PIIサービス設定' }, ['read', 'write', 'admin'], 110),
  resource('config.profile_store', 'config', { nameEn: 'Profile Store', nameZh: '档案存储', nameJa: 'プロファイルストア' }, ['read', 'write', 'admin'], 120),
  resource('config.dictionary', 'config', { nameEn: 'Config Dictionary', nameZh: '配置字典', nameJa: '設定辞書' }, ['read', 'write', 'admin'], 130),
  resource('config.customer_status', 'config', { nameEn: 'Customer Status Config', nameZh: '客户状态配置', nameJa: '顧客ステータス設定' }, ['read', 'write', 'admin'], 140),
  resource('config.membership', 'config', { nameEn: 'Membership Config', nameZh: '会员配置', nameJa: 'メンバーシップ設定' }, ['read', 'write', 'admin'], 150),
  resource('config.platform_registry', 'config', { nameEn: 'Platform Registry', nameZh: '平台注册表', nameJa: 'プラットフォームレジストリ' }, ['read', 'write', 'admin'], 160),
  resource('config.platform_settings', 'config', { nameEn: 'Platform Settings', nameZh: '平台设置', nameJa: 'プラットフォーム設定' }, ['read', 'write', 'admin'], 170),

  resource('talent.homepage', 'external', { nameEn: 'Homepage', nameZh: '个人主页', nameJa: 'ホームページ' }, ['read', 'write', 'admin'], 180),
  resource('talent.marshmallow', 'external', { nameEn: 'Marshmallow', nameZh: '棉花糖', nameJa: 'マシュマロ' }, ['read', 'write', 'execute', 'admin'], 190),

  resource('report.mfr', 'report', { nameEn: 'MFR Report', nameZh: 'MFR报表', nameJa: 'MFRレポート' }, ['read', 'execute', 'admin'], 200),

  resource('integration.adapter', 'integration', { nameEn: 'Integration Adapter', nameZh: '集成适配器', nameJa: '連携アダプター' }, ['read', 'write', 'delete', 'admin'], 210),
  resource('integration.webhook', 'integration', { nameEn: 'Webhook', nameZh: 'Webhook', nameJa: 'Webhook' }, ['read', 'write', 'delete', 'admin'], 220),
  resource('integration.consumer', 'integration', { nameEn: 'API Consumer', nameZh: 'API消费者', nameJa: 'APIコンシューマー' }, ['read', 'write', 'delete', 'admin'], 230),

  resource('security.blocklist', 'security', { nameEn: 'Blocklist', nameZh: '屏蔽词', nameJa: 'ブロックリスト' }, ['read', 'write', 'delete', 'admin'], 240),
  resource('security.ip_rules', 'security', { nameEn: 'IP Rules', nameZh: 'IP规则', nameJa: 'IPルール' }, ['read', 'write', 'delete', 'admin'], 250),
  resource('security.external_blocklist', 'security', { nameEn: 'External Blocklist', nameZh: '外部屏蔽名单', nameJa: '外部ブロックリスト' }, ['read', 'write', 'delete', 'admin'], 260),

  resource('log.change_log', 'log', { nameEn: 'Change Log', nameZh: '变更日志', nameJa: '変更ログ' }, ['read'], 270),
  resource('log.integration_log', 'log', { nameEn: 'Integration Log', nameZh: '集成日志', nameJa: '連携ログ' }, ['read'], 280),
  resource('log.search', 'log', { nameEn: 'Log Search', nameZh: '日志搜索', nameJa: 'ログ検索' }, ['read'], 290),
  resource('log.tech_log', 'log', { nameEn: 'Tech Event Log', nameZh: '技术事件日志', nameJa: '技術イベントログ' }, ['read'], 300),

  resource('compliance.report', 'compliance', { nameEn: 'Compliance Report', nameZh: '合规报表', nameJa: 'コンプライアンスレポート' }, ['read'], 310),
  resource('email.template', 'email', { nameEn: 'Email Template', nameZh: '邮件模板', nameJa: 'メールテンプレート' }, ['read', 'write', 'delete', 'admin'], 320),
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
    'talent.homepage',
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
      !definition.code.startsWith('security.'),
  )
  .map((definition) => permission(definition.code, ['read']));

export const RBAC_ROLE_TEMPLATES: readonly RbacRoleTemplate[] = [
  {
    code: 'PLATFORM_ADMIN',
    nameEn: 'Platform Administrator',
    nameZh: '平台管理员',
    nameJa: 'プラットフォーム管理者',
    description: 'AC tenant administrator with platform-wide access',
    isSystem: true,
    permissions: allActionsFor(...RBAC_RESOURCES.map((definition) => definition.code)),
  },
  {
    code: 'ADMIN',
    nameEn: 'Administrator',
    nameZh: '管理员',
    nameJa: '管理者',
    description: 'Full access within assigned scope (tenant/subsidiary/talent)',
    isSystem: true,
    permissions: adminPermissions,
  },
  {
    code: 'TENANT_ADMIN',
    nameEn: 'Tenant Administrator',
    nameZh: '租户管理员',
    nameJa: 'テナント管理者',
    description: 'Compatibility alias for ADMIN during RBAC contract migration',
    isSystem: true,
    aliasOf: 'ADMIN',
    permissions: adminPermissions,
  },
  {
    code: 'TALENT_MANAGER',
    nameEn: 'Talent Manager',
    nameZh: '艺人经理',
    nameJa: 'タレントマネージャー',
    description: 'Manage talent operations, organization structure, and scoped user assignments',
    isSystem: false,
    permissions: [
      ...allActionsFor('subsidiary', 'talent'),
      permission('system_user', ['read', 'write', 'admin']),
      permission('role', ['read', 'write', 'admin']),
      permission('config.customer_status', ['read']),
      permission('config.membership', ['read']),
      permission('config.platform_settings', ['read']),
      permission('integration.consumer', ['read']),
      permission('log.change_log', ['read']),
    ],
  },
  {
    code: 'CONTENT_MANAGER',
    nameEn: 'Content Manager',
    nameZh: '内容管理员',
    nameJa: 'コンテンツマネージャー',
    description: 'Homepage, marshmallow, and moderation content management',
    isSystem: false,
    permissions: [
      ...allActionsFor('talent.homepage', 'talent.marshmallow', 'security.external_blocklist'),
      permission('config.platform_settings', ['read']),
      permission('log.change_log', ['read']),
    ],
  },
  {
    code: 'CUSTOMER_MANAGER',
    nameEn: 'Customer Manager',
    nameZh: '客户经理',
    nameJa: '顧客マネージャー',
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
    nameEn: 'Viewer',
    nameZh: '只读访问者',
    nameJa: '閲覧者',
    description: 'Read-only access to non-sensitive resources within assigned scope',
    isSystem: false,
    permissions: [
      ...viewerReadableResources,
      permission('customer.pii', ['read'], 'deny'),
    ],
  },
  {
    code: 'INTEGRATION_MANAGER',
    nameEn: 'Integration Manager',
    nameZh: '集成管理员',
    nameJa: '連携マネージャー',
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
