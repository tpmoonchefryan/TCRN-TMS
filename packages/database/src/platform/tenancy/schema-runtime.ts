// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { prisma } from '../prisma/client';
import {
  alignTenantTemplateConstraintNames,
  alignTenantTemplateIndexNames,
  copyTenantTemplateForeignKeys,
  copyTenantTemplateSeedData,
} from './template-bootstrap';

export function getTenantSchemaName(tenantId: string): string {
  const shortId = tenantId.replace(/-/g, '').substring(0, 12);
  return `tenant_${shortId}`;
}

export async function setTenantSchema(tenantSchema: string): Promise<void> {
  await prisma.$executeRawUnsafe(`SET search_path TO "${tenantSchema}", public`);
}

export async function withTenantContext<T>(
  tenantSchema: string,
  fn: () => Promise<T>,
): Promise<T> {
  await setTenantSchema(tenantSchema);
  try {
    return await fn();
  } finally {
    await prisma.$executeRawUnsafe('SET search_path TO public');
  }
}

export async function createTenantSchema(tenantId: string): Promise<string> {
  const schemaName = getTenantSchemaName(tenantId);

  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_template'
  `;
  const tableNames = tables.map(({ tablename }) => tablename);

  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."${tablename}"
      (LIKE tenant_template."${tablename}" INCLUDING ALL)
    `);
  }

  await copyTenantTemplateSeedData(prisma, schemaName, tableNames);
  await copyTenantTemplateForeignKeys(prisma, schemaName, tableNames);
  await alignTenantTemplateConstraintNames(prisma, schemaName, tableNames);
  await alignTenantTemplateIndexNames(prisma, schemaName, tableNames);

  return schemaName;
}
