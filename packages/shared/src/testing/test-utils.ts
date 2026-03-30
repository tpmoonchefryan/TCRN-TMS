// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  RBAC_POLICY_DEFINITIONS,
  RBAC_RESOURCES,
  RBAC_ROLE_TEMPLATES,
} from '../rbac/catalog';

// =============================================================================
// Types
// =============================================================================

export interface UserContext {
  userId: string;
  tenantId: string;
  schemaName: string;
  roles: string[];
  permissions: Map<string, boolean>;
}

export interface TenantFixture {
  tenant: {
    id: string;
    code: string;
    name: string;
    schemaName: string;
    tier: string;
    isActive: boolean;
  };
  schemaName: string;
  cleanup: () => Promise<void>;
}

export interface TestUser {
  id: string;
  username: string;
  email: string;
  tenantId: string;
  schemaName: string;
  roles: string[];
  token?: string;
}

interface TestTenantArtifacts {
  tenantId: string;
  schemaName: string;
}

export interface MockPrismaClient {
  tenant: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  systemUser: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
  $transaction: ReturnType<typeof vi.fn>;
  [key: string]: unknown;
}

// Import vi from vitest for type hints (will be available at test runtime)
declare const vi: {
  fn: () => ReturnType<typeof Function>;
};

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

async function seedRbacContractIntoSchema(
  prisma: {
    $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  },
  schemaName: string,
): Promise<void> {
  for (const resource of RBAC_RESOURCES) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".resource (
        id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE
      SET module = EXCLUDED.module,
          name_en = EXCLUDED.name_en,
          name_zh = EXCLUDED.name_zh,
          name_ja = EXCLUDED.name_ja,
          sort_order = EXCLUDED.sort_order,
          is_active = true,
          updated_at = NOW()
    `, resource.code, resource.module, resource.nameEn, resource.nameZh, resource.nameJa, resource.sortOrder);
  }

  for (const policy of RBAC_POLICY_DEFINITIONS) {
    await prisma.$executeRawUnsafe(`
      WITH resource_lookup AS (
        SELECT id FROM "${schemaName}".resource WHERE code = $1
      )
      INSERT INTO "${schemaName}".policy (
        id, resource_id, action, is_active, created_at, updated_at
      )
      SELECT gen_random_uuid(), r.id, $2, true, NOW(), NOW()
      FROM resource_lookup r
      ON CONFLICT (resource_id, action) DO UPDATE
      SET is_active = true,
          updated_at = NOW()
    `, policy.resourceCode, policy.action);
  }

  for (const role of RBAC_ROLE_TEMPLATES) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".role (
        id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW(), 1)
      ON CONFLICT (code) DO UPDATE
      SET name_en = EXCLUDED.name_en,
          name_zh = EXCLUDED.name_zh,
          name_ja = EXCLUDED.name_ja,
          description = EXCLUDED.description,
          is_system = EXCLUDED.is_system,
          is_active = true,
          updated_at = NOW()
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
      INSERT INTO "${schemaName}".role_policy (
        id, role_id, policy_id, effect, created_at
      )
      SELECT gen_random_uuid(), rl.id, pl.id, $4, NOW()
      FROM role_lookup rl
      CROSS JOIN policy_lookup pl
      ON CONFLICT (role_id, policy_id) DO UPDATE SET effect = EXCLUDED.effect
    `, entry.roleCode, entry.resourceCode, entry.action, entry.effect);
  }
}

async function cleanupTestTenantArtifacts(
  prisma: {
    tenant: {
      update: (args: {
        where: { id: string };
        data: { isActive: boolean };
      }) => Promise<unknown>;
      delete: (args: { where: { id: string } }) => Promise<unknown>;
    };
    $executeRawUnsafe: (query: string) => Promise<unknown>;
  },
  artifacts: TestTenantArtifacts,
  options: {
    swallowErrors?: boolean;
    logPrefix?: string;
  } = {},
): Promise<void> {
  const errors: unknown[] = [];

  try {
    await prisma.tenant.update({
      where: { id: artifacts.tenantId },
      data: { isActive: false },
    });
  } catch (error) {
    errors.push(error);
  }

  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${artifacts.schemaName}" CASCADE`);
  } catch (error) {
    errors.push(error);
  }

  try {
    await prisma.tenant.delete({ where: { id: artifacts.tenantId } });
  } catch (error) {
    errors.push(error);
  }

  if (errors.length === 0) {
    return;
  }

  if (options.swallowErrors) {
    for (const error of errors) {
      console.warn(`${options.logPrefix ?? 'Cleanup warning'} for ${artifacts.schemaName}:`, error);
    }
    return;
  }

  const [firstError] = errors;
  throw firstError instanceof Error ? firstError : new Error(String(firstError));
}

