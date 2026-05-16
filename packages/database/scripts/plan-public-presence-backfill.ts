// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
//
// Read-only migration dry-run for legacy homepage -> Public Presence backfill.

import {
  importLegacyHomepageContent,
  type LegacyHomepageContentInput,
} from '@tcrn/shared';

import { loadRepoEnvFiles } from './load-repo-env';
import { disconnectPrisma, prisma } from '../src/platform/prisma/client';

loadRepoEnvFiles(import.meta.url);

interface TenantRow {
  code: string;
  schemaName: string | null;
}

interface LegacyHomepageRow {
  content: LegacyHomepageContentInput;
  existingPortalId: string | null;
  homepageId: string;
  publishedVersionId: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  talentCode: string;
  talentId: string;
  theme: Record<string, unknown> | null;
  versionId: string;
}

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function resolveTenants(): Promise<TenantRow[]> {
  const tenantCode = getArg('--tenant-code');
  const schemaName = getArg('--schema');

  if (tenantCode) {
    const tenant = await prisma.tenant.findUnique({
      where: { code: tenantCode },
      select: { code: true, schemaName: true },
    });

    return tenant ? [tenant] : [];
  }

  if (schemaName) {
    const tenants = await prisma.tenant.findMany({
      where: { schemaName },
      select: { code: true, schemaName: true },
      take: 1,
    });

    return tenants;
  }

  return prisma.tenant.findMany({
    where: { isActive: true },
    select: { code: true, schemaName: true },
    orderBy: { code: 'asc' },
  });
}

async function readLegacyHomepages(
  schemaName: string,
  limit: number | null,
): Promise<LegacyHomepageRow[]> {
  const query = `
    SELECT
      h.id as "homepageId",
      h.seo_title as "seoTitle",
      h.seo_description as "seoDescription",
      h.published_version_id as "publishedVersionId",
      t.id as "talentId",
      t.code as "talentCode",
      v.id as "versionId",
      v.content,
      v.theme,
      portal.id as "existingPortalId"
    FROM "${schemaName}".talent_homepage h
    JOIN "${schemaName}".talent t
      ON t.id = h.talent_id
    JOIN "${schemaName}".homepage_version v
      ON v.id = COALESCE(h.published_version_id, h.draft_version_id)
    LEFT JOIN "${schemaName}".public_presence_portal portal
      ON portal.talent_id = t.id
    ORDER BY t.code ASC
    ${limit ? `LIMIT ${limit}` : ''}
  `;

  return prisma.$queryRawUnsafe<LegacyHomepageRow[]>(query);
}

async function main() {
  const limitArg = getArg('--limit');
  const limit = limitArg ? Number.parseInt(limitArg, 10) : null;

  if (limitArg && (!Number.isFinite(limit) || (limit ?? 0) <= 0)) {
    throw new Error('--limit must be a positive integer.');
  }

  const includeExisting = hasFlag('--include-existing');
  const tenants = await resolveTenants();

  if (tenants.length === 0) {
    throw new Error('No matching tenant records found for the requested scope.');
  }

  const report = [];

  for (const tenant of tenants) {
    if (!tenant.schemaName) {
      report.push({
        tenantCode: tenant.code,
        schemaName: null,
        error: 'Tenant schema is null.',
      });
      continue;
    }

    const homepages = await readLegacyHomepages(tenant.schemaName, limit);
    const talentReports = homepages
      .filter((row) => includeExisting || !row.existingPortalId)
      .map((row) => {
        const result = importLegacyHomepageContent({
          content: row.content,
          seoDescription: row.seoDescription,
          seoTitle: row.seoTitle,
          sourceHomepageId: row.homepageId,
          sourceVersionId: row.versionId,
          theme: row.theme,
        });

        return {
          talentId: row.talentId,
          talentCode: row.talentCode,
          homepageId: row.homepageId,
          sourceVersionId: row.versionId,
          publishedVersionId: row.publishedVersionId,
          existingPortalId: row.existingPortalId,
          blockerCount: result.dryRunReport.blockerIssueIds.length,
          mappedCount: result.dryRunReport.mappedCount,
          lockedSourceOwnedCount: result.dryRunReport.lockedSourceOwnedCount,
          unsafeBlockedCount: result.dryRunReport.unsafeBlockedCount,
          unsupportedCount: result.dryRunReport.unsupportedCount,
          hasCompatibilitySection: result.dryRunReport.hasCompatibilitySection,
          issueCodes: result.dryRunReport.issueCodes,
          sectionKinds: result.dryRunReport.sectionKinds,
        };
      });

    report.push({
      tenantCode: tenant.code,
      schemaName: tenant.schemaName,
      scanned: homepages.length,
      candidates: talentReports.length,
      blockers: talentReports.filter((entry) => entry.blockerCount > 0).length,
      talents: talentReports,
    });
  }

  process.stdout.write(`${JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    includeExisting,
    limit,
    report,
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
