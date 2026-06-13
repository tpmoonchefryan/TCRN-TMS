// SPDX-License-Identifier: Apache-2.0
//
// Resolve the current local DB ids for the canonical WS6 UAT private surfaces.
// This avoids baking transient UUIDs into acceptance ledgers or browser notes.

import {
  buildUatPrivateFixtureRoutes,
  UAT_PRIVATE_ROUTE_FIXTURE,
} from '../src/domains/acceptance/uat-private-route-fixtures';
import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

const prisma = new PrismaClient();

interface TenantLookupRow {
  id: string;
  code: string;
  schemaName: string | null;
  isActive: boolean;
}

interface ScopedLookupRow {
  id: string;
  code: string;
}

interface UserLookupRow {
  id: string;
  username: string;
}

interface CustomerLookupRow {
  id: string;
  nickname: string;
}

function requireRow<T>(
  row: T | null | undefined,
  message: string,
): T {
  if (row) {
    return row;
  }

  throw new Error(message);
}

async function main() {
  const tenant = requireRow<TenantLookupRow>(
    await prisma.tenant.findUnique({
      where: { code: UAT_PRIVATE_ROUTE_FIXTURE.tenantCode },
      select: {
        id: true,
        code: true,
        schemaName: true,
        isActive: true,
      },
    }),
    `Tenant fixture ${UAT_PRIVATE_ROUTE_FIXTURE.tenantCode} was not found. Run pnpm --filter @tcrn/database db:seed:uat.`,
  );

  if (!tenant.isActive) {
    throw new Error(`Tenant fixture ${tenant.code} is inactive.`);
  }

  const tenantSchema = tenant.schemaName;

  if (tenantSchema !== UAT_PRIVATE_ROUTE_FIXTURE.tenantSchemaName) {
    throw new Error(
      `Tenant fixture ${tenant.code} resolved schema ${tenantSchema ?? 'null'}, expected ${UAT_PRIVATE_ROUTE_FIXTURE.tenantSchemaName}.`,
    );
  }

  const [subsidiary, talent, adminUser, viewerUser, firstCustomer] = await Promise.all([
    prisma.$queryRawUnsafe<ScopedLookupRow[]>(
      `
        SELECT id, code
        FROM "${tenantSchema}".subsidiary
        WHERE code = $1
        LIMIT 1
      `,
      UAT_PRIVATE_ROUTE_FIXTURE.subsidiaryCode,
    ),
    prisma.$queryRawUnsafe<ScopedLookupRow[]>(
      `
        SELECT id, code
        FROM "${tenantSchema}".talent
        WHERE code = $1
        LIMIT 1
      `,
      UAT_PRIVATE_ROUTE_FIXTURE.talentCode,
    ),
    prisma.$queryRawUnsafe<UserLookupRow[]>(
      `
        SELECT id, username
        FROM "${tenantSchema}".system_user
        WHERE username = $1
        LIMIT 1
      `,
      UAT_PRIVATE_ROUTE_FIXTURE.adminUsername,
    ),
    prisma.$queryRawUnsafe<UserLookupRow[]>(
      `
        SELECT id, username
        FROM "${tenantSchema}".system_user
        WHERE username = $1
        LIMIT 1
      `,
      UAT_PRIVATE_ROUTE_FIXTURE.viewerUsername,
    ),
    prisma.$queryRawUnsafe<CustomerLookupRow[]>(
      `
        SELECT id, nickname
        FROM "${tenantSchema}".customer_profile
        WHERE talent_id = (
          SELECT id
          FROM "${tenantSchema}".talent
          WHERE code = $1
          LIMIT 1
        )
        ORDER BY created_at ASC, id ASC
        LIMIT 1
      `,
      UAT_PRIVATE_ROUTE_FIXTURE.talentCode,
    ),
  ]);

  const resolvedSubsidiary = requireRow(
    subsidiary[0],
    `Subsidiary fixture ${UAT_PRIVATE_ROUTE_FIXTURE.subsidiaryCode} was not found in ${tenantSchema}. Run pnpm --filter @tcrn/database db:seed:uat.`,
  );
  const resolvedTalent = requireRow(
    talent[0],
    `Talent fixture ${UAT_PRIVATE_ROUTE_FIXTURE.talentCode} was not found in ${tenantSchema}. Run pnpm --filter @tcrn/database db:seed:uat.`,
  );
  const resolvedAdminUser = requireRow(
    adminUser[0],
    `Fixture user ${UAT_PRIVATE_ROUTE_FIXTURE.adminUsername} was not found in ${tenantSchema}. Run pnpm --filter @tcrn/database exec tsx scripts/ensure-uat-acceptance-users.ts.`,
  );
  const resolvedViewerUser = requireRow(
    viewerUser[0],
    `Fixture user ${UAT_PRIVATE_ROUTE_FIXTURE.viewerUsername} was not found in ${tenantSchema}. Run pnpm --filter @tcrn/database exec tsx scripts/ensure-uat-acceptance-users.ts.`,
  );

  const routes = buildUatPrivateFixtureRoutes({
    tenantId: tenant.id,
    subsidiaryId: resolvedSubsidiary.id,
    talentId: resolvedTalent.id,
    firstCustomerId: firstCustomer[0]?.id ?? null,
  });

  process.stdout.write(`${JSON.stringify({
    fixture: {
      tenant: {
        code: tenant.code,
        id: tenant.id,
        schemaName: tenantSchema,
      },
      subsidiary: resolvedSubsidiary,
      talent: resolvedTalent,
      users: {
        admin: resolvedAdminUser,
        viewer: resolvedViewerUser,
      },
      firstCustomer: firstCustomer[0]
        ? {
            id: firstCustomer[0].id,
            nickname: firstCustomer[0].nickname,
          }
        : null,
    },
    routes,
  }, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