// =============================================================================
// User Context Helpers
// =============================================================================

/**
 * Create test user context
 */
export function createTestUserContext(overrides?: Partial<UserContext>): UserContext {
  return {
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    schemaName: 'tenant_test',
    roles: ['ADMIN'],
    permissions: new Map(),
    ...overrides,
  };
}

/**
 * Create mock request context
 */
export function createMockRequestContext(overrides?: Record<string, unknown>) {
  return {
    userId: 'test-user-id',
    userName: 'testuser',
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
    requestId: `test-${Date.now()}`,
    ...overrides,
  };
}

// =============================================================================
// Mock Prisma Client
// =============================================================================

/**
 * Create a mock Prisma client for unit testing
 * Usage: const mockPrisma = createMockPrisma();
 */
export function createMockPrisma(): MockPrismaClient {
  const createModelMock = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    upsert: vi.fn(),
  });

  return {
    tenant: createModelMock(),
    systemUser: createModelMock(),
    globalConfig: createModelMock(),
    systemDictionary: createModelMock(),
    systemDictionaryItem: createModelMock(),
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  } as unknown as MockPrismaClient;
}

// =============================================================================
// Tenant Fixture Helpers (for integration tests)
// =============================================================================

/**
 * Generate unique tenant code for testing
 */
export function generateTestTenantCode(suffix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `TEST_${suffix}_${timestamp}_${random}`.toUpperCase().substring(0, 32);
}

/**
 * Generate schema name from tenant code
 */
export function generateSchemaName(tenantCode: string): string {
  return `tenant_${tenantCode.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)}`;
}

/**
 * Create a test tenant fixture with schema
 * NOTE: This requires a real PrismaClient instance and should only be used in integration tests
 *
 * @param prisma - Real PrismaClient instance
 * @param suffix - Optional suffix for tenant identification
 * @returns TenantFixture with cleanup function
 */
