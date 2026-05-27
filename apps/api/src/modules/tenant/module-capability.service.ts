// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '@tcrn/database';
import {
  CAPABILITY_DEFINITIONS,
  ErrorCodes,
  MODULE_DEFINITIONS,
  MODULE_CAPABILITY_REGISTRY,
  MODULE_CAPABILITY_REGISTRY_VERSION,
  normalizeAssignableCapabilityCodes,
  stripLegacyFeatureSettings,
  summarizeCapabilities,
  type CapabilityAssignmentInput,
  type CapabilityScopeType,
} from '@tcrn/shared';

import type { AuthenticatedUser } from '../../common/decorators';
import { TenantService } from './tenant.service';

type TenantRecord = NonNullable<Awaited<ReturnType<TenantService['getTenantById']>>>;

interface AssignmentRow {
  capabilityCode: string;
  enabled: boolean;
  source: string;
  assignedBy: string | null;
  assignedAt: Date | string | null;
  updatedBy: string | null;
  updatedAt: Date | string | null;
  note: string | null;
}

interface StateRow {
  version: number;
  updatedAt: Date | string;
}

export interface TenantCapabilityPayload {
  enabledCapabilityCodes: string[];
  version: number;
  note?: string | null;
}

@Injectable()
export class ModuleCapabilityService {
  constructor(private readonly tenantService: TenantService) {}

  getRegistry() {
    return MODULE_CAPABILITY_REGISTRY;
  }

