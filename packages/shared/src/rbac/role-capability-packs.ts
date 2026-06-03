// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { LocalizedText } from '../constants/locale';
import {
  INITIAL_ADMIN_ROLE_CODE,
  type PermissionAction,
  RBAC_POLICY_DEFINITIONS,
  type RbacResourceCode,
  type RbacRoleScopeType,
} from './catalog';

export const ROLE_PERMISSION_STATES = ['unset', 'grant', 'deny'] as const;
export const ROLE_CAPABILITY_PACK_STATES = [...ROLE_PERMISSION_STATES, 'mixed'] as const;
export const ROLE_CAPABILITY_RISK_TIERS = ['normal', 'sensitive', 'critical'] as const;
export const ROLE_CAPABILITY_BINDING_SOURCES = ['explicit', 'derived', 'none'] as const;
export const ROLE_CAPABILITY_CATEGORIES = [
  'Administration',
  'Organization',
  'Public Presence',
  'Customer',
  'Configuration',
  'Integrations',
  'Security',
  'Reports',
  'Audit',
  'Platform',
] as const;

export type RolePermissionState = (typeof ROLE_PERMISSION_STATES)[number];
export type RoleCapabilityPackState = (typeof ROLE_CAPABILITY_PACK_STATES)[number];
export type RoleCapabilityRiskTier = (typeof ROLE_CAPABILITY_RISK_TIERS)[number];
export type RolePermissionEntryMode = 'normal' | 'fixedDeny';
export type RoleCapabilityBindingSource = (typeof ROLE_CAPABILITY_BINDING_SOURCES)[number];
export type RoleCapabilityCategory = (typeof ROLE_CAPABILITY_CATEGORIES)[number];

export interface RoleCapabilityPackPermission {
  resource: RbacResourceCode;
  action: PermissionAction;
  mode: RolePermissionEntryMode;
}

export interface RoleCapabilityBindingContract {
  apiBindings: readonly string[];
  uiBindings: readonly string[];
  bindingSource: RoleCapabilityBindingSource;
}

export interface RoleCapabilityPackDefinition extends RoleCapabilityBindingContract {
  code: string;
  label: LocalizedText;
  description: LocalizedText;
  rowDescription: LocalizedText;
  category: RoleCapabilityCategory;
  riskTier: RoleCapabilityRiskTier;
  scopeTypes: readonly RbacRoleScopeType[];
  advancedOnly: boolean;
  sensitiveReason?: LocalizedText;
  permissions: readonly RoleCapabilityPackPermission[];
}

const text = (en: string, zh: string, ja: string = en): LocalizedText => ({
  en,
  zh_HANS: zh,
  zh_HANT: zh,
  ja,
  ko: en,
  fr: en,
});

const permission = (
  resource: RbacResourceCode,
  actions: readonly PermissionAction[],
  mode: RolePermissionEntryMode = 'normal'
): RoleCapabilityPackPermission[] => actions.map((action) => ({ resource, action, mode }));

type LocalizedTuple = readonly [string, string, string?];

const tupleText = ([en, zh, ja]: LocalizedTuple): LocalizedText => text(en, zh, ja);

const pack = (
  definition: Omit<
    RoleCapabilityPackDefinition,
    'label' | 'description' | 'rowDescription' | 'sensitiveReason'
  > & {
    label: LocalizedTuple;
    description: LocalizedTuple;
    rowDescription: LocalizedTuple;
    sensitiveReason?: LocalizedTuple;
  }
): RoleCapabilityPackDefinition => ({
  ...definition,
  label: tupleText(definition.label),
  description: tupleText(definition.description),
  rowDescription: tupleText(definition.rowDescription),
  sensitiveReason: definition.sensitiveReason ? tupleText(definition.sensitiveReason) : undefined,
});

const allRbacPolicyPermissions = (): RoleCapabilityPackPermission[] =>
  RBAC_POLICY_DEFINITIONS.map((policyDefinition) => ({
    resource: policyDefinition.resourceCode as RbacResourceCode,
    action: policyDefinition.action,
    mode: 'normal',
  }));

