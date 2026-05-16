// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
//
// Upsert only the canonical UAT auth fixtures needed by acceptance.
// This avoids rerunning the full UAT seed, which would duplicate customer and
// membership sample data in a reused local DB.

import type { UatTenantResult } from '../prisma/seeds/20-uat-tenant';
import type { UatOrganizationResult } from '../prisma/seeds/21-uat-organization';
import { seedUatUsers } from '../prisma/seeds/22-uat-users';
import { loadRepoEnvFiles } from './load-repo-env';
import { disconnectPrisma, prisma } from '../src/platform/prisma/client';

loadRepoEnvFiles(import.meta.url);

interface PublicTenantRow {
  id: string;
  code: string;
  schemaName: string;
}

interface ScopedRow {
  id: string;
  code: string;
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

async function getTenant(code: string): Promise<PublicTenantRow> {
  return requireRow(
    await prisma.tenant.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        schemaName: true,
      },
    }),
    `Tenant ${code} was not found. Run pnpm --filter @tcrn/database db:seed:uat.`,
  );
}

async function getScopedRows(
  schemaName: string,
  tableName: 'subsidiary' | 'talent',
  codes: string[],
): Promise<Record<string, string>> {
  const rows = await prisma.$queryRawUnsafe<ScopedRow[]>(
    `
      SELECT id, code
      FROM "${schemaName}"."${tableName}"
      WHERE code = ANY($1::text[])
      ORDER BY code ASC
    `,
    codes,
  );

  const map = Object.fromEntries(rows.map((row) => [row.code, row.id])) as Record<string, string>;
  const missingCodes = codes.filter((code) => !map[code]);

  if (missingCodes.length > 0) {
    throw new Error(
      `Missing ${tableName} fixtures in ${schemaName}: ${missingCodes.join(', ')}. Run pnpm --filter @tcrn/database db:seed:uat.`,
    );
  }

  return map;
}

async function main() {
  const [corpTenant, soloTenant] = await Promise.all([
    getTenant('UAT_CORP'),
    getTenant('UAT_SOLO'),
  ]);

  const [corpSubsidiaries, corpTalents, soloTalents] = await Promise.all([
    getScopedRows(corpTenant.schemaName, 'subsidiary', ['BU_GAMING', 'BU_MUSIC']),
    getScopedRows(corpTenant.schemaName, 'talent', [
      'TALENT_SAKURA',
      'TALENT_LUNA',
      'TALENT_HANA',
    ]),
    getScopedRows(soloTenant.schemaName, 'talent', ['TALENT_SOLO_STAR']),
  ]);

  const uatTenants: UatTenantResult = {
    corpTenant,
    soloTenant,
    corpSchemaName: corpTenant.schemaName,
    soloSchemaName: soloTenant.schemaName,
  };
  const uatOrg: UatOrganizationResult = {
    subsidiaries: corpSubsidiaries,
    talents: {
      ...corpTalents,
      ...soloTalents,
    },
  };

  const result = await seedUatUsers(prisma, uatTenants, uatOrg);

  process.stdout.write(`${JSON.stringify({
    corpUsers: Object.keys(result.corpUsers).sort(),
    soloUsers: Object.keys(result.soloUsers).sort(),
  }, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