  async verifyAcAccess(user: AuthenticatedUser): Promise<void> {
    const tenant = await this.tenantService.getTenantById(user.tenantId);

    if (!tenant || tenant.tier !== 'ac') {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Only AC tenant administrators can access this resource',
      });
    }
  }

  rejectRetiredSettingsFeatures(settings: Record<string, unknown> | undefined): void {
    if (settings && Object.prototype.hasOwnProperty.call(settings, 'features')) {
      throw new BadRequestException({
        code: ErrorCodes.TENANT_FEATURES_RETIRED,
        message:
          'Legacy tenant feature settings have been retired. Use enabledCapabilityCodes or the tenant capability endpoint.',
      });
    }
  }

  sanitizeTenantSettings(settings: Record<string, unknown> | undefined) {
    return stripLegacyFeatureSettings(settings ?? {});
  }

  async initializeTenantCapabilities(
    tenant: TenantRecord,
    enabledCapabilityCodes: readonly string[] | undefined,
    actorId: string | null
  ) {
    const requestedCodes =
      enabledCapabilityCodes ?? this.defaultAssignableCodesForTenant(tenant.tier);

    return this.replaceAssignableCapabilities(tenant, {
      enabledCapabilityCodes: [...requestedCodes],
      version: 1,
      note: 'Initial tenant capability assignment',
      actorId,
      source: 'ac_manual',
      requireVersionMatch: false,
    });
  }

  async getTenantCapabilities(tenantId: string, locale?: string | null) {
    const tenant = await this.getTenantOrThrow(tenantId);
    const resolved = await this.resolveTenantCapabilities(tenant, 'tenant', null, locale);

    return {
      tenantId: tenant.id,
      version: resolved.version,
      assignments: resolved.assignments,
      effective: resolved.effective,
      registryVersion: MODULE_CAPABILITY_REGISTRY_VERSION,
    };
  }

  async getCurrentTenantEffectiveCapabilities(tenantId: string, locale?: string | null) {
    const tenant = await this.getTenantOrThrow(tenantId);

    if (!tenant.isActive) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_DISABLED,
        message: 'Tenant is disabled',
      });
    }

    const resolved = await this.resolveTenantCapabilities(tenant, 'tenant', null, locale);

    return {
      tenantId: tenant.id,
      effective: resolved.effective,
      registryVersion: MODULE_CAPABILITY_REGISTRY_VERSION,
    };
  }

  async replaceTenantCapabilities(
    tenantId: string,
    payload: TenantCapabilityPayload,
    actorId: string | null,
    requestContext: { requestId?: string | null; ipAddress?: string | null } = {}
  ) {
    const tenant = await this.getTenantOrThrow(tenantId);

    return this.replaceAssignableCapabilities(tenant, {
      enabledCapabilityCodes: payload.enabledCapabilityCodes,
      version: payload.version,
      note: payload.note ?? null,
      actorId,
      source: 'ac_manual',
      requireVersionMatch: true,
      requestContext,
    });
  }

  async buildTenantResponseCapabilities(tenant: TenantRecord, locale?: string | null) {
    const resolved = await this.resolveTenantCapabilities(tenant, 'tenant', null, locale);

    return {
      enabledCapabilityCodes: resolved.assignableEnabledCapabilityCodes,
      summary: summarizeCapabilities(resolved.assignableEnabledCapabilityCodes, locale),
      registryVersion: MODULE_CAPABILITY_REGISTRY_VERSION,
      version: resolved.version,
    };
  }

  async resolveTenantCapabilities(
    tenant: TenantRecord,
    scopeType: CapabilityScopeType = 'tenant',
    scopeId: string | null = null,
    locale?: string | null
  ) {
    await this.ensureCapabilityState(tenant.id);

    const [stateRows, assignmentRows] = await Promise.all([
      prisma.$queryRawUnsafe<StateRow[]>(
        `
          SELECT version, updated_at AS "updatedAt"
          FROM public.tenant_capability_state
          WHERE tenant_id = $1::uuid
          LIMIT 1
        `,
        tenant.id
      ),
      prisma.$queryRawUnsafe<AssignmentRow[]>(
        `
          SELECT
            capability_code AS "capabilityCode",
            enabled,
            source,
            assigned_by AS "assignedBy",
            assigned_at AS "assignedAt",
            updated_by AS "updatedBy",
            updated_at AS "updatedAt",
            note
          FROM public.tenant_capability_assignment
          WHERE tenant_id = $1::uuid
          ORDER BY capability_code ASC
        `,
        tenant.id
      ),
    ]);

    const version = stateRows[0]?.version ?? 1;
    const assignmentByCode = new Map(assignmentRows.map((row) => [row.capabilityCode, row]));
    const assignableEnabledCapabilityCodes = CAPABILITY_DEFINITIONS.filter(
      (definition) => definition.assignable && assignmentByCode.get(definition.code)?.enabled
    )
      .map((definition) => definition.code)
      .sort((left, right) => left.localeCompare(right));

    const capabilityResolution = this.resolveEffectiveCapabilityCodes({
      tenantTier: tenant.tier,
      tenantIsActive: tenant.isActive,
      scopeType,
      assignmentByCode,
    });
    const effectiveCapabilityCodes = capabilityResolution.enabledCapabilityCodes;

    const sourceAssignments: CapabilityAssignmentInput[] = assignmentRows.map((row) => ({
      tenantId: tenant.id,
      capabilityCode: row.capabilityCode,
      enabled: row.enabled,
      source: this.normalizeAssignmentSource(row.source),
      assignedBy: row.assignedBy,
      assignedAt: row.assignedAt,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
      version,
      note: row.note,
    }));

    return {
      version,
      assignableEnabledCapabilityCodes,
      assignments: CAPABILITY_DEFINITIONS.map((definition) => {
        const row = assignmentByCode.get(definition.code);
        const editable = definition.assignable && tenant.tier !== 'ac';
        const derivedEnabled = effectiveCapabilityCodes.includes(definition.code);

        return {
          capabilityCode: definition.code,
          moduleCode: definition.moduleCode,
          label: definition.label,
          description: definition.description,
          assignable: definition.assignable,
          editable,
          enabled: definition.assignable ? Boolean(row?.enabled) : derivedEnabled,
          lockedReason: editable
            ? null
            : definition.assignable
              ? 'AC tenant records cannot enable ordinary tenant capabilities.'
              : 'System capability is derived from tenant tier and registry rules.',
          source: row?.source ?? (definition.assignable ? null : 'system'),
          updatedAt: this.toIso(row?.updatedAt),
          note: row?.note ?? null,
        };
      }),
      effective: {
        tenantId: tenant.id,
        scopeType,
        scopeId,
        enabledCapabilityCodes: effectiveCapabilityCodes,
        disabledReasons: capabilityResolution.disabledReasons,
        sourceAssignments,
        requiredRbacByCapability: Object.fromEntries(
          CAPABILITY_DEFINITIONS.map((definition) => [
            definition.code,
            definition.requiredRbac,
          ])
        ),
        registryVersion: MODULE_CAPABILITY_REGISTRY_VERSION,
        resolvedAt: new Date().toISOString(),
        summary: summarizeCapabilities(assignableEnabledCapabilityCodes, locale),
      },
    };
  }

  private async replaceAssignableCapabilities(
    tenant: TenantRecord,
    input: {
      enabledCapabilityCodes: readonly string[];
      version: number;
      note?: string | null;
      actorId: string | null;
      source: 'seed' | 'migration' | 'ac_manual' | 'system';
      requireVersionMatch: boolean;
      requestContext?: { requestId?: string | null; ipAddress?: string | null };
    }
  ) {
    if (tenant.tier === 'ac' && input.enabledCapabilityCodes.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.TENANT_CAPABILITY_INVALID,
        message: 'AC tenant capabilities are derived and cannot accept assignable module codes.',
      });
    }

    const normalized = normalizeAssignableCapabilityCodes(input.enabledCapabilityCodes);

    if (
      normalized.invalidCapabilityCodes.length > 0 ||
      normalized.nonAssignableCapabilityCodes.length > 0
    ) {
      throw new BadRequestException({
        code: ErrorCodes.TENANT_CAPABILITY_INVALID,
        message: 'Tenant capability assignment contains invalid or non-assignable codes.',
        details: {
          invalidCapabilityCodes: normalized.invalidCapabilityCodes,
          nonAssignableCapabilityCodes: normalized.nonAssignableCapabilityCodes,
        },
      });
    }

    await this.ensureCapabilityState(tenant.id);

    await prisma.$transaction(async (tx) => {
      const stateRows = await tx.$queryRawUnsafe<StateRow[]>(
        `
          SELECT version, updated_at AS "updatedAt"
          FROM public.tenant_capability_state
          WHERE tenant_id = $1::uuid
          FOR UPDATE
        `,
        tenant.id
      );
      const currentVersion = stateRows[0]?.version ?? 1;

      if (input.requireVersionMatch && currentVersion !== input.version) {
        throw new ConflictException({
          code: ErrorCodes.RES_VERSION_MISMATCH,
          message: 'Tenant capability assignment version is stale.',
          details: {
            expectedVersion: currentVersion,
            receivedVersion: input.version,
          },
        });
      }

      const beforeRows = await tx.$queryRawUnsafe<Array<{ capabilityCode: string }>>(
        `
          SELECT capability_code AS "capabilityCode"
          FROM public.tenant_capability_assignment
          WHERE tenant_id = $1::uuid
            AND enabled = true
          ORDER BY capability_code ASC
        `,
        tenant.id
      );
      const beforeCodes = beforeRows.map((row) => row.capabilityCode);
      const enabledSet = new Set(normalized.enabledCapabilityCodes);
      const nextVersion = currentVersion + 1;

      for (const definition of CAPABILITY_DEFINITIONS.filter((item) => item.assignable)) {
        await tx.$executeRawUnsafe(
          `
            INSERT INTO public.tenant_capability_assignment (
              tenant_id,
              capability_code,
              enabled,
              source,
              assigned_by,
              assigned_at,
              updated_by,
              updated_at,
              note
            )
            VALUES ($1::uuid, $2, $3, $4, $5::uuid, now(), $5::uuid, now(), $6)
            ON CONFLICT (tenant_id, capability_code) DO UPDATE SET
              enabled = EXCLUDED.enabled,
              source = EXCLUDED.source,
              updated_by = EXCLUDED.updated_by,
              updated_at = now(),
              note = EXCLUDED.note
          `,
          tenant.id,
          definition.code,
          enabledSet.has(definition.code),
          input.source,
          input.actorId,
          input.note ?? null
        );
      }

      await tx.$executeRawUnsafe(
        `
          UPDATE public.tenant_capability_state
          SET version = $2,
              updated_by = $3::uuid,
              updated_at = now()
          WHERE tenant_id = $1::uuid
        `,
        tenant.id,
        nextVersion,
        input.actorId
      );

      await tx.$executeRawUnsafe(
        `
          INSERT INTO public.tenant_capability_audit (
            tenant_id,
            actor_id,
            action,
            old_version,
            new_version,
            old_capability_codes,
            new_capability_codes,
            note,
            request_id,
            ip_address,
            created_at
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            'tenant.capability.replace',
            $3,
            $4,
            $5::jsonb,
            $6::jsonb,
            $7,
            $8,
            $9,
            now()
          )
        `,
        tenant.id,
        input.actorId,
        currentVersion,
        nextVersion,
        JSON.stringify(beforeCodes),
        JSON.stringify(normalized.enabledCapabilityCodes),
        input.note ?? null,
        input.requestContext?.requestId ?? null,
        input.requestContext?.ipAddress ?? null
      );
    });

    return this.getTenantCapabilities(tenant.id);
  }

  private async getTenantOrThrow(tenantId: string) {
    const tenant = await this.tenantService.getTenantById(tenantId);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    return tenant;
  }

  private async ensureCapabilityState(tenantId: string) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO public.tenant_capability_state (tenant_id, version, updated_at)
        VALUES ($1::uuid, 1, now())
        ON CONFLICT (tenant_id) DO NOTHING
      `,
      tenantId
    );
  }

  private defaultAssignableCodesForTenant(tier: string | null) {
    if (tier === 'ac') {
      return [];
    }

    return CAPABILITY_DEFINITIONS.filter(
      (definition) => definition.assignable && definition.defaultEnabledForStandardTenant
    ).map((definition) => definition.code);
  }

  private resolveEffectiveCapabilityCodes(input: {
    tenantTier: string | null;
    tenantIsActive: boolean;
    scopeType: CapabilityScopeType;
    assignmentByCode: Map<string, AssignmentRow>;
  }) {
    const moduleByCode = new Map(MODULE_DEFINITIONS.map((module) => [module.code, module]));
    const baseEnabled = new Map<string, boolean>();
    const disabledReasons = new Map<string, string>();

    for (const definition of CAPABILITY_DEFINITIONS) {
      const module = moduleByCode.get(definition.moduleCode);
      const supportedTenantTiers = module?.supportedTenantTiers ?? [];

      if (!input.tenantIsActive) {
        baseEnabled.set(definition.code, false);
        disabledReasons.set(definition.code, 'Tenant is disabled.');
        continue;
      }

      if (
        input.tenantTier &&
        supportedTenantTiers.length > 0 &&
        !(supportedTenantTiers as readonly string[]).includes(input.tenantTier)
      ) {
        baseEnabled.set(definition.code, false);
        disabledReasons.set(definition.code, 'Capability is not available for this tenant tier.');
        continue;
      }

      if (!(definition.runtimeScopes as readonly CapabilityScopeType[]).includes(input.scopeType)) {
        baseEnabled.set(definition.code, false);
        disabledReasons.set(definition.code, 'Capability is not available for this scope.');
        continue;
      }

      if (definition.assignable) {
        const enabled = input.assignmentByCode.get(definition.code)?.enabled === true;
        baseEnabled.set(definition.code, enabled);

        if (!enabled) {
          disabledReasons.set(definition.code, 'Capability is not enabled for this tenant.');
        }

        continue;
      }

      if (definition.code === 'platform.ac_management') {
        const enabled = input.tenantTier === 'ac';
        baseEnabled.set(definition.code, enabled);

        if (!enabled) {
          disabledReasons.set(definition.code, 'Capability is limited to AC tenants.');
        }

        continue;
      }

      baseEnabled.set(definition.code, definition.defaultEnabledForStandardTenant);

      if (!definition.defaultEnabledForStandardTenant) {
        disabledReasons.set(definition.code, 'Capability is not enabled by registry defaults.');
      }
    }

    const enabledCodes: string[] = [];

    for (const definition of CAPABILITY_DEFINITIONS) {
      const isBaseEnabled = baseEnabled.get(definition.code) === true;
      const missingDependencies = definition.dependencies.filter(
        (dependency) => baseEnabled.get(dependency) !== true
      );
      const conflictingCapabilities = definition.conflicts.filter(
        (conflict) => baseEnabled.get(conflict) === true
      );

      if (!isBaseEnabled) {
        continue;
      }

      if (missingDependencies.length > 0) {
        disabledReasons.set(
          definition.code,
          `Missing required capabilities: ${missingDependencies.join(', ')}.`
        );
        continue;
      }

      if (conflictingCapabilities.length > 0) {
        disabledReasons.set(
          definition.code,
          `Conflicting capabilities are enabled: ${conflictingCapabilities.join(', ')}.`
        );
        continue;
      }

      enabledCodes.push(definition.code);
      disabledReasons.delete(definition.code);
    }

    return {
      enabledCapabilityCodes: enabledCodes.sort((left, right) => left.localeCompare(right)),
      disabledReasons: Object.fromEntries(disabledReasons),
    };
  }

  private normalizeAssignmentSource(source: string) {
    if (
      source === 'seed' ||
      source === 'migration' ||
      source === 'ac_manual' ||
      source === 'system'
    ) {
      return source;
    }

    return 'system';
  }

  private toIso(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }

    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}
