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
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { prisma } from '@tcrn/database';
import {
  ErrorCodes,
  RBAC_POLICY_DEFINITIONS,
  RBAC_RESOURCES,
  RBAC_ROLE_TEMPLATES,
} from '@tcrn/shared';
import * as argon2 from 'argon2';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, Min, MinLength, ValidateNested } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated, success } from '../../common/response.util';
import { TenantService } from './tenant.service';

// DTOs
export class AdminUserDto {
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

export class TenantSettingsDto {
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

export class CreateTenantDto {
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

export class UpdateTenantDto {
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

export class ListTenantsQueryDto {
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

export class DeactivateTenantDto {
  @ApiPropertyOptional({ description: 'Operator note explaining why the tenant is being deactivated', example: 'UAT tenant retired' })
  @IsOptional()
  @IsString()
  reason?: string;
}

const createSuccessEnvelopeSchema = (dataSchema: Record<string, unknown>, exampleData: unknown) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: exampleData,
  },
});

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: { code, message },
  },
});

const TENANT_STATS_SCHEMA = {
  type: 'object',
  properties: {
    subsidiaryCount: { type: 'integer', example: 3 },
    talentCount: { type: 'integer', example: 12 },
    userCount: { type: 'integer', example: 8 },
  },
  required: ['subsidiaryCount', 'talentCount', 'userCount'],
};

const TENANT_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440400' },
    code: { type: 'string', example: 'ACME_CORP' },
    name: { type: 'string', example: 'Acme Corporation' },
    schemaName: { type: 'string', example: 'tenant_acme_corp' },
    tier: { type: 'string', enum: ['ac', 'standard'], example: 'standard' },
    isActive: { type: 'boolean', example: true },
    settings: { type: 'object', additionalProperties: true },
    stats: TENANT_STATS_SCHEMA,
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
  },
  required: ['id', 'code', 'name', 'schemaName', 'tier', 'isActive', 'settings', 'stats', 'createdAt', 'updatedAt'],
};

const TENANT_LIST_SUCCESS_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: TENANT_ITEM_SCHEMA },
    meta: {
      type: 'object',
      properties: {
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
            totalCount: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 1 },
            hasNext: { type: 'boolean', example: false },
            hasPrev: { type: 'boolean', example: false },
          },
          required: ['page', 'pageSize', 'totalCount', 'totalPages', 'hasNext', 'hasPrev'],
        },
      },
      required: ['pagination'],
    },
  },
  required: ['success', 'data', 'meta'],
  example: {
    success: true,
    data: [
      {
        id: '550e8400-e29b-41d4-a716-446655440400',
        code: 'ACME_CORP',
        name: 'Acme Corporation',
        schemaName: 'tenant_acme_corp',
        tier: 'standard',
        isActive: true,
        settings: { maxTalents: 100 },
        stats: { subsidiaryCount: 3, talentCount: 12, userCount: 8 },
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T09:00:00.000Z',
      },
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  },
};

const TENANT_DETAIL_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  TENANT_ITEM_SCHEMA,
  {
    id: '550e8400-e29b-41d4-a716-446655440400',
    code: 'ACME_CORP',
    name: 'Acme Corporation',
    schemaName: 'tenant_acme_corp',
    tier: 'standard',
    isActive: true,
    settings: { maxTalents: 100 },
    stats: { subsidiaryCount: 3, talentCount: 12, userCount: 8 },
    createdAt: '2026-04-13T08:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
  },
);

const TENANT_CREATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440400' },
      code: { type: 'string', example: 'ACME_CORP' },
      name: { type: 'string', example: 'Acme Corporation' },
      schemaName: { type: 'string', example: 'tenant_acme_corp' },
      tier: { type: 'string', enum: ['ac', 'standard'], example: 'standard' },
      isActive: { type: 'boolean', example: true },
      adminUser: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'admin' },
          email: { type: 'string', example: 'admin@example.com' },
        },
        required: ['username', 'email'],
      },
      createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    },
    required: ['id', 'code', 'name', 'schemaName', 'tier', 'isActive', 'adminUser', 'createdAt'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440400',
    code: 'ACME_CORP',
    name: 'Acme Corporation',
    schemaName: 'tenant_acme_corp',
    tier: 'standard',
    isActive: true,
    adminUser: {
      username: 'admin',
      email: 'admin@example.com',
    },
    createdAt: '2026-04-13T08:00:00.000Z',
  },
);

