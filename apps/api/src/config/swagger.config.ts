// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
/**
 * Swagger Configuration
 * Centralized configuration for OpenAPI documentation
 */
import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Operations API Tags
 */
export const OPERATIONS_TAGS = [
  // 📊 Org - 组织架构
  { name: 'Org - Tree', description: '组织架构树' },
  { name: 'Org - Subsidiaries', description: '子公司管理' },
  { name: 'Org - Talents', description: '艺人管理' },
  { name: 'Org - Tenants', description: '租户管理' },

  // 👥 Customer - 客户管理
  { name: 'Customer - Profiles', description: '客户档案' },
  { name: 'Customer - Platform IDs', description: '平台身份' },
  { name: 'Customer - Memberships', description: '会员资格' },
  { name: 'Customer - External IDs', description: '外部ID' },
  { name: 'Customer - Import', description: '数据导入' },
  { name: 'Customer - Export', description: '数据导出' },

  // 🛠️ Ops - 运营工具
  { name: 'Ops - Marshmallow', description: '棉花糖匿名消息' },
  { name: 'Ops - Blocklist', description: '外链黑名单' },
  { name: 'Ops - Homepage', description: '个人主页管理' },
  { name: 'Ops - Reports', description: '报表生成' },
  { name: 'Ops - Email', description: '邮件配置与模板' },
  { name: 'Ops - Integration', description: '第三方集成' },

  // ⚙️ System - Roles/Permissions
  { name: 'System - Roles', description: '角色管理' },
  { name: 'System - Permissions', description: '权限管理' },
] as const;

/**
 * System & Config API Tags
 */
export const CONFIG_TAGS = [
  // 🔐 Auth
  { name: 'Auth', description: '认证与登录' },
  { name: 'Auth - User Profile', description: '用户资料管理' },

  // 📊 Org
  { name: 'Org - Tenants', description: '租户管理' },

  // 🛠️ Ops
  { name: 'Ops - Email', description: '邮件配置与模板' },

  // ⚙️ System - 系统配置
  { name: 'System - Roles', description: '角色管理' },
  { name: 'System - Permissions', description: '权限管理' },
  { name: 'System - Users', description: '系统用户' },
  { name: 'System - System Roles', description: '系统级角色' },
  { name: 'System - Delegated Admin', description: '委托管理员' },
  { name: 'System - Dictionary', description: '数据字典' },
  { name: 'System - Config', description: '配置实体' },
  { name: 'System - PII', description: 'PII 服务配置' },
  { name: 'System - Security', description: '安全与黑名单' },
  { name: 'System - Settings', description: '通用设置' },
  { name: 'System - Logs', description: '日志查询' },
] as const;

/**
 * Public API Tags
 */
export const PUBLIC_TAGS = [
  // 🌐 Public - 公开接口
  { name: 'Public - Homepage', description: '公开主页访问' },
  { name: 'Public - Marshmallow', description: '公开消息提交' },
  { name: 'Public - Assets', description: '公开资源' },
  { name: 'Public - Health', description: '健康检查' },
] as const;

/**
 * All Tags (Union)
 */
export const API_TAGS = [...OPERATIONS_TAGS, ...CONFIG_TAGS, ...PUBLIC_TAGS];

/**
 * Build Swagger document configuration
 */
export function buildSwaggerConfig(
  title = 'TCRN TMS API',
  description = 'Talent Creator Relationship Network - Talent Management System API',
  version = '1.0.0',
  tags:
    | { name: string; description: string }[]
    | readonly { name: string; description: string }[] = API_TAGS
) {
  const builder = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .setContact('TCRN Team', 'https://github.com/tpmoonchefryan/TCRN-TMS', 'support@tcrn.dev')
    .setLicense(
      'PolyForm Noncommercial',
      'https://polyformproject.org/licenses/noncommercial/1.0.0/'
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'JWT-auth'
    )
    .addServer('http://localhost:4000', 'Development Server')
    .addServer('https://api.staging.tcrn.dev', 'Staging Server')
    .addServer('https://api.tcrn.dev', 'Production Server');

  // Add tags
  const uniqueTags = new Map<string, string>();
  for (const tag of tags) {
    uniqueTags.set(tag.name, tag.description);
  }

  for (const [name, desc] of uniqueTags.entries()) {
    builder.addTag(name, desc);
  }

  return builder.build();
}

/**
 * Swagger module options
 */
export const SWAGGER_OPTIONS = {
  explorer: true,
  customSiteTitle: 'TCRN TMS API Documentation',
  customCss: `
    .swagger-ui .info .title { font-size: 2.5rem }
    .swagger-ui .info .description { font-size: 1rem; line-height: 1.6 }
  `,
  // OAuth2 redirect URL at top level (required by @nestjs/swagger)
  oauth2RedirectUrl: 'http://localhost:4000/api/docs/oauth2-redirect.html',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
    oauth: {
      clientId: 'swagger-ui',
      appName: 'TCRN TMS API',
      usePkceWithAuthorizationCodeGrant: false,
    },
  },
};