export async function createTestTenantFixture(
  prisma: {
    tenant: {
      create: (args: { data: Record<string, unknown> }) => Promise<{
        id: string;
        code: string;
        name: string;
        schemaName: string;
        tier: string;
        isActive: boolean;
      }>;
      update: (args: {
        where: { id: string };
        data: { isActive: boolean };
      }) => Promise<unknown>;
      delete: (args: { where: { id: string } }) => Promise<unknown>;
    };
    $executeRawUnsafe: (query: string) => Promise<unknown>;
    $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
  },
  suffix: string = ''
): Promise<TenantFixture> {
  const tenantCode = generateTestTenantCode(suffix);
  const schemaName = generateSchemaName(tenantCode);

  const tenant = await prisma.tenant.create({
    data: {
      code: tenantCode,
      name: `Test Tenant ${suffix || 'Default'}`,
      schemaName,
      tier: 'standard',
      isActive: true,
      settings: {},
    },
  });

  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    const templateTables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_template' ORDER BY tablename`
    );

    for (const { tablename } of templateTables) {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${schemaName}"."${tablename}" (LIKE tenant_template."${tablename}" INCLUDING ALL)`
      );
    }

    const seedTables = [
      'resource',
      'role',
      'policy',
      'role_policy',
      'social_platform',
      'pii_service_config',
      'profile_store',
      'blocklist_entry',
      'external_blocklist_pattern',
    ];

    for (const table of seedTables) {
      if (!templateTables.some((item) => item.tablename === table)) {
        continue;
      }

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}"."${table}"
        SELECT * FROM tenant_template."${table}"
        ON CONFLICT DO NOTHING
      `);
    }

    await seedRbacContractIntoSchema(prisma, schemaName);
  } catch (error) {
    await cleanupTestTenantArtifacts(
      prisma,
      {
        tenantId: tenant.id,
        schemaName,
      },
      {
        swallowErrors: true,
        logPrefix: 'Fixture rollback warning',
      },
    );
    throw error;
  }

  return {
    tenant,
    schemaName,
    cleanup: async () => {
      await cleanupTestTenantArtifacts(
        prisma,
        {
          tenantId: tenant.id,
          schemaName,
        },
        {
          swallowErrors: true,
          logPrefix: 'Cleanup warning',
        },
      );
    },
  };
}

/**
 * Create a test user in a tenant
 */
export async function createTestUserInTenant(
  prisma: {
    $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
    $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
  },
  tenantFixture: TenantFixture,
  username: string,
  roles: string[] = ['ADMIN']
): Promise<TestUser> {
  const userId = crypto.randomUUID();
  const email = `${username}@test.local`;
  const passwordHash =
    '$argon2id$v=19$m=65536,t=3,p=4$gyJDmMv4EDc/W8LEkp3Zbw$xWYYRsj+Jfn1xELTKSlXg8AAM+zvG+nAX3rHoOdABTM';

  // Insert user into tenant schema
  await prisma.$executeRawUnsafe(`
    INSERT INTO "${tenantFixture.schemaName}".system_user 
    (id, username, email, password_hash, password_changed_at, is_active, created_at, updated_at)
    VALUES ($1::uuid, $2, $3, $4, NOW(), true, NOW(), NOW())
  `, userId, username, email, passwordHash);

  // Assign roles
  for (const roleCode of roles) {
    const roleIds = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id
      FROM "${tenantFixture.schemaName}".role
      WHERE code = $1 AND is_active = true
      LIMIT 1
    `, roleCode);

    if (!roleIds.length) {
      throw new Error(`Role not found in ${tenantFixture.schemaName}: ${roleCode}`);
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantFixture.schemaName}".user_role
      (id, user_id, role_id, scope_type, scope_id, inherit, granted_at, granted_by)
      VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'tenant', NULL, true, NOW(), NULL)
    `, userId, roleIds[0].id);
  }

  return {
    id: userId,
    username,
    email,
    tenantId: tenantFixture.tenant.id,
    schemaName: tenantFixture.schemaName,
    roles,
  };
}

// =============================================================================
// Test Data Helpers
// =============================================================================

/**
 * Create test customer data in tenant schema
 */
export async function createTestCustomerInTenant(
  prisma: {
    $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
    $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
  },
  tenantFixture: TenantFixture,
  overrides: Partial<{
    nickname: string;
    profileType: string;
    rmProfileId: string;
    talentId: string;
    profileStoreId: string;
    createdBy: string;
  }> = {}
): Promise<{ id: string; nickname: string; rmProfileId: string }> {
  const customerId = crypto.randomUUID();
  const rmProfileId = overrides.rmProfileId || crypto.randomUUID();

  const createdBy = overrides.createdBy || (
    await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id
      FROM "${tenantFixture.schemaName}".system_user
      ORDER BY created_at ASC
      LIMIT 1
    `)
  )[0]?.id;

  const talent = overrides.talentId
    ? { id: overrides.talentId, profileStoreId: overrides.profileStoreId || null }
    : (
      await prisma.$queryRawUnsafe<Array<{ id: string; profileStoreId: string | null }>>(`
        SELECT id, profile_store_id as "profileStoreId"
        FROM "${tenantFixture.schemaName}".talent
        WHERE is_active = true
        ORDER BY created_at ASC
        LIMIT 1
      `)
    )[0];

  if (!createdBy) {
    throw new Error(`No system user found in ${tenantFixture.schemaName}`);
  }

  if (!talent?.id || !talent.profileStoreId) {
    throw new Error(`No active talent with profile store found in ${tenantFixture.schemaName}`);
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${tenantFixture.schemaName}".customer_profile
    (
      id, talent_id, profile_store_id, origin_talent_id, rm_profile_id, profile_type,
      nickname, tags, is_active, created_at, updated_at, created_by, updated_by
    )
    VALUES ($1::uuid, $2::uuid, $3::uuid, $2::uuid, $4::uuid, $5, $6, '{}', true, NOW(), NOW(), $7::uuid, $7::uuid)
  `, 
    customerId, 
    talent.id,
    talent.profileStoreId,
    rmProfileId,
    overrides.profileType || 'individual',
    overrides.nickname || 'Test Customer',
    createdBy,
  );

  return {
    id: customerId,
    nickname: overrides.nickname || 'Test Customer',
    rmProfileId,
  };
}

/**
 * Create test subsidiary in tenant schema
 */
export async function createTestSubsidiaryInTenant(
  prisma: {
    $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
    $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
  },
  tenantFixture: TenantFixture,
  overrides: Partial<{
    code: string;
    nameEn: string;
    createdBy: string;
  }> = {}
): Promise<{ id: string; code: string }> {
  const subsidiaryId = crypto.randomUUID();
  const code = overrides.code || `SUB_${Date.now().toString(36)}`;
  const createdBy = overrides.createdBy || (
    await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id
      FROM "${tenantFixture.schemaName}".system_user
      ORDER BY created_at ASC
      LIMIT 1
    `)
  )[0]?.id;

  if (!createdBy) {
    throw new Error(`No system user found in ${tenantFixture.schemaName}`);
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${tenantFixture.schemaName}".subsidiary 
    (id, code, path, depth, name_en, is_active, created_at, updated_at, created_by, updated_by)
    VALUES ($1::uuid, $2, $3, 0, $4, true, NOW(), NOW(), $5::uuid, $5::uuid)
  `, subsidiaryId, code, `/${code}/`, overrides.nameEn || 'Test Subsidiary', createdBy);

  return { id: subsidiaryId, code };
}

/**
 * Create test talent in tenant schema
 */
export async function createTestTalentInTenant(
  prisma: {
    $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
    $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
  },
  tenantFixture: TenantFixture,
  subsidiaryId: string | null,
  overrides: Partial<{
    code: string;
    nameEn: string;
    homepagePath: string;
    displayName: string;
    profileStoreId: string;
    createdBy: string;
  }> = {}
): Promise<{ id: string; code: string; homepagePath: string }> {
  const talentId = crypto.randomUUID();
  const code = overrides.code || `TALENT_${Date.now().toString(36)}`;
  const homepagePath = overrides.homepagePath || code.toLowerCase().replace(/_/g, '-');
  const createdBy = overrides.createdBy || (
    await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id
      FROM "${tenantFixture.schemaName}".system_user
      ORDER BY created_at ASC
      LIMIT 1
    `)
  )[0]?.id;
  const subsidiaryPath = subsidiaryId
    ? (
      await prisma.$queryRawUnsafe<Array<{ path: string }>>(`
        SELECT path
        FROM "${tenantFixture.schemaName}".subsidiary
        WHERE id = $1::uuid
        LIMIT 1
      `, subsidiaryId)
    )[0]?.path || '/'
    : '/';
  const profileStoreId = overrides.profileStoreId || (
    await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id
      FROM "${tenantFixture.schemaName}".profile_store
      WHERE is_active = true
      ORDER BY is_default DESC, created_at ASC
      LIMIT 1
    `)
  )[0]?.id;

  if (!createdBy) {
    throw new Error(`No system user found in ${tenantFixture.schemaName}`);
  }

  if (!profileStoreId) {
    throw new Error(`No active profile store found in ${tenantFixture.schemaName}`);
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${tenantFixture.schemaName}".talent 
    (
      id, code, path, name_en, display_name, subsidiary_id, profile_store_id,
      homepage_path, is_active, created_at, updated_at, created_by, updated_by
    )
    VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7::uuid, $8, true, NOW(), NOW(), $9::uuid, $9::uuid)
  `, talentId, code, `${subsidiaryPath}${code}/`, overrides.nameEn || 'Test Talent', overrides.displayName || overrides.nameEn || 'Test Talent', subsidiaryId, profileStoreId, homepagePath, createdBy);

  return { id: talentId, code, homepagePath };
}

