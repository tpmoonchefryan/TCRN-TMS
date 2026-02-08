// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';
import * as argon2 from 'argon2';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, Min, MinLength, ValidateNested } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated, success } from '../../common/response.util';
import { TenantService } from './tenant.service';

// DTOs
class AdminUserDto {
  @ApiProperty({ description: 'Admin username', example: 'admin', minLength: 3 })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: 'Admin email', example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Admin password', example: 'SecureP@ssw0rd123', minLength: 12 })
  @IsString()
  @MinLength(12)
  password: string;

  @ApiPropertyOptional({ description: 'Admin display name', example: 'System Administrator' })
  @IsOptional()
  @IsString()
  displayName?: string;
}

class TenantSettingsDto {
  @ApiPropertyOptional({ description: 'Maximum talents allowed', example: 100, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTalents?: number;

  @ApiPropertyOptional({ description: 'Max customers per talent', example: 10000, minimum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  maxCustomersPerTalent?: number;

  @ApiPropertyOptional({ description: 'Enabled features list', example: ['homepage', 'marshmallow'], type: [String] })
  @IsOptional()
  @IsString({ each: true })
  features?: string[];
}

class CreateTenantDto {
  @ApiProperty({ description: 'Tenant code (uppercase)', example: 'ACME_CORP', pattern: '^[A-Z0-9_]{3,32}$' })
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/, { message: 'Code must be 3-32 uppercase letters, numbers, or underscores' })
  code: string;

  @ApiProperty({ description: 'Tenant name', example: 'Acme Corporation', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: 'Tenant settings', type: TenantSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  settings?: TenantSettingsDto;

  @ApiProperty({ description: 'Initial admin user', type: AdminUserDto })
  @ValidateNested()
  @Type(() => AdminUserDto)
  adminUser: AdminUserDto;
}

class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Updated tenant name', example: 'Acme Corp Inc.' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated settings', type: TenantSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  settings?: TenantSettingsDto;

  @ApiPropertyOptional({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

class ListTenantsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Search by code or name', example: 'acme' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tier', enum: ['ac', 'standard'], example: 'standard' })
  @IsOptional()
  @IsString()
  tier?: 'ac' | 'standard';

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', example: '-createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;
}

/**
 * Tenant Management Controller (AC Only)
 * PRD §7: AC 管理租户专用
 */
@ApiTags('Org - Tenants')
@Controller('tenants')
@ApiBearerAuth()
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Verify AC tenant access
   */
  private async verifyAcAccess(user: AuthenticatedUser): Promise<void> {
    const tenant = await this.tenantService.getTenantById(user.tenantId);
    if (!tenant || tenant.tier !== 'ac') {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Only AC tenant administrators can access this resource',
      });
    }
  }

  /**
   * Get tenant statistics (subsidiary, talent, user counts)
   */
  private async getTenantStats(schemaName: string): Promise<{
    subsidiaryCount: number;
    talentCount: number;
    userCount: number;
  }> {
    try {
      // Query counts from tenant schema
      const [subsidiaryResult, talentResult, userResult] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${schemaName}".subsidiary WHERE is_active = true`
        ).catch(() => [{ count: BigInt(0) }]),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${schemaName}".talent WHERE is_active = true`
        ).catch(() => [{ count: BigInt(0) }]),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${schemaName}".system_user WHERE is_active = true`
        ).catch(() => [{ count: BigInt(0) }]),
      ]);

      return {
        subsidiaryCount: Number(subsidiaryResult[0]?.count ?? 0),
        talentCount: Number(talentResult[0]?.count ?? 0),
        userCount: Number(userResult[0]?.count ?? 0),
      };
    } catch {
      // Return zeros if schema doesn't exist or tables not found
      return { subsidiaryCount: 0, talentCount: 0, userCount: 0 };
    }
  }

  /**
   * Seed essential RBAC data if missing (resources, roles, policies, role_policy)
   */
  private async seedEssentialDataIfMissing(schemaName: string): Promise<void> {
    // Check if resources exist
    const resourceCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::int as count FROM "${schemaName}".resource
    `);

    // Check if role_policy exists (important: this table links roles to policies)
    const rolePolicyCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
      SELECT COUNT(*)::int as count FROM "${schemaName}".role_policy
    `);

    // Only skip if BOTH resources AND role_policy have data
    if (resourceCount[0]?.count > 0 && rolePolicyCount[0]?.count > 0) {
      // Data already exists
      return;
    }

    // Seeding essential RBAC data for schema

    // System-defined resources (matching 03-roles-resources.ts format)
    const resources = [
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
      // External Pages (matching controller @RequirePermissions)
      { code: 'talent.homepage', module: 'external', nameEn: 'Homepage', nameZh: '个人主页', nameJa: 'ホームページ' },
      { code: 'talent.marshmallow', module: 'external', nameEn: 'Marshmallow', nameZh: '棉花糖', nameJa: 'マシュマロ' },
      // Reports
      { code: 'report.mfr', module: 'report', nameEn: 'MFR Report', nameZh: 'MFR报表', nameJa: 'MFRレポート' },
      // Integration
      { code: 'integration.adapter', module: 'integration', nameEn: 'Integration Adapter', nameZh: '集成适配器', nameJa: '連携アダプター' },
      { code: 'integration.webhook', module: 'integration', nameEn: 'Webhook', nameZh: 'Webhook', nameJa: 'Webhook' },
      { code: 'integration.consumer', module: 'integration', nameEn: 'API Consumer', nameZh: 'API消费者', nameJa: 'APIコンシューマー' },
      // Security
      { code: 'security.blocklist', module: 'security', nameEn: 'Blocklist', nameZh: '屏蔽词', nameJa: 'ブロックリスト' },
      { code: 'security.ip_rules', module: 'security', nameEn: 'IP Rules', nameZh: 'IP规则', nameJa: 'IPルール' },
      { code: 'security.external_blocklist', module: 'security', nameEn: 'External Blocklist', nameZh: '外部屏蔽名单', nameJa: '外部ブロックリスト' },
      // Logs
      { code: 'log.change', module: 'log', nameEn: 'Change Log', nameZh: '变更日志', nameJa: '変更ログ' },
      { code: 'log.security', module: 'log', nameEn: 'Security Log', nameZh: '安全日志', nameJa: 'セキュリティログ' },
      { code: 'log.integration', module: 'log', nameEn: 'Integration Log', nameZh: '集成日志', nameJa: '連携ログ' },
    ];

    // Insert resources
    for (const resource of resources) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".resource (id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, true, now(), now())
        ON CONFLICT (code) DO NOTHING
      `, resource.code, resource.module, resource.nameEn, resource.nameZh, resource.nameJa);
    }

    // System-defined roles with their policies (matching 03-roles-resources.ts format)
    // Actions: read, write, delete, admin (no more 'execute')
    const actions = ['read', 'write', 'delete', 'admin'];
    
    // Build all policies for ADMIN role (all resources, all actions)
    const adminPolicies: Array<{ resource: string; action: string }> = [];
    for (const resource of resources) {
      for (const action of actions) {
        adminPolicies.push({ resource: resource.code, action });
      }
    }

    const roles = [
      {
        code: 'ADMIN',
        nameEn: 'Administrator',
        nameZh: '管理员',
        nameJa: '管理者',
        description: 'Full access within assigned scope (tenant/subsidiary/talent)',
        isSystem: true,
        policies: adminPolicies,
      },
      {
        code: 'TENANT_ADMIN',
        nameEn: 'Tenant Administrator',
        nameZh: '租户管理员',
        nameJa: 'テナント管理者',
        description: 'Full access to all tenant resources (alias for ADMIN)',
        isSystem: true,
        policies: adminPolicies,
      },
      {
        code: 'VIEWER',
        nameEn: 'Viewer',
        nameZh: '只读访问者',
        nameJa: '閲覧者',
        description: 'Read-only access to resources within assigned scope',
        isSystem: true,
        policies: resources.map(r => ({ resource: r.code, action: 'read' })),
      },
      {
        code: 'TALENT_MANAGER',
        nameEn: 'Talent Manager',
        nameZh: '艺人经理',
        nameJa: 'タレントマネージャー',
        description: 'Manage talent operations, organization structure, and user assignments',
        isSystem: true,
        policies: [
          { resource: 'subsidiary', action: 'read' },
          { resource: 'subsidiary', action: 'write' },
          { resource: 'subsidiary', action: 'admin' },
          { resource: 'talent', action: 'read' },
          { resource: 'talent', action: 'write' },
          { resource: 'talent', action: 'admin' },
          { resource: 'system_user', action: 'read' },
          { resource: 'system_user', action: 'write' },
          { resource: 'role', action: 'read' },
          { resource: 'role', action: 'write' },
          { resource: 'log.change', action: 'read' },
        ],
      },
      {
        code: 'CONTENT_MANAGER',
        nameEn: 'Content Manager',
        nameZh: '内容管理员',
        nameJa: 'コンテンツマネージャー',
        description: 'Homepage and Marshmallow management',
        isSystem: true,
        policies: [
          { resource: 'talent.homepage', action: 'read' },
          { resource: 'talent.homepage', action: 'write' },
          { resource: 'talent.homepage', action: 'delete' },
          { resource: 'talent.homepage', action: 'admin' },
          { resource: 'talent.marshmallow', action: 'read' },
          { resource: 'talent.marshmallow', action: 'write' },
          { resource: 'talent.marshmallow', action: 'delete' },
          { resource: 'talent.marshmallow', action: 'admin' },
        ],
      },
      {
        code: 'CUSTOMER_MANAGER',
        nameEn: 'Customer Manager',
        nameZh: '客户经理',
        nameJa: '顧客マネージャー',
        description: 'Customer profile and membership management',
        isSystem: true,
        policies: [
          { resource: 'customer.profile', action: 'read' },
          { resource: 'customer.profile', action: 'write' },
          { resource: 'customer.pii', action: 'read' },
          { resource: 'customer.pii', action: 'write' },
          { resource: 'customer.membership', action: 'read' },
          { resource: 'customer.membership', action: 'write' },
          { resource: 'customer.import', action: 'read' },
          { resource: 'customer.import', action: 'write' },
        ],
      },
      {
        code: 'INTEGRATION_MANAGER',
        nameEn: 'Integration Manager',
        nameZh: '集成管理员',
        nameJa: '連携マネージャー',
        description: 'Full access to integration adapters, webhooks, and API consumers',
        isSystem: true,
        policies: [
          { resource: 'integration.adapter', action: 'read' },
          { resource: 'integration.adapter', action: 'write' },
          { resource: 'integration.adapter', action: 'delete' },
          { resource: 'integration.adapter', action: 'admin' },
          { resource: 'integration.webhook', action: 'read' },
          { resource: 'integration.webhook', action: 'write' },
          { resource: 'integration.webhook', action: 'delete' },
          { resource: 'integration.webhook', action: 'admin' },
          { resource: 'integration.consumer', action: 'read' },
          { resource: 'integration.consumer', action: 'write' },
          { resource: 'integration.consumer', action: 'delete' },
          { resource: 'integration.consumer', action: 'admin' },
          { resource: 'log.integration', action: 'read' },
        ],
      },
    ];

    // Insert roles and policies
    for (const role of roles) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now(), 1)
        ON CONFLICT (code) DO NOTHING
      `, role.code, role.nameEn, role.nameZh, role.nameJa, role.description, role.isSystem);

      // Create policies and link to role with 'grant' effect
      for (const policy of role.policies) {
        await prisma.$executeRawUnsafe(`
          WITH resource_lookup AS (
            SELECT id FROM "${schemaName}".resource WHERE code = $1
          ),
          inserted_policy AS (
            INSERT INTO "${schemaName}".policy (id, resource_id, action, is_active, created_at, updated_at)
            SELECT gen_random_uuid(), r.id, $2, true, now(), now()
            FROM resource_lookup r
            ON CONFLICT (resource_id, action) DO UPDATE SET updated_at = now()
            RETURNING id
          ),
          role_lookup AS (
            SELECT id FROM "${schemaName}".role WHERE code = $3
          )
          INSERT INTO "${schemaName}".role_policy (id, role_id, policy_id, effect, created_at)
          SELECT gen_random_uuid(), rl.id, ip.id, 'grant', now()
          FROM inserted_policy ip, role_lookup rl
          ON CONFLICT DO NOTHING
        `, policy.resource, policy.action, role.code);
      }
    }

    // Essential RBAC data seeded for schema
  }

  /**
   * GET /api/v1/tenants
   * List all tenants (AC only)
   */
  @Get()
  @ApiOperation({ summary: 'List tenants (AC only)' })
  async listTenants(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTenantsQueryDto,
  ) {
    await this.verifyAcAccess(user);

    const { page = 1, pageSize = 20, search, tier, isActive, sort } = query;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tier) {
      where.tier = tier;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Build order by
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (sort) {
      const isDesc = sort.startsWith('-');
      const field = isDesc ? sort.substring(1) : sort;
      orderBy = { [field]: isDesc ? 'desc' : 'asc' };
    }

    const [tenants, totalCount] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tenant.count({ where }),
    ]);

    // Get stats for each tenant
    const data = await Promise.all(tenants.map(async (tenant) => {
      const stats = tenant.schemaName 
        ? await this.getTenantStats(tenant.schemaName)
        : { subsidiaryCount: 0, talentCount: 0, userCount: 0 };
      
      return {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        schemaName: tenant.schemaName,
        tier: tenant.tier,
        isActive: tenant.isActive,
        settings: tenant.settings,
        stats,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      };
    }));

    return paginated(data, { page, pageSize, totalCount });
  }

  /**
   * POST /api/v1/tenants
   * Create a new tenant (AC only)
   */
  @Post()
  @ApiOperation({ summary: 'Create tenant (AC only)' })
  async createTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantDto,
  ) {
    await this.verifyAcAccess(user);

    // Check code uniqueness
    const existing = await this.tenantService.getTenantByCode(dto.code);
    if (existing) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Tenant code already exists',
      });
    }

    // Create tenant with schema
    const tenant = await this.tenantService.createTenant({
      code: dto.code,
      name: dto.name,
      tier: 'standard',
      settings: (dto.settings || {}) as Record<string, unknown>,
    });

    // Verify and seed essential data (resources, roles, policies) if missing
    await this.seedEssentialDataIfMissing(tenant.schemaName);

    // Create admin user in the new tenant schema (using argon2id per PRD §19)
    const passwordHash = await argon2.hash(dto.adminUser.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenant.schemaName}".system_user 
        (id, username, email, password_hash, display_name, preferred_language, is_active, created_at, updated_at)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, $4, 'en', true, now(), now())
    `, dto.adminUser.username, dto.adminUser.email, passwordHash, dto.adminUser.displayName || null);

    // Get admin user id and assign TENANT_ADMIN role
    const adminUsers = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenant.schemaName}".system_user WHERE username = $1
    `, dto.adminUser.username);

    if (adminUsers.length > 0) {
      const adminUserId = adminUsers[0].id;
      
      // Get TENANT_ADMIN role id
      const roles = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenant.schemaName}".role WHERE code = 'TENANT_ADMIN'
      `);

      if (roles.length > 0) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${tenant.schemaName}".user_role 
            (id, user_id, role_id, scope_type, granted_at)
          VALUES 
            (gen_random_uuid(), $1::uuid, $2::uuid, 'tenant', now())
        `, adminUserId, roles[0].id);
      }
    }

    return success({
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      schemaName: tenant.schemaName,
      tier: tenant.tier,
      isActive: tenant.isActive,
      adminUser: {
        username: dto.adminUser.username,
        email: dto.adminUser.email,
      },
      createdAt: tenant.createdAt.toISOString(),
    });
  }

  /**
   * GET /api/v1/tenants/:id
   * Get tenant details (AC only)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get tenant details (AC only)' })
  async getTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.verifyAcAccess(user);

    const tenant = await this.tenantService.getTenantById(id);
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    // Get tenant statistics
    const stats = tenant.schemaName
      ? await this.getTenantStats(tenant.schemaName)
      : { subsidiaryCount: 0, talentCount: 0, userCount: 0 };

    return success({
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      schemaName: tenant.schemaName,
      tier: tenant.tier,
      isActive: tenant.isActive,
      settings: tenant.settings,
      stats,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    });
  }

  /**
   * PATCH /api/v1/tenants/:id
   * Update tenant (AC only)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant (AC only)' })
  async updateTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    await this.verifyAcAccess(user);

    const tenant = await this.tenantService.getTenantById(id);
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    // Update tenant
    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.settings && { 
          settings: { ...(tenant.settings as object || {}), ...dto.settings },
        }),
      },
    });

    return success({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      isActive: updated.isActive,
      settings: updated.settings,
      updatedAt: updated.updatedAt.toISOString(),
    });
  }

  /**
   * POST /api/v1/tenants/:id/activate
   * Activate tenant (AC only)
   */
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate tenant (AC only)' })
  async activateTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.verifyAcAccess(user);

    const tenant = await this.tenantService.setTenantActive(id, true);
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    return success({
      id: tenant.id,
      isActive: true,
      activatedAt: new Date().toISOString(),
    });
  }

  /**
   * POST /api/v1/tenants/:id/deactivate
   * Deactivate tenant (AC only)
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate tenant (AC only)' })
  async deactivateTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    await this.verifyAcAccess(user);

    const tenant = await this.tenantService.setTenantActive(id, false);
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    return success({
      id: tenant.id,
      isActive: false,
      deactivatedAt: new Date().toISOString(),
      reason: body.reason || null,
    });
  }
}