const TENANT_UPDATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440400' },
      code: { type: 'string', example: 'ACME_CORP' },
      name: { type: 'string', example: 'Acme Corp Inc.' },
      isActive: { type: 'boolean', example: true },
      settings: { type: 'object', additionalProperties: true },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:20:00.000Z' },
    },
    required: ['id', 'code', 'name', 'isActive', 'settings', 'updatedAt'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440400',
    code: 'ACME_CORP',
    name: 'Acme Corp Inc.',
    isActive: true,
    settings: { maxTalents: 150 },
    updatedAt: '2026-04-13T09:20:00.000Z',
  },
);

const TENANT_ACTIVATION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440400' },
      isActive: { type: 'boolean', example: true },
      activatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
    },
    required: ['id', 'isActive', 'activatedAt'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440400',
    isActive: true,
    activatedAt: '2026-04-13T09:30:00.000Z',
  },
);

const TENANT_DEACTIVATION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440400' },
      isActive: { type: 'boolean', example: false },
      deactivatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:35:00.000Z' },
      reason: { type: 'string', nullable: true, example: 'UAT tenant retired' },
    },
    required: ['id', 'isActive', 'deactivatedAt', 'reason'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440400',
    isActive: false,
    deactivatedAt: '2026-04-13T09:35:00.000Z',
    reason: 'UAT tenant retired',
  },
);

const TENANT_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.CODE_ALREADY_EXISTS,
  'Tenant code already exists',
);

const TENANT_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const TENANT_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Only AC tenant administrators can access this resource',
);

const TENANT_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.TENANT_NOT_FOUND,
  'Tenant not found',
);

