// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { PrismaClient, Tenant } from '../../src/platform/prisma/client';
import {
  ASSIGNABLE_CAPABILITY_CODES,
  buildDefaultCapabilityCodesForTenant,
  compareCapabilityCodes,
  normalizeAssignableCapabilityCodes,
} from '@tcrn/shared';

export interface SeedTenantCapabilityOptions {
  tenant: Pick<Tenant, 'id' | 'code' | 'tier'>;
  enabledCapabilityCodes?: readonly string[];
  source?: 'seed' | 'migration' | 'ac_manual' | 'system';
  note?: string;
}

export async function syncSeedTenantCapabilities(
  prisma: PrismaClient,
  options: SeedTenantCapabilityOptions
): Promise<string[]> {
  const source = options.source ?? 'seed';
  const requestedCodes =
    options.enabledCapabilityCodes ?? buildDefaultCapabilityCodesForTenant(options.tenant.tier);
  const normalized = normalizeAssignableCapabilityCodes(requestedCodes);

  if (
    normalized.invalidCapabilityCodes.length > 0 ||
    normalized.nonAssignableCapabilityCodes.length > 0
  ) {
    throw new Error(
      [
        `Invalid capability seed request for tenant ${options.tenant.code}.`,
        normalized.invalidCapabilityCodes.length > 0
          ? `Unknown: ${normalized.invalidCapabilityCodes.join(', ')}.`
          : '',
        normalized.nonAssignableCapabilityCodes.length > 0
          ? `Non-assignable: ${normalized.nonAssignableCapabilityCodes.join(', ')}.`
          : '',
      ]
        .filter(Boolean)
        .join(' ')
    );
  }

  const enabledCodes = normalized.enabledCapabilityCodes;
  const enabledSet = new Set(enabledCodes);
  const note =
    options.note ?? 'Seeded by Phase 1 module capability registry rollout; no retired feature key.';

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `
        INSERT INTO public.tenant_capability_state (tenant_id, version, updated_at)
        VALUES ($1::uuid, 1, now())
        ON CONFLICT (tenant_id) DO UPDATE SET updated_at = now()
      `,
      options.tenant.id
    );

    for (const capabilityCode of ASSIGNABLE_CAPABILITY_CODES) {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO public.tenant_capability_assignment (
            tenant_id,
            capability_code,
            enabled,
            source,
            assigned_at,
            updated_at,
            note
          )
          VALUES ($1::uuid, $2, $3, $4, now(), now(), $5)
          ON CONFLICT (tenant_id, capability_code) DO UPDATE SET
            enabled = CASE
              WHEN tenant_capability_assignment.source IN ('seed', 'migration', 'system')
                THEN EXCLUDED.enabled
              ELSE tenant_capability_assignment.enabled
            END,
            source = CASE
              WHEN tenant_capability_assignment.source IN ('seed', 'migration', 'system')
                THEN EXCLUDED.source
              ELSE tenant_capability_assignment.source
            END,
            updated_at = CASE
              WHEN tenant_capability_assignment.source IN ('seed', 'migration', 'system')
                THEN now()
              ELSE tenant_capability_assignment.updated_at
            END,
            note = CASE
              WHEN tenant_capability_assignment.source IN ('seed', 'migration', 'system')
                THEN EXCLUDED.note
              ELSE tenant_capability_assignment.note
            END
        `,
        options.tenant.id,
        capabilityCode,
        enabledSet.has(capabilityCode),
        source,
        note
      );
    }

    await tx.$executeRawUnsafe(
      `
        UPDATE public.tenant
        SET settings = settings - 'features',
            updated_at = now()
        WHERE id = $1::uuid
          AND settings ? 'features'
      `,
      options.tenant.id
    );
  });

  console.log(
    `    ✓ Synced tenant capabilities for ${options.tenant.code}: ${
      enabledCodes.length > 0 ? enabledCodes.join(', ') : 'none'
    }`
  );

  return enabledCodes.sort(compareCapabilityCodes);
}