// =============================================================================
// Authentication Helpers
// =============================================================================

/**
 * Generate a mock JWT token for testing
 * NOTE: This is for test purposes only, not cryptographically valid
 */
export function generateMockToken(payload: {
  userId: string;
  tenantId: string;
  username: string;
  schemaName: string;
  roles: string[];
}): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    sub: payload.userId,
    tenantId: payload.tenantId,
    username: payload.username,
    schemaName: payload.schemaName,
    roles: payload.roles,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    type: 'access',
  };

  const encodeBase64 = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  // Mock signature (not valid, for test only)
  const signature = 'mock-signature-for-testing';

  return `${encodeBase64(header)}.${encodeBase64(body)}.${signature}`;
}

/**
 * Get auth token for test user (for integration tests with real API)
 */
export async function getAuthToken(
  _app: { getHttpServer: () => unknown },
  user: TestUser,
  _password: string = 'TestPassword123!'
): Promise<string> {
  // This would use supertest to call the login endpoint
  // For now, return a mock token
  return generateMockToken({
    userId: user.id,
    tenantId: user.tenantId,
    username: user.username,
    schemaName: user.schemaName,
    roles: user.roles,
  });
}

// =============================================================================
// Multi-Tenant Context Helpers
// =============================================================================

export interface TenantContext {
  tenantId: string;
  tenantCode: string;
  schemaName: string;
  tier: string;
}

