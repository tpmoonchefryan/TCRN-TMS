// SPDX-License-Identifier: Apache-2.0
import type { PrismaClient } from '@tcrn/database';

const SQL_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertSafeTenantSchema(schemaName: string): string {
  if (!SQL_IDENTIFIER_PATTERN.test(schemaName)) {
    throw new Error('Worker job tenant schema is invalid');
  }

  return schemaName;
}

export async function assertWorkerTenantMetadata(
  prisma: PrismaClient,
  input: {
    tenantSchema: string;
    tenantId?: string;
  }
): Promise<string> {
  const tenantSchema = assertSafeTenantSchema(input.tenantSchema);
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; schemaName: string; isActive: boolean }>
  >(
    `
    SELECT id, schema_name as "schemaName", is_active as "isActive"
    FROM public.tenant
    WHERE schema_name = $1
    LIMIT 1
  `,
    tenantSchema
  );
  const tenant = rows[0];

  if (!tenant || tenant.schemaName !== tenantSchema || !tenant.isActive) {
    throw new Error('Worker job tenant schema is not active or registered');
  }

  if (input.tenantId && tenant.id !== input.tenantId) {
    throw new Error('Worker job tenant id does not match tenant schema metadata');
  }

  return tenantSchema;
}

export function assertWorkerObjectPath(
  objectPath: string,
  input: {
    tenantSchema: string;
    jobId: string;
    allowTenantRootInput?: boolean;
  }
): string {
  if (objectPath.includes('..') || objectPath.startsWith('/') || objectPath.includes('\\')) {
    throw new Error('Worker job object path is invalid');
  }

  const strictPrefix = `${input.tenantSchema}/${input.jobId}/`;
  const tenantRootPrefix = `${input.tenantSchema}/`;
  const isStrictJobPath = objectPath.startsWith(strictPrefix);
  const isTenantRootInput = input.allowTenantRootInput === true && objectPath.startsWith(tenantRootPrefix);

  if (!isStrictJobPath && !isTenantRootInput) {
    throw new Error('Worker job object path does not match tenant and job ownership');
  }

  return objectPath;
}

export function buildWorkerObjectPath(
  tenantSchema: string,
  jobId: string,
  fileName: string
): string {
  return assertWorkerObjectPath(`${tenantSchema}/${jobId}/${fileName}`, {
    tenantSchema,
    jobId,
  });
}
