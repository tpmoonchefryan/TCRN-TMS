// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Roles and resources seed data (RBAC)

import { PrismaClient } from '@prisma/client';

export async function seedRolesAndResources(prisma: PrismaClient) {
  console.log('  → Seeding roles and resources...');

  // =========================================================================
  // Resources
  // =========================================================================
  const resources = [
    // Platform (AC-only)
    { code: 'tenant.manage', module: 'platform', nameEn: 'Tenant Management', nameZh: '租户管理', nameJa: 'テナント管理' },
    
    // Organization
    { code: 'subsidiary', module: 'organization', nameEn: 'Subsidiary', nameZh: '分级目录', nameJa: '組織' },
    { code: 'talent', module: 'organization', nameEn: 'Talent', nameZh: '艺人', nameJa: 'タレント' },
    
    // User Management
    { code: 'system_user', module: 'user', nameEn: 'System User', nameZh: '系统用户', nameJa: 'システムユーザー' },
    { code: 'role', module: 'user', nameEn: 'Role', nameZh: '角色', nameJa: 'ロール' },
    
    // Customer Management
    { code: 'customer.profile', module: 'customer', nameEn: 'Customer Profile', nameZh: '客户档案', nameJa: '顧客プロファイル' },
    { code: 'customer.pii', module: 'customer', nameEn: 'Customer PII', nameZh: '客户敏感信息', nameJa: '顧客PII' },
    { code: 'customer.membership', module: 'customer', nameEn: 'Customer Membership', nameZh: '会员记录', nameJa: 'メンバーシップ' },
    { code: 'customer.import', module: 'customer', nameEn: 'Customer Import', nameZh: '客户导入', nameJa: '顧客インポート' },
    
    // Configuration
    { code: 'config.customer_status', module: 'config', nameEn: 'Customer Status', nameZh: '客户状态', nameJa: '顧客ステータス' },
    { code: 'config.membership', module: 'config', nameEn: 'Membership Config', nameZh: '会员配置', nameJa: 'メンバーシップ設定' },
    { code: 'config.platform', module: 'config', nameEn: 'Platform Config', nameZh: '平台配置', nameJa: 'プラットフォーム設定' },
    { code: 'config.pii_service', module: 'config', nameEn: 'PII Service Config', nameZh: 'PII服务配置', nameJa: 'PIIサービス設定' },
    
    // External Pages
    { code: 'homepage', module: 'external', nameEn: 'Homepage', nameZh: '个人主页', nameJa: 'ホームページ' },
    { code: 'marshmallow', module: 'external', nameEn: 'Marshmallow', nameZh: '棉花糖', nameJa: 'マシュマロ' },
    
    // Reports
    { code: 'report.mfr', module: 'report', nameEn: 'MFR Report', nameZh: 'MFR报表', nameJa: 'MFRレポート' },
    
    // Integration
    { code: 'integration.adapter', module: 'integration', nameEn: 'Integration Adapter', nameZh: '集成适配器', nameJa: '連携アダプター' },
    { code: 'integration.webhook', module: 'integration', nameEn: 'Webhook', nameZh: 'Webhook', nameJa: 'Webhook' },
    { code: 'integration.consumer', module: 'integration', nameEn: 'API Consumer', nameZh: 'API消费者', nameJa: 'APIコンシューマー' },
    
    // Security
    { code: 'security.blocklist', module: 'security', nameEn: 'Blocklist', nameZh: '屏蔽词', nameJa: 'ブロックリスト' },
    { code: 'security.ip_rules', module: 'security', nameEn: 'IP Rules', nameZh: 'IP规则', nameJa: 'IPルール' },
    
    // Logs
    { code: 'log.change', module: 'log', nameEn: 'Change Log', nameZh: '变更日志', nameJa: '変更ログ' },
    { code: 'log.security', module: 'log', nameEn: 'Security Log', nameZh: '安全日志', nameJa: 'セキュリティログ' },
    { code: 'log.integration', module: 'log', nameEn: 'Integration Log', nameZh: '集成日志', nameJa: '連携ログ' },
    
    // System
    { code: 'system', module: 'system', nameEn: 'System', nameZh: '系统', nameJa: 'システム' },
  ];

  const createdResources: Record<string, string> = {};
  
  for (const resource of resources) {
    const created = await prisma.resource.upsert({
      where: { code: resource.code },
      update: resource,
      create: resource,
    });
    createdResources[resource.code] = created.id;
  }

  console.log(`    ✓ Created ${resources.length} resources`);

  // =========================================================================
  // Policies (resource + action combinations, effect is now in RolePolicy)
  // =========================================================================
  const actions = ['read', 'write', 'delete', 'admin'];
  const policies: Array<{ resourceCode: string; action: string }> = [];

  for (const resource of resources) {
    for (const action of actions) {
      policies.push({ resourceCode: resource.code, action });
    }
  }

  for (const policy of policies) {
    const resourceId = createdResources[policy.resourceCode];
    await prisma.policy.upsert({
      where: {
        resourceId_action: {
          resourceId,
          action: policy.action,
        },
      },
      update: {},
      create: {
        resourceId,
        action: policy.action,
      },
    });
  }

  console.log(`    ✓ Created ${policies.length} policies`);

  // =========================================================================
  // Roles (Unified functional roles - scope is controlled by UserRole)
  // =========================================================================
  const roles = [
    {
      code: 'PLATFORM_ADMIN',
      nameEn: 'Platform Administrator',
      nameZh: '平台管理员',
      nameJa: 'プラットフォーム管理者',
      description: 'AC tenant administrator with platform-wide access',
      isSystem: true,
    },
    {
      code: 'ADMIN',
      nameEn: 'Administrator',
      nameZh: '管理员',
      nameJa: '管理者',
      description: 'Full access within assigned scope (tenant/subsidiary/talent)',
      isSystem: true,
    },
    {
      code: 'TALENT_MANAGER',
      nameEn: 'Talent Manager',
      nameZh: '艺人经理',
      nameJa: 'タレントマネージャー',
      description: 'Manage talent operations, organization structure, and user assignments',
      isSystem: false,
    },
    {
      code: 'CONTENT_MANAGER',
      nameEn: 'Content Manager',
      nameZh: '内容管理员',
      nameJa: 'コンテンツマネージャー',
      description: 'Homepage and Marshmallow management',
      isSystem: false,
    },
    {
      code: 'CUSTOMER_MANAGER',
      nameEn: 'Customer Manager',
      nameZh: '客户经理',
      nameJa: '顧客マネージャー',
      description: 'Customer profile and membership management',
      isSystem: false,
    },
    {
      code: 'VIEWER',
      nameEn: 'Viewer',
      nameZh: '只读访问者',
      nameJa: '閲覧者',
      description: 'Read-only access to resources within assigned scope',
      isSystem: false,
    },
    {
      code: 'INTEGRATION_MANAGER',
      nameEn: 'Integration Manager',
      nameZh: '集成管理员',
      nameJa: '連携マネージャー',
      description: 'Full access to integration adapters, webhooks, and API consumers',
      isSystem: false,
    },
  ];

  const createdRoles: Record<string, string> = {};

  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
    createdRoles[role.code] = created.id;
  }

  console.log(`    ✓ Created ${roles.length} roles`);

  // =========================================================================
  // Role-Policy Mappings (with effect: 'grant' or 'deny')
  // =========================================================================
  
  // Helper function to assign policy with effect
  async function assignPolicy(roleCode: string, policyId: string, effect: 'grant' | 'deny' = 'grant') {
    await prisma.rolePolicy.upsert({
      where: {
        roleId_policyId: {
          roleId: createdRoles[roleCode],
          policyId,
        },
      },
      update: { effect },
      create: {
        roleId: createdRoles[roleCode],
        policyId,
        effect,
      },
    });
  }

  const allPolicies = await prisma.policy.findMany({ include: { resource: true } });

  // PLATFORM_ADMIN: All policies with grant (including tenant.manage and system)
  for (const policy of allPolicies) {
    await assignPolicy('PLATFORM_ADMIN', policy.id, 'grant');
  }

  // ADMIN: All policies except system and tenant.manage with grant
  const adminPolicies = allPolicies.filter(
    p => p.resource.code !== 'system' && p.resource.code !== 'tenant.manage'
  );
  for (const policy of adminPolicies) {
    await assignPolicy('ADMIN', policy.id, 'grant');
  }

  // TALENT_MANAGER: Organization, user management, logs (read/write/admin for org, read/write for users)
  const talentManagerResources = ['subsidiary', 'talent', 'system_user', 'role', 'log.change'];
  const talentManagerPolicies = allPolicies.filter(
    p => talentManagerResources.includes(p.resource.code) && ['read', 'write', 'admin'].includes(p.action)
  );
  for (const policy of talentManagerPolicies) {
    await assignPolicy('TALENT_MANAGER', policy.id, 'grant');
  }

  // CONTENT_MANAGER: Homepage and Marshmallow - all actions
  const contentResources = ['homepage', 'marshmallow'];
  const contentPolicies = allPolicies.filter(p => contentResources.includes(p.resource.code));
  for (const policy of contentPolicies) {
    await assignPolicy('CONTENT_MANAGER', policy.id, 'grant');
  }

  // CUSTOMER_MANAGER: Customer related read/write (including PII)
  const customerResources = ['customer.profile', 'customer.pii', 'customer.membership', 'customer.import'];
  const customerPolicies = allPolicies.filter(
    p => customerResources.includes(p.resource.code) && ['read', 'write'].includes(p.action)
  );
  for (const policy of customerPolicies) {
    await assignPolicy('CUSTOMER_MANAGER', policy.id, 'grant');
  }

  // VIEWER: Read-only access to most resources (excluding system, tenant.manage, security, PII)
  const viewerExcludeResources = ['system', 'tenant.manage', 'security.blocklist', 'security.ip_rules', 'customer.pii'];
  const viewerPolicies = allPolicies.filter(
    p => !viewerExcludeResources.includes(p.resource.code) && p.action === 'read'
  );
  for (const policy of viewerPolicies) {
    await assignPolicy('VIEWER', policy.id, 'grant');
  }
  // VIEWER: Explicitly deny PII access
  const piiReadPolicy = allPolicies.find(p => p.resource.code === 'customer.pii' && p.action === 'read');
  if (piiReadPolicy) {
    await assignPolicy('VIEWER', piiReadPolicy.id, 'deny');
  }

  // INTEGRATION_MANAGER: Full access to integration.* and read log.integration
  const integrationResources = ['integration.adapter', 'integration.webhook', 'integration.consumer'];
  const integrationPolicies = allPolicies.filter(p => integrationResources.includes(p.resource.code));
  for (const policy of integrationPolicies) {
    await assignPolicy('INTEGRATION_MANAGER', policy.id, 'grant');
  }
  // Add log.integration read
  const logIntegrationRead = allPolicies.find(p => p.resource.code === 'log.integration' && p.action === 'read');
  if (logIntegrationRead) {
    await assignPolicy('INTEGRATION_MANAGER', logIntegrationRead.id, 'grant');
  }

  console.log('    ✓ Created role-policy mappings with effects');
}