export const ROLE_CAPABILITY_PACKS = [
  pack({
    code: 'role.organization.manage',
    label: ['Organization & Talent Management', '组织与艺人管理'],
    description: ['Manage organization structure and talent records.', '管理组织结构与艺人档案。'],
    rowDescription: [
      'Manage subsidiaries, talent records, and organization structure in the assigned scope.',
      '管理分级目录、艺人档案以及授权范围内的组织结构。',
    ],
    category: 'Organization',
    riskTier: 'normal',
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
    advancedOnly: false,
    apiBindings: ['/api/v1/subsidiaries', '/api/v1/talents'],
    uiBindings: ['tenant.organization', 'tenant.talents'],
    bindingSource: 'explicit',
    permissions: [
      ...permission('subsidiary', ['read', 'write', 'delete', 'admin']),
      ...permission('talent', ['read', 'write', 'delete', 'admin']),
    ],
  }),
  pack({
    code: 'role.user_access.manage',
    label: ['User & Role Administration', '用户与角色管理'],
    description: ['Create users, assign roles, and manage access.', '创建用户、分配角色并管理访问。'],
    rowDescription: [
      'Create users, assign roles, and manage access for the workspace.',
      '创建用户、分配角色，并管理工作区访问权限。',
    ],
    category: 'Administration',
    riskTier: 'critical',
    scopeTypes: ['tenant'],
    advancedOnly: false,
    sensitiveReason: ['Can create users, assign roles, and change access.', '可以创建用户、分配角色并改变访问权限。'],
    apiBindings: ['/api/v1/system-users', '/api/v1/user-roles'],
    uiBindings: ['tenant.user-management.users'],
    bindingSource: 'explicit',
    permissions: [
      ...permission('system_user', ['read', 'write', 'delete', 'admin']),
      ...permission('role', ['read', 'write', 'admin']),
    ],
  }),
  pack({
    code: 'role.role_definition.manage',
    label: ['Role Definition Management', '角色定义管理'],
    description: ['Change role metadata and permission definitions.', '修改角色资料与权限定义。'],
    rowDescription: [
      'Change role names, descriptions, and permission definitions; hard deletion stays blocked.',
      '修改角色名称、说明和权限定义；仍然禁止硬删除。',
    ],
    category: 'Administration',
    riskTier: 'critical',
    scopeTypes: ['tenant'],
    advancedOnly: false,
    sensitiveReason: ['Can change role metadata and permission definitions, but cannot delete roles.', '可以修改角色资料与权限定义，但不能删除角色。'],
    apiBindings: ['/api/v1/roles'],
    uiBindings: ['tenant.user-management.roles'],
    bindingSource: 'explicit',
    permissions: [
      ...permission('role', ['read', 'write', 'admin']),
      ...permission('role', ['delete'], 'fixedDeny'),
    ],
  }),
  pack({
    code: 'role.customer.profile.manage',
    label: ['Customer Profile Management', '客户资料管理'],
    description: ['Manage customer profiles and memberships.', '管理客户资料与会员信息。'],
    rowDescription: [
      'Manage customer profiles and membership information without sensitive PII controls.',
      '管理客户资料与会员信息，不包含敏感 PII 控制。',
    ],
    category: 'Customer',
    riskTier: 'normal',
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
    advancedOnly: false,
    apiBindings: ['/api/v1/customers', '/api/v1/memberships'],
    uiBindings: ['tenant.customer-management'],
    bindingSource: 'derived',
    permissions: [
      ...permission('customer.profile', ['read', 'write', 'delete', 'admin']),
      ...permission('customer.membership', ['read', 'write', 'admin']),
    ],
  }),
  pack({
    code: 'role.customer.pii.manage',
    label: ['Sensitive Customer Data', '敏感客户数据'],
    description: ['View or edit protected customer identity data.', '查看或编辑受保护客户身份数据。'],
    rowDescription: ['View or edit sensitive customer identity data.', '查看或编辑敏感客户身份数据。'],
    category: 'Customer',
    riskTier: 'sensitive',
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
    advancedOnly: false,
    sensitiveReason: ['Can reveal or edit protected customer PII.', '可以查看或编辑受保护客户 PII。'],
    apiBindings: ['/api/v1/pii', '/api/v1/customers'],
    uiBindings: ['tenant.customer-management.pii'],
    bindingSource: 'derived',
    permissions: [...permission('customer.pii', ['read', 'write', 'admin'])],
  }),
  pack({
    code: 'role.customer.import_export.manage',
    label: ['Customer Import & Export', '客户导入导出'],
    description: ['Import, export, or remove customer data in bulk workflows.', '在批量流程中导入、导出或移除客户数据。'],
    rowDescription: [
      'Import, export, or remove customer data in bulk workflows.',
      '在批量流程中导入、导出或移除客户数据。',
    ],
    category: 'Customer',
    riskTier: 'sensitive',
    scopeTypes: ['tenant'],
    advancedOnly: false,
    sensitiveReason: ['Can import, export, or remove bulk customer data.', '可以批量导入、导出或移除客户数据。'],
    apiBindings: ['/api/v1/import', '/api/v1/export'],
    uiBindings: ['tenant.customer-management.import-export'],
    bindingSource: 'derived',
    permissions: [
      ...permission('customer.import', ['read', 'write', 'delete', 'admin']),
      ...permission('customer.export', ['read', 'write', 'delete', 'admin']),
    ],
  }),
  pack({
    code: 'role.configuration.manage',
    label: ['Configuration & Settings', '配置与设置'],
    description: ['Change dictionaries, profile-store settings, and operational configuration.', '修改字典、资料存储设置和运营配置。'],
    rowDescription: [
      'Change dictionaries, profile-store settings, and operational configuration.',
      '修改字典、资料存储设置和运营配置。',
    ],
    category: 'Configuration',
    riskTier: 'sensitive',
    scopeTypes: ['tenant'],
    advancedOnly: false,
    sensitiveReason: ['Can change operational defaults and dictionaries.', '可以修改运营默认值和字典。'],
    apiBindings: ['/api/v1/settings', '/api/v1/config'],
    uiBindings: ['tenant.settings', 'tenant.system-dictionary'],
    bindingSource: 'explicit',
    permissions: [
      ...permission('config.pii_service', ['read', 'write', 'admin']),
      ...permission('config.profile_store', ['read', 'write', 'admin']),
      ...permission('config.dictionary', ['read', 'write', 'admin']),
      ...permission('config.customer_status', ['read', 'write', 'admin']),
      ...permission('config.membership', ['read', 'write', 'admin']),
      ...permission('config.platform_registry', ['read', 'write', 'admin']),
      ...permission('config.platform_settings', ['read', 'write', 'admin']),
      ...permission('settings', ['read', 'write', 'admin']),
    ],
  }),
  pack({
    code: 'role.public_presence.author',
    label: ['Public Presence Authoring', '公开主页编辑'],
    description: ['Edit homepage, content, validation, and authoring surfaces.', '编辑主页、内容、校验和创作界面。'],
    rowDescription: [
      'Edit homepage, content, validation, and Marshmallow authoring surfaces.',
      '编辑主页、内容、校验和棉花糖创作界面。',
    ],
    category: 'Public Presence',
    riskTier: 'normal',
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
    advancedOnly: false,
    apiBindings: ['/api/v1/homepage', '/api/v1/public-presence-assets'],
    uiBindings: ['tenant.homepage', 'talent.homepage'],
    bindingSource: 'explicit',
    permissions: [
      ...permission('talent.homepage', ['read', 'write', 'admin']),
      ...permission('public_presence.document', ['read', 'write', 'admin']),
      ...permission('public_presence.review', ['read', 'write']),
      ...permission('public_presence.validation', ['read', 'write']),
      ...permission('talent.marshmallow', ['read', 'write', 'execute', 'admin']),
    ],
  }),
  pack({
    code: 'role.public_presence.publish',
    label: ['Public Presence Publishing', '公开主页发布'],
    description: ['Publish, approve, validate, or roll back public-facing homepage changes.', '发布、批准、校验或回滚面向公众的主页变更。'],
    rowDescription: [
      'Publish, approve, validate, or roll back public-facing homepage changes.',
      '发布、批准、校验或回滚面向公众的主页变更。',
    ],
    category: 'Public Presence',
    riskTier: 'sensitive',
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
    advancedOnly: false,
    sensitiveReason: ['Can publish, rollback, and affect public pages.', '可以发布、回滚并影响公开页面。'],
    apiBindings: ['/api/v1/homepage', '/api/v1/public-presence-assets'],
    uiBindings: ['tenant.homepage.publish'],
    bindingSource: 'derived',
    permissions: [
      ...permission('public_presence.review', ['execute', 'admin']),
      ...permission('public_presence.publish', ['write', 'execute', 'admin']),
      ...permission('public_presence.rollback', ['write', 'execute', 'admin']),
      ...permission('public_presence.validation', ['execute', 'admin']),
      ...permission('public_presence.audit', ['read']),
    ],
  }),
  pack({
    code: 'role.public_presence.ai_patch.execute',
    label: ['AI Patch Execution', 'AI 修改执行'],
    description: ['Execute AI-assisted source patch operations.', '执行 AI 辅助源码修改操作。'],
    rowDescription: [
      'Execute AI-assisted source patch operations in Public Presence workflows.',
      '在公开主页流程中执行 AI 辅助源码修改操作。',
    ],
    category: 'Public Presence',
    riskTier: 'critical',
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
    advancedOnly: true,
    sensitiveReason: ['Can trigger AI-assisted source changes.', '可以触发 AI 辅助源码变更。'],
    apiBindings: [],
    uiBindings: [],
    bindingSource: 'none',
    permissions: [...permission('public_presence.ai_patch', ['execute', 'admin'])],
  }),
  pack({
    code: 'role.reports.read_export',
    label: ['Reports & Export', '报表与导出'],
    description: ['View reports and run report export actions.', '查看报表并执行报表导出操作。'],
    rowDescription: ['View reports and run report export actions.', '查看报表并执行报表导出操作。'],
    category: 'Reports',
    riskTier: 'sensitive',
    scopeTypes: ['tenant', 'subsidiary', 'talent'],
    advancedOnly: false,
    sensitiveReason: ['Can export operational reports.', '可以导出运营报表。'],
    apiBindings: ['/api/v1/reports'],
    uiBindings: ['tenant.reports'],
    bindingSource: 'derived',
    permissions: [...permission('report.mfr', ['read', 'execute', 'admin'])],
  }),
  pack({
    code: 'role.integration.manage',
    label: ['Integrations & Webhooks', '集成与 Webhook'],
    description: ['Manage adapters, webhook delivery, consumers, and integration logs.', '管理适配器、Webhook 投递、消费者和集成日志。'],
    rowDescription: [
      'Manage adapters, webhook delivery, consumers, and integration logs.',
      '管理适配器、Webhook 投递、消费者和集成日志。',
    ],
    category: 'Integrations',
    riskTier: 'sensitive',
    scopeTypes: ['tenant'],
    advancedOnly: false,
    sensitiveReason: ['Can change external integrations and webhook delivery.', '可以修改外部集成与 Webhook 投递。'],
    apiBindings: ['/api/v1/integrations', '/api/v1/webhooks'],
    uiBindings: ['tenant.webhook-management', 'tenant.integration-management'],
    bindingSource: 'derived',
    permissions: [
      ...permission('integration.adapter', ['read', 'write', 'delete', 'admin']),
      ...permission('integration.webhook', ['read', 'write', 'delete', 'admin']),
      ...permission('integration.consumer', ['read', 'write', 'delete', 'admin']),
      ...permission('log.integration_log', ['read']),
    ],
  }),
  pack({
    code: 'role.security.manage',
    label: ['Security Controls', '安全控制'],
    description: ['Manage blocklists, IP rules, and external safety controls.', '管理黑名单、IP 规则和外部安全控制。'],
    rowDescription: ['Manage blocklists, IP rules, and external safety controls.', '管理黑名单、IP 规则和外部安全控制。'],
    category: 'Security',
    riskTier: 'critical',
    scopeTypes: ['tenant'],
    advancedOnly: false,
    sensitiveReason: ['Can alter access controls, IP rules, and blocklists.', '可以修改访问控制、IP 规则和黑名单。'],
    apiBindings: ['/api/v1/security'],
    uiBindings: ['tenant.security'],
    bindingSource: 'derived',
    permissions: [
      ...permission('security.blocklist', ['read', 'write', 'delete', 'admin']),
      ...permission('security.ip_rules', ['read', 'write', 'delete', 'admin']),
      ...permission('security.external_blocklist', ['read', 'write', 'delete', 'admin']),
    ],
  }),
  pack({
    code: 'role.audit_logs.read',
    label: ['Audit & Logs', '审计与日志'],
    description: ['Read audit, integration, search, technical, and compliance logs.', '查看审计、集成、搜索、技术和合规日志。'],
    rowDescription: [
      'Read audit, integration, search, technical, and compliance logs.',
      '查看审计、集成、搜索、技术和合规日志。',
    ],
    category: 'Audit',
    riskTier: 'normal',
    scopeTypes: ['tenant'],
    advancedOnly: false,
    apiBindings: ['/api/v1/logs', '/api/v1/observability'],
    uiBindings: ['tenant.observability'],
    bindingSource: 'derived',
    permissions: [
      ...permission('log.change_log', ['read']),
      ...permission('log.integration_log', ['read']),
      ...permission('log.search', ['read']),
      ...permission('log.tech_log', ['read']),
      ...permission('compliance.report', ['read']),
      ...permission('public_presence.audit', ['read', 'admin']),
    ],
  }),
  pack({
    code: 'role.email_template.manage',
    label: ['Email Templates', '邮件模板'],
    description: ['Manage email templates used by workspace communication flows.', '管理工作区沟通流程使用的邮件模板。'],
    rowDescription: [
      'Manage email templates used by workspace communication flows.',
      '管理工作区沟通流程使用的邮件模板。',
    ],
    category: 'Configuration',
    riskTier: 'normal',
    scopeTypes: ['tenant'],
    advancedOnly: false,
    apiBindings: ['/api/v1/email'],
    uiBindings: ['tenant.email-templates'],
    bindingSource: 'derived',
    permissions: [...permission('email.template', ['read', 'write', 'delete', 'admin'])],
  }),
  pack({
    code: 'role.platform.registry.read',
    label: ['Platform Registry Visibility', '平台注册表查看'],
    description: ['View platform registry and gateway readiness metadata.', '查看平台注册表和网关就绪元数据。'],
    rowDescription: [
      'View platform registry and gateway readiness metadata.',
      '查看平台注册表和网关就绪元数据。',
    ],
    category: 'Platform',
    riskTier: 'normal',
    scopeTypes: ['tenant'],
    advancedOnly: true,
    sensitiveReason: ['AC/platform diagnostic visibility.', 'AC/平台诊断可见性。'],
    apiBindings: ['/api/v1/api-registry', '/api/v1/builder-registry'],
    uiBindings: ['ac.api-registry', 'ac.builder-registry'],
    bindingSource: 'explicit',
    permissions: [
      ...permission('platform.api_registry', ['read']),
      ...permission('platform.api_gateway', ['read']),
      ...permission('platform.builder_registry', ['read']),
    ],
  }),
  pack({
    code: 'role.platform.operations.manage',
    label: ['Platform Operations', '平台运维控制'],
    description: ['Manage platform operations, runtime flags, and event controls.', '管理平台运维、运行时开关和事件控制。'],
    rowDescription: [
      'Manage platform operations such as tool connections, runtime flags, and event backbone controls.',
      '管理平台运维能力，例如工具连接、运行时开关和事件骨干控制。',
    ],
    category: 'Platform',
    riskTier: 'critical',
    scopeTypes: ['tenant'],
    advancedOnly: true,
    sensitiveReason: ['Can change platform tools, runtime flags, and event operations.', '可以改变平台工具、运行时开关和事件运维。'],
    apiBindings: ['/api/v1/platform-tools', '/api/v1/runtime-flags'],
    uiBindings: ['ac.platform-tools', 'ac.runtime-flags'],
    bindingSource: 'derived',
    permissions: [
      ...permission('tenant.manage', ['read', 'write', 'delete', 'execute', 'admin']),
      ...permission('platform.tool_connection', ['read', 'write', 'execute', 'admin']),
      ...permission('platform.runtime_flag', ['read', 'execute', 'admin']),
      ...permission('platform.event_backbone', ['read', 'execute', 'admin']),
    ],
  }),
  pack({
    code: 'role.initial_admin.all',
    label: ['Initial Admin Full Access', '初始管理员全权限'],
    description: ['Built-in recovery role with every current permission.', '拥有所有当前权限的内置救援角色。'],
    rowDescription: [
      'Built-in recovery role with every current permission; not available as a normal custom-role pack.',
      '拥有所有当前权限的内置救援角色；不可作为普通自定义角色能力包使用。',
    ],
    category: 'Administration',
    riskTier: 'critical',
    scopeTypes: ['tenant'],
    advancedOnly: true,
    sensitiveReason: ['Built-in recovery role with every current RBAC policy.', '拥有所有当前 RBAC 策略的内置救援角色。'],
    apiBindings: ['*'],
    uiBindings: ['tenant.user-management.roles'],
    bindingSource: 'explicit',
    permissions: allRbacPolicyPermissions(),
  }),
] as const satisfies readonly RoleCapabilityPackDefinition[];

export type RoleCapabilityPackCode = (typeof ROLE_CAPABILITY_PACKS)[number]['code'];

export const ROLE_CAPABILITY_PACK_CODES = ROLE_CAPABILITY_PACKS.map((packDefinition) => packDefinition.code) as [
  RoleCapabilityPackCode,
  ...RoleCapabilityPackCode[],
];

export const EDITABLE_ROLE_CAPABILITY_PACKS = ROLE_CAPABILITY_PACKS.filter(
  (packDefinition) => packDefinition.code !== 'role.initial_admin.all'
);

export const ROLE_CAPABILITY_PACK_BY_CODE: ReadonlyMap<
  RoleCapabilityPackCode,
  RoleCapabilityPackDefinition
> = new Map(ROLE_CAPABILITY_PACKS.map((packDefinition) => [packDefinition.code, packDefinition]));

export function isInitialAdminRoleCode(roleCode: string): roleCode is typeof INITIAL_ADMIN_ROLE_CODE {
  return roleCode === INITIAL_ADMIN_ROLE_CODE;
}
