// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

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
    roles: ['TENANT_ADMIN'],
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
      delete: (args: { where: { id: string } }) => Promise<unknown>;
    };
    $executeRawUnsafe: (query: string) => Promise<unknown>;
  },
  suffix: string = ''
): Promise<TenantFixture> {
  const tenantCode = generateTestTenantCode(suffix);
  const schemaName = generateSchemaName(tenantCode);

  // Create tenant record
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

  // Create schema (copy from template)
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

  // Copy tables from tenant_template schema
  const templateTables = [
    'subsidiary',
    'talent',
    'system_user',
    'system_role',
    'role_policy',
    'user_role',
    'customer',
    'platform_identity',
    'membership',
    'change_log',
    'technical_event_log',
    'integration_log',
  ];

  for (const table of templateTables) {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."${table}" (LIKE "tenant_template"."${table}" INCLUDING ALL)`
    );
  }

  return {
    tenant,
    schemaName,
    cleanup: async () => {
      try {
        // Drop schema cascade
        await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        // Delete tenant record
        await prisma.tenant.delete({ where: { id: tenant.id } });
      } catch (error) {
        // Ignore cleanup errors in tests
        console.warn(`Cleanup warning for ${schemaName}:`, error);
      }
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
  roles: string[] = ['TENANT_ADMIN']
): Promise<TestUser> {
  const userId = crypto.randomUUID();
  const email = `${username}@test.local`;

  // Insert user into tenant schema
  await prisma.$executeRawUnsafe(`
    INSERT INTO "${tenantFixture.schemaName}".system_user 
    (id, username, email, password_hash, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, true, NOW(), NOW())
  `, userId, username, email, '$argon2id$v=19$m=65536,t=3,p=4$placeholder');

  // Assign roles
  for (const roleCode of roles) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantFixture.schemaName}".user_role (id, user_id, role_code, created_at)
      SELECT gen_random_uuid(), $1, code, NOW()
      FROM "${tenantFixture.schemaName}".system_role
      WHERE code = $2
    `, userId, roleCode);
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
  },
  tenantFixture: TenantFixture,
  overrides: Partial<{
    nickname: string;
    profileType: string;
    rmProfileId: string;
  }> = {}
): Promise<{ id: string; nickname: string; rmProfileId: string }> {
  const customerId = crypto.randomUUID();
  const rmProfileId = overrides.rmProfileId || crypto.randomUUID();

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${tenantFixture.schemaName}".customer 
    (id, nickname, profile_type, rm_profile_id, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
  `, 
    customerId, 
    overrides.nickname || 'Test Customer',
    overrides.profileType || 'individual',
    rmProfileId
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
  },
  tenantFixture: TenantFixture,
  overrides: Partial<{
    code: string;
    nameEn: string;
  }> = {}
): Promise<{ id: string; code: string }> {
  const subsidiaryId = crypto.randomUUID();
  const code = overrides.code || `SUB_${Date.now().toString(36)}`;

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${tenantFixture.schemaName}".subsidiary 
    (id, code, name_en, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, true, NOW(), NOW())
  `, subsidiaryId, code, overrides.nameEn || 'Test Subsidiary');

  return { id: subsidiaryId, code };
}

/**
 * Create test talent in tenant schema
 */
export async function createTestTalentInTenant(
  prisma: {
    $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  },
  tenantFixture: TenantFixture,
  subsidiaryId: string | null,
  overrides: Partial<{
    code: string;
    nameEn: string;
    homepagePath: string;
  }> = {}
): Promise<{ id: string; code: string; homepagePath: string }> {
  const talentId = crypto.randomUUID();
  const code = overrides.code || `TALENT_${Date.now().toString(36)}`;
  const homepagePath = overrides.homepagePath || code.toLowerCase().replace(/_/g, '-');

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${tenantFixture.schemaName}".talent 
    (id, code, name_en, subsidiary_id, homepage_path, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
  `, talentId, code, overrides.nameEn || 'Test Talent', subsidiaryId, homepagePath);

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
