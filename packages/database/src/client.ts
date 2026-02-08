// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PrismaClient } from '@prisma/client';

// Global Prisma Client instance for development
// Prevents multiple instances during hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client configuration with logging
 */
const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
};

/**
 * Singleton Prisma Client instance
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Get tenant schema name from tenant ID
 * Example: 550e8400-e29b-41d4-a716-446655440000 → tenant_550e8400e29b
 */
export function getTenantSchemaName(tenantId: string): string {
  const shortId = tenantId.replace(/-/g, '').substring(0, 12);
  return `tenant_${shortId}`;
}

/**
 * Set search_path to tenant schema for multi-tenant queries
 * @param tenantSchema - The tenant schema name (e.g., 'tenant_550e8400e29b')
 */
export async function setTenantSchema(tenantSchema: string): Promise<void> {
  await prisma.$executeRawUnsafe(`SET search_path TO "${tenantSchema}", public`);
}

/**
 * Execute a function within a tenant context
 * Automatically sets and resets the search_path
 */
export async function withTenantContext<T>(
  tenantSchema: string,
  fn: () => Promise<T>
): Promise<T> {
  await setTenantSchema(tenantSchema);
  try {
    return await fn();
  } finally {
    // Reset to public schema
    await prisma.$executeRawUnsafe('SET search_path TO public');
  }
}

/**
 * Create a new tenant schema by copying from tenant_template
 * @param tenantId - The new tenant's UUID
 */
export async function createTenantSchema(tenantId: string): Promise<string> {
  const schemaName = getTenantSchemaName(tenantId);
  
  // Create schema
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  
  // Get all tables from tenant_template
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_template'
  `;
  
  // Copy table structures (not data)
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."${tablename}" 
      (LIKE tenant_template."${tablename}" INCLUDING ALL)
    `);
  }
  
  // Copy seed data for reference tables (resources, platforms, roles, policies, config entities, blocklists)
  const seedTables = [
    'resource', 
    'social_platform', 
    'role', 
    'policy', 
    'role_policy',
    'pii_service_config',      // PII service configurations
    'profile_store',           // Profile store configurations
    'blocklist_entry',         // Blocklist entries for content moderation
    'external_blocklist_pattern', // External blocklist patterns
  ];
  for (const table of seedTables) {
    if (tables.some(t => t.tablename === table)) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schemaName}"."${table}"
        SELECT * FROM tenant_template."${table}"
        ON CONFLICT DO NOTHING
      `);
    }
  }
  
  return schemaName;
}

/**
 * Graceful shutdown helper
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Health check helper
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { Prisma,PrismaClient } from '@prisma/client';