const RBAC_ROLE_PERMISSION_ENTRIES = RBAC_ROLE_TEMPLATES.flatMap((role) =>
  role.permissions.flatMap((permission) =>
    permission.actions.map((action) => ({
      roleCode: role.code,
      resourceCode: permission.resourceCode,
      action,
      effect: permission.effect ?? 'grant',
    })),
  ),
);

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
    for (const resource of RBAC_RESOURCES) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".resource (id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now())
        ON CONFLICT (code) DO UPDATE
        SET module = EXCLUDED.module,
            name_en = EXCLUDED.name_en,
            name_zh = EXCLUDED.name_zh,
            name_ja = EXCLUDED.name_ja,
            sort_order = EXCLUDED.sort_order,
            is_active = true,
            updated_at = now()
      `, resource.code, resource.module, resource.nameEn, resource.nameZh, resource.nameJa, resource.sortOrder);
    }

    for (const policy of RBAC_POLICY_DEFINITIONS) {
      await prisma.$executeRawUnsafe(`
        WITH resource_lookup AS (
          SELECT id FROM "${schemaName}".resource WHERE code = $1
        )
        INSERT INTO "${schemaName}".policy (id, resource_id, action, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), r.id, $2, true, now(), now()
        FROM resource_lookup r
        ON CONFLICT (resource_id, action) DO UPDATE
        SET is_active = true,
            updated_at = now()
      `, policy.resourceCode, policy.action);
    }

    for (const role of RBAC_ROLE_TEMPLATES) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}".role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now(), 1)
        ON CONFLICT (code) DO UPDATE
        SET name_en = EXCLUDED.name_en,
            name_zh = EXCLUDED.name_zh,
            name_ja = EXCLUDED.name_ja,
            description = EXCLUDED.description,
            is_system = EXCLUDED.is_system,
            is_active = true,
            updated_at = now()
      `, role.code, role.nameEn, role.nameZh, role.nameJa, role.description, role.isSystem);
    }

    for (const entry of RBAC_ROLE_PERMISSION_ENTRIES) {
      await prisma.$executeRawUnsafe(`
        WITH role_lookup AS (
          SELECT id FROM "${schemaName}".role WHERE code = $1
        ),
        policy_lookup AS (
          SELECT p.id
          FROM "${schemaName}".policy p
          JOIN "${schemaName}".resource r ON r.id = p.resource_id
          WHERE r.code = $2 AND p.action = $3
        )
        INSERT INTO "${schemaName}".role_policy (id, role_id, policy_id, effect, created_at)
        SELECT gen_random_uuid(), rl.id, pl.id, $4, now()
        FROM role_lookup rl
        CROSS JOIN policy_lookup pl
        ON CONFLICT (role_id, policy_id) DO UPDATE SET effect = EXCLUDED.effect
      `, entry.roleCode, entry.resourceCode, entry.action, entry.effect);
    }
  }

  /**
   * GET /api/v1/tenants
   * List all tenants (AC only)
   */
  @Get()
  @ApiOperation({ summary: 'List tenants (AC only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated tenants for AC operators',
    schema: TENANT_LIST_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list tenants',
    schema: TENANT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can list tenants',
    schema: TENANT_FORBIDDEN_SCHEMA,
  })
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
  @ApiResponse({
    status: 201,
    description: 'Creates a tenant and its initial admin user',
    schema: TENANT_CREATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Tenant payload is invalid or the tenant code already exists',
    schema: TENANT_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create tenants',
    schema: TENANT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can create tenants',
    schema: TENANT_FORBIDDEN_SCHEMA,
  })
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
   * GET /api/v1/tenants/:tenantId
   * Get tenant details (AC only)
   */
  @Get(':tenantId')
  @ApiOperation({ summary: 'Get tenant details (AC only)' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns tenant detail',
    schema: TENANT_DETAIL_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read tenant detail',
    schema: TENANT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can read tenant detail',
    schema: TENANT_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant was not found',
    schema: TENANT_NOT_FOUND_SCHEMA,
  })
  async getTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    await this.verifyAcAccess(user);

    const tenant = await this.tenantService.getTenantById(tenantId);
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
   * PATCH /api/v1/tenants/:tenantId
   * Update tenant (AC only)
   */
  @Patch(':tenantId')
  @ApiOperation({ summary: 'Update tenant (AC only)' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated tenant',
    schema: TENANT_UPDATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update tenants',
    schema: TENANT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can update tenants',
    schema: TENANT_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant was not found',
    schema: TENANT_NOT_FOUND_SCHEMA,
  })
  async updateTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    await this.verifyAcAccess(user);

    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    // Update tenant
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
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
   * POST /api/v1/tenants/:tenantId/activate
   * Activate tenant (AC only)
   */
  @Post(':tenantId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate tenant (AC only)' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Activates the tenant',
    schema: TENANT_ACTIVATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to activate tenants',
    schema: TENANT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can activate tenants',
    schema: TENANT_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant was not found',
    schema: TENANT_NOT_FOUND_SCHEMA,
  })
  async activateTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    await this.verifyAcAccess(user);

    const tenant = await this.tenantService.setTenantActive(tenantId, true);
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
   * POST /api/v1/tenants/:tenantId/deactivate
   * Deactivate tenant (AC only)
   */
  @Post(':tenantId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate tenant (AC only)' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Deactivates the tenant',
    schema: TENANT_DEACTIVATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to deactivate tenants',
    schema: TENANT_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can deactivate tenants',
    schema: TENANT_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant was not found',
    schema: TENANT_NOT_FOUND_SCHEMA,
  })
  async deactivateTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() body: DeactivateTenantDto,
  ) {
    await this.verifyAcAccess(user);

    const tenant = await this.tenantService.setTenantActive(tenantId, false);
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