/**
 * Create mock tenant context for testing
 */
export function createMockTenantContext(overrides?: Partial<TenantContext>): TenantContext {
  return {
    tenantId: 'test-tenant-id',
    tenantCode: 'TEST_TENANT',
    schemaName: 'tenant_test',
    tier: 'standard',
    ...overrides,
  };
}

// =============================================================================
// PII Service Mock Helpers
// =============================================================================

export interface PiiData {
  givenName?: string;
  familyName?: string;
  phoneNumbers?: Array<{ type: string; number: string }>;
  emails?: Array<{ type: string; address: string }>;
  addresses?: Array<{ type: string; line1: string; city: string; country: string }>;
}

export interface MockPiiResponse {
  profileId: string;
  data: PiiData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create mock PII service response for testing
 */
export function createMockPiiResponse(
  profileId: string,
  data: Partial<PiiData> = {}
): MockPiiResponse {
  return {
    profileId,
    data: {
      givenName: data.givenName ?? 'Test',
      familyName: data.familyName ?? 'User',
      phoneNumbers: data.phoneNumbers ?? [{ type: 'mobile', number: '+1234567890' }],
      emails: data.emails ?? [{ type: 'personal', address: 'test@example.com' }],
      addresses: data.addresses ?? [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create mock PII service for testing
 */
export function createMockPiiService() {
  return {
    getProfile: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
    batchGetProfiles: vi.fn(),
  };
}

// =============================================================================
// Audit Log Helpers
// =============================================================================

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  operatorId: string;
  diff?: Record<string, unknown>;
  occurredAt: string;
}

/**
 * Create expected audit log entry for verification
 */
// Placeholder for expect - will be available at test runtime
declare const expect: {
  any: <T>(type: T) => T extends StringConstructor ? string : unknown;
};

export function createExpectedAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  operatorId: string,
  diff?: Record<string, unknown>
): AuditLogEntry {
  return {
    action,
    entityType,
    entityId,
    operatorId,
    diff,
    occurredAt: expect.any(String) as string,
  };
}

/**
 * Verify audit log was written (for integration tests)
 */
export async function expectAuditLogWritten(
  prisma: {
    $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
  },
  schemaName: string,
  action: string,
  entityId: string
): Promise<boolean> {
  const logs = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".change_log 
     WHERE action = $1 AND entity_id = $2 
     ORDER BY occurred_at DESC LIMIT 1`,
    action,
    entityId
  );
  return logs.length > 0;
}

// =============================================================================
// Report Testing Helpers
// =============================================================================

export interface MfrTestData {
  customers: Array<{
    id: string;
    nickname: string;
    rmProfileId: string;
  }>;
  memberships: Array<{
    customerId: string;
    classCode: string;
    typeCode: string;
    levelCode: string;
    validFrom: Date;
    validTo: Date | null;
  }>;
}

/**
 * Create test data for MFR report testing
 */
export function createMfrTestData(count: number = 10): MfrTestData {
  const customers: MfrTestData['customers'] = [];
  const memberships: MfrTestData['memberships'] = [];

  for (let i = 0; i < count; i++) {
    const customerId = crypto.randomUUID();
    customers.push({
      id: customerId,
      nickname: `Test Customer ${i + 1}`,
      rmProfileId: crypto.randomUUID(),
    });

    // Add 1-3 memberships per customer
    const membershipCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < membershipCount; j++) {
      memberships.push({
        customerId,
        classCode: ['SUBSCRIPTION', 'FANCLUB', 'VIP'][j % 3],
        typeCode: ['MONTHLY', 'YEARLY'][j % 2],
        levelCode: ['BRONZE', 'SILVER', 'GOLD'][j % 3],
        validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 * (j + 1)),
        validTo: j === 0 ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  return { customers, memberships };
}

// =============================================================================
// Performance Testing Helpers
// =============================================================================

/**
 * Measure execution time of async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

/**
 * Assert execution time is within threshold
 */
export async function assertExecutionTime<T>(
  fn: () => Promise<T>,
  maxMs: number,
  description: string = 'Operation'
): Promise<T> {
  const { result, durationMs } = await measureExecutionTime(fn);
  if (durationMs > maxMs) {
    throw new Error(
      `${description} took ${durationMs.toFixed(2)}ms, exceeding threshold of ${maxMs}ms`
    );
  }
  return result;
}
