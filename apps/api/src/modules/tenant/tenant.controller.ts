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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

class TenantSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTalents?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  maxCustomersPerTalent?: number;

  @IsOptional()
  @IsString({ each: true })
  features?: string[];
}

class CreateTenantDto {
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/, { message: 'Code must be 3-32 uppercase letters, numbers, or underscores' })
  code: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  settings?: TenantSettingsDto;

  @ValidateNested()
  @Type(() => AdminUserDto)
  adminUser: AdminUserDto;
}

class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  settings?: TenantSettingsDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

class ListTenantsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tier?: 'ac' | 'standard';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sort?: string;
}

/**
 * Tenant Management Controller (AC Only)
 * PRD §7: AC 管理租户专用
 */
@ApiTags('Tenant Management')
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

    // System-defined resources
    const resources = [
      { code: 'customer.profile', module: 'customer', nameEn: 'Customer Profile', nameZh: '客户档案', nameJa: '顧客プロファイル' },
      { code: 'customer.membership', module: 'customer', nameEn: 'Membership Management', nameZh: '会员管理', nameJa: '会員管理' },
      { code: 'customer.import', module: 'customer', nameEn: 'Customer Import', nameZh: '客户导入', nameJa: '顧客インポート' },
      { code: 'org.subsidiary', module: 'organization', nameEn: 'Subsidiary Management', nameZh: '分级目录管理', nameJa: '組織管理' },
      { code: 'org.talent', module: 'organization', nameEn: 'Talent Management', nameZh: '艺人管理', nameJa: 'タレント管理' },
      { code: 'system_user.manage', module: 'user', nameEn: 'User Management', nameZh: '用户管理', nameJa: 'ユーザー管理' },
      { code: 'system_user.self', module: 'user', nameEn: 'Personal Profile', nameZh: '个人资料', nameJa: '個人設定' },
      { code: 'role.manage', module: 'user', nameEn: 'Role Management', nameZh: '角色管理', nameJa: 'ロール管理' },
      { code: 'config.entity', module: 'config', nameEn: 'Configuration Entity', nameZh: '配置实体', nameJa: '設定エンティティ' },
      { code: 'config.blocklist', module: 'config', nameEn: 'Blocklist Management', nameZh: '屏蔽词管理', nameJa: 'ブロックリスト管理' },
      { code: 'talent.homepage', module: 'page', nameEn: 'Homepage Management', nameZh: '主页管理', nameJa: 'ホームページ管理' },
      { code: 'talent.marshmallow', module: 'page', nameEn: 'Marshmallow Management', nameZh: '棉花糖管理', nameJa: 'マシュマロ管理' },
      { code: 'report.mfr', module: 'report', nameEn: 'Membership Feedback Report', nameZh: '会员回馈报表', nameJa: '会員フィードバックレポート' },
      { code: 'integration.adapter', module: 'integration', nameEn: 'Integration Adapter', nameZh: '接口适配器', nameJa: '連携アダプター' },
      { code: 'integration.webhook', module: 'integration', nameEn: 'Webhook Management', nameZh: 'Webhook管理', nameJa: 'Webhook管理' },
      { code: 'log.change_log', module: 'log', nameEn: 'Change Log', nameZh: '变更日志', nameJa: '変更ログ' },
      { code: 'log.tech_log', module: 'log', nameEn: 'Technical Event Log', nameZh: '技术事件日志', nameJa: '技術イベントログ' },
      { code: 'log.integration_log', module: 'log', nameEn: 'Integration Log', nameZh: '集成日志', nameJa: '連携ログ' },
      { code: 'config.pii_service', module: 'config', nameEn: 'PII Service Config', nameZh: 'PII服务配置', nameJa: 'PIIサービス設定' },
      { code: 'config.profile_store', module: 'config', nameEn: 'Profile Store', nameZh: '档案存储', nameJa: 'プロファイルストア' },
    ];

    // Insert resources
    for (const resource of resources) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".resource (id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, true, now(), now())
        ON CONFLICT (code) DO NOTHING
      `, resource.code, resource.module, resource.nameEn, resource.nameZh, resource.nameJa);
    }

    // System-defined roles with their policies
    const roles = [
      {
        code: 'TENANT_ADMIN',
        nameEn: 'Tenant Administrator',
        nameZh: '租户管理员',
        nameJa: 'テナント管理者',
        description: 'Full access to all tenant resources',
        isSystem: true,
        policies: resources.map(r => ({ resource: r.code, action: 'admin' })),
      },
      {
        code: 'TENANT_READONLY',
        nameEn: 'Tenant Read-Only',
        nameZh: '租户只读',
        nameJa: 'テナント読み取り専用',
        description: 'Read-only access to all tenant resources',
        isSystem: true,
        policies: resources.map(r => ({ resource: r.code, action: 'read' })),
      },
      {
        code: 'TALENT_MANAGER',
        nameEn: 'Talent Manager',
        nameZh: '艺人管理员',
        nameJa: 'タレントマネージャー',
        description: 'Can manage assigned talent and their customers',
        isSystem: true,
        policies: [
          { resource: 'customer.profile', action: 'admin' },
          { resource: 'customer.membership', action: 'admin' },
          { resource: 'customer.import', action: 'execute' },
          { resource: 'talent.homepage', action: 'admin' },
          { resource: 'talent.marshmallow', action: 'admin' },
          { resource: 'report.mfr', action: 'read' },
          { resource: 'report.mfr', action: 'execute' },
        ],
      },
      {
        code: 'SUBSIDIARY_MANAGER',
        nameEn: 'Subsidiary Manager',
        nameZh: '分级目录管理员',
        nameJa: '組織管理者',
        description: 'Can manage subsidiary and all talents within',
        isSystem: true,
        policies: [
          { resource: 'org.subsidiary', action: 'read' },
          { resource: 'org.talent', action: 'admin' },
          { resource: 'customer.profile', action: 'admin' },
          { resource: 'customer.membership', action: 'admin' },
          { resource: 'customer.import', action: 'execute' },
          { resource: 'config.entity', action: 'read' },
          { resource: 'report.mfr', action: 'admin' },
        ],
      },
      {
        code: 'REPORT_VIEWER',
        nameEn: 'Report Viewer',
        nameZh: '报表查看者',
        nameJa: 'レポート閲覧者',
        description: 'Can view reports',
        isSystem: true,
        policies: [
          { resource: 'report.mfr', action: 'read' },
        ],
      },
      {
        code: 'REPORT_OPERATOR',
        nameEn: 'Report Operator',
        nameZh: '报表操作员',
        nameJa: 'レポートオペレーター',
        description: 'Can generate and export reports',
        isSystem: true,
        policies: [
          { resource: 'report.mfr', action: 'read' },
          { resource: 'report.mfr', action: 'execute' },
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

      // Create policies and link to role
      for (const policy of role.policies) {
        await prisma.$executeRawUnsafe(`
          WITH resource_lookup AS (
            SELECT id FROM "${schemaName}".resource WHERE code = $1
          ),
          inserted_policy AS (
            INSERT INTO "${schemaName}".policy (id, resource_id, action, effect, is_active, created_at, updated_at)
            SELECT gen_random_uuid(), r.id, $2, 'allow', true, now(), now()
            FROM resource_lookup r
            ON CONFLICT (resource_id, action, effect) DO UPDATE SET updated_at = now()
            RETURNING id
          ),
          role_lookup AS (
            SELECT id FROM "${schemaName}".role WHERE code = $3
          )
          INSERT INTO "${schemaName}".role_policy (id, role_id, policy_id, created_at)
          SELECT gen_random_uuid(), rl.id, ip.id, now()
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
