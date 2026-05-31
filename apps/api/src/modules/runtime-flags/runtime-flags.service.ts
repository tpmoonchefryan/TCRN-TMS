// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { PrismaClient } from '@tcrn/database';
import {
  ErrorCodes,
  RUNTIME_FLAG_ADAPTER_DEFINITIONS,
  RUNTIME_FLAG_CONTEXT_KEYS,
  RUNTIME_FLAG_DEFINITIONS,
  RUNTIME_FLAG_FORBIDDEN_CONTEXT_PATTERNS,
  RUNTIME_FLAG_POLICY,
  getRuntimeFlagAdapterDefinition,
  getRuntimeFlagDefinition,
  type PlatformToolConnectionEnvironment,
  type PlatformToolHealthState,
  type PlatformToolSsoState,
  type RuntimeFlagAdapterCode,
  type RuntimeFlagReadinessState,
} from '@tcrn/shared';

import { DatabaseService } from '../database/database.service';
import { validateUrlSafety } from '../platform-tools/url-safety';
import { ModuleCapabilityService } from '../tenant/module-capability.service';
import type {
  RuntimeFlagEvaluationDto,
  RuntimeFlagKillSwitchDeactivateDto,
  RuntimeFlagKillSwitchMutationDto,
  RuntimeFlagQueryDto,
} from './dto/runtime-flags.dto';

export interface RuntimeFlagRequestContext {
  tenantId: string;
  tenantSchema?: string;
  actorId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string | string[];
}

interface PlatformConnectionRow {
  id: string;
  tool_code: string;
  environment: PlatformToolConnectionEnvironment;
  deployment_mode: string;
  local_dev_mode: string;
  endpoint_url: string | null;
  enabled: boolean;
  readiness_state: string;
  sso_readiness_state: PlatformToolSsoState;
  health_status: PlatformToolHealthState;
  last_checked_at: Date | null;
  updated_at: Date;
  version: number;
}

interface PlatformSsoReadinessRow {
  tool_code: string;
  status: PlatformToolSsoState;
  fail_closed: boolean;
}

interface RuntimeFlagKillSwitchRow {
  id: string;
  tenant_id: string;
  flag_code: string;
  status: string;
  affected_behavior: string;
  reason: string;
  rollback_instruction: string;
  source: string;
  expires_at: Date;
  activated_by: string | null;
  deactivated_by: string | null;
  deactivated_at: Date | null;
  audit_metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const DEFAULT_ENVIRONMENT: PlatformToolConnectionEnvironment = 'local';
const ALLOWED_CONTEXT_KEYS = new Set<string>(RUNTIME_FLAG_CONTEXT_KEYS);
const SAFE_CONTEXT_VALUE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,160}$/;
const SAFE_IDENTIFIER_VALUE_PATTERN = /^[A-Za-z0-9_.:-]{1,160}$/;
const EMAIL_LIKE_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const BEARER_LIKE_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/i;
const JWT_LIKE_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

type RuntimeFlagSqlClient = Pick<PrismaClient, '$executeRawUnsafe' | '$queryRawUnsafe'>;

@Injectable()
export class RuntimeFlagsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    @Optional() private readonly moduleCapabilityService?: ModuleCapabilityService
  ) {}

  async listAdapters(context?: RuntimeFlagRequestContext) {
    await this.ensureActorActive(context);
    return RUNTIME_FLAG_ADAPTER_DEFINITIONS.map((definition) => ({ ...definition }));
  }

  async listDefinitions(context?: RuntimeFlagRequestContext) {
    await this.ensureActorActive(context);
    return RUNTIME_FLAG_DEFINITIONS.map((definition) => ({ ...definition }));
  }

  async getPolicy(context?: RuntimeFlagRequestContext) {
    await this.ensureActorActive(context);
    return {
      ...RUNTIME_FLAG_POLICY,
      checkedAt: new Date().toISOString(),
    };
  }

  async getSummary(query: RuntimeFlagQueryDto, context: RuntimeFlagRequestContext) {
    await this.ensureActorActive(context);
    const environment = query.environment ?? DEFAULT_ENVIRONMENT;
    const providerReadiness = await this.getProviderReadiness({ environment }, context);
    const activeKillSwitches = await this.listActiveKillSwitches(context.tenantId);

    return {
      checkedAt: new Date().toISOString(),
      environment,
      summary: {
        registeredFlagCount: RUNTIME_FLAG_DEFINITIONS.length,
        activeKillSwitchCount: activeKillSwitches.length,
        providerMode: providerReadiness.profile.localDevMode,
        providerHealth: providerReadiness.profile.healthStatus,
        lastEvaluationFallback: 'tcrn_registry_default',
        lastAuditEvent: activeKillSwitches[0]?.updatedAt ?? null,
      },
      adapters: RUNTIME_FLAG_ADAPTER_DEFINITIONS.map((definition) =>
        this.serializeAdapterReadiness(definition.code, providerReadiness)
      ),
      definitions: RUNTIME_FLAG_DEFINITIONS.map((definition) => ({ ...definition })),
      activeKillSwitches,
      policy: RUNTIME_FLAG_POLICY,
    };
  }

  async getProviderReadiness(query: RuntimeFlagQueryDto, context: RuntimeFlagRequestContext) {
    await this.ensureActorActive(context);
    const environment = query.environment ?? DEFAULT_ENVIRONMENT;
    const connection = await this.findPlatformConnection(
      context.tenantId,
      'flagsmith',
      environment
    );
    const ssoReadiness = await this.getSsoReadiness('flagsmith');
    const envMode = this.configService.get<string>('RUNTIME_FLAG_PROVIDER_MODE', 'disabled');
    const readinessState = await this.deriveFlagsmithReadiness(connection, ssoReadiness, envMode);

    return {
      adapterCode: 'flagsmith_provider' as RuntimeFlagAdapterCode,
      environment,
      profile: {
        platformToolCode: 'flagsmith',
        connectionId: connection?.id ?? null,
        enabled: Boolean(connection?.enabled),
        deploymentMode: connection?.deployment_mode ?? 'disabled',
        localDevMode:
          connection?.local_dev_mode ?? (envMode === 'stubbed' ? 'stubbed' : 'disabled'),
        readinessState,
        healthStatus: connection?.health_status ?? 'disabled',
        ssoState: ssoReadiness?.status ?? 'blocked',
        endpointConfigured: Boolean(connection?.endpoint_url),
        lastCheckedAt: connection?.last_checked_at?.toISOString() ?? null,
        configVersion: connection?.version ?? 0,
      },
      sourceOfTruthBoundary: RUNTIME_FLAG_POLICY.productAuthority,
    };
  }

  async evaluate(dto: RuntimeFlagEvaluationDto, context: RuntimeFlagRequestContext) {
    await this.ensureActorActive(context);
    const definition = getRuntimeFlagDefinition(dto.flagCode);

    if (!definition) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_INVALID,
        message: 'Runtime flag is not registered by TCRN',
        details: {
          reason: 'UNREGISTERED_FLAG',
          providerMayCreateUnknownFlags: false,
        },
      });
    }

    const serverResolvedCapabilityCodes = await this.resolveServerCapabilityCodes(context);
    const sanitizedContext = this.sanitizeEvaluationContext(
      dto.context ?? {},
      definition.code,
      context,
      serverResolvedCapabilityCodes
    );
    const activeSwitch = await this.findActiveKillSwitch(context.tenantId, definition.code);

    if (activeSwitch) {
      await this.writeAudit(context, {
        action: 'runtime_flag.evaluate.kill_switch',
        beforeState: null,
        afterState: {
          flagCode: definition.code,
          killSwitchId: activeSwitch.id,
          reason: activeSwitch.reason,
          rawContextLogged: false,
        },
      });

      return {
        flagCode: definition.code,
        value: false,
        variant: 'kill_switch',
        reason: 'KILL_SWITCH_ACTIVE',
        source: 'runtime_kill_switch_policy',
        defaulted: false,
        fallback: false,
        providerStatus: 'not_evaluated',
        correlationId: this.resolveCorrelationId(sanitizedContext.context, context),
        context: sanitizedContext.context,
        blockedContextKeys: sanitizedContext.blockedKeys,
        entitlementAuthority: 'tcrn_resolved_before_runtime_flag',
        killSwitch: this.serializeKillSwitch(activeSwitch),
      };
    }

    await this.writeAudit(context, {
      action: 'runtime_flag.evaluate.default',
      beforeState: null,
      afterState: {
        flagCode: definition.code,
        source: definition.providerMapping.adapterCode,
        rawContextLogged: false,
      },
    });

    return {
      flagCode: definition.code,
      value: definition.defaultValue,
      variant: 'default',
      reason: 'TCRN_REGISTRY_DEFAULT',
      source: definition.providerMapping.adapterCode,
      defaulted: true,
      fallback: definition.failBehavior !== 'no_product_effect',
      providerStatus: 'disabled',
      correlationId: this.resolveCorrelationId(sanitizedContext.context, context),
      context: sanitizedContext.context,
      blockedContextKeys: sanitizedContext.blockedKeys,
      entitlementAuthority: 'tcrn_resolved_before_runtime_flag',
      killSwitch: null,
    };
  }

  async activateKillSwitch(
    dto: RuntimeFlagKillSwitchMutationDto,
    context: RuntimeFlagRequestContext
  ) {
    await this.ensureActorActive(context);
    const definition = getRuntimeFlagDefinition(dto.flagCode);

    if (!definition) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_INVALID,
        message: 'Kill switches can target registered runtime flags only',
      });
    }

    if (!dto.explicitConfirmation) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_INVALID,
        message: 'Explicit confirmation is required before activating a kill switch',
      });
    }

    const expiresAt = new Date(dto.expiresAt);

    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_INVALID,
        message: 'Kill switch expiry must be in the future',
      });
    }

    const affectedBehavior = this.requireTrimmedText(dto.affectedBehavior, 'affectedBehavior', 255);
    const reason = this.requireTrimmedText(dto.reason, 'reason', 2000);
    const rollbackInstruction = this.requireTrimmedText(
      dto.rollbackInstruction,
      'rollbackInstruction',
      2000
    );
    const metadata = this.sanitizeMetadata(dto.metadata ?? {});
    const row = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<RuntimeFlagKillSwitchRow[]>(
        `
          INSERT INTO public.runtime_flag_kill_switch
            (
              tenant_id,
              flag_code,
              affected_behavior,
              reason,
              rollback_instruction,
              expires_at,
              activated_by,
              audit_metadata
            )
          VALUES ($1::uuid, $2, $3, $4, $5, $6::timestamptz, $7::uuid, $8::jsonb)
          RETURNING *
        `,
        context.tenantId,
        definition.code,
        affectedBehavior,
        reason,
        rollbackInstruction,
        expiresAt.toISOString(),
        context.actorId ?? null,
        JSON.stringify(metadata)
      );
      const inserted = rows[0];

      await this.writeAudit(
        context,
        {
          action: 'runtime_flag.kill_switch.activate',
          beforeState: null,
          afterState: {
            flagCode: definition.code,
            killSwitchId: inserted.id,
            expiresAt: inserted.expires_at.toISOString(),
            reasonLogged: true,
            rawProviderRuleLogged: false,
          },
        },
        tx
      );

      return inserted;
    });

    return {
      killSwitch: this.serializeKillSwitch(row),
      auditState: 'recorded',
    };
  }

  async deactivateKillSwitch(
    switchId: string,
    dto: RuntimeFlagKillSwitchDeactivateDto,
    context: RuntimeFlagRequestContext
  ) {
    await this.ensureActorActive(context);
    const rollbackInstruction = this.requireTrimmedText(
      dto.rollbackInstruction,
      'rollbackInstruction',
      2000
    );
    const row = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<RuntimeFlagKillSwitchRow[]>(
        `
          UPDATE public.runtime_flag_kill_switch
          SET
            status = 'deactivated',
            deactivated_by = $4::uuid,
            deactivated_at = now(),
            rollback_instruction = $3,
            audit_metadata = audit_metadata || $5::jsonb,
            updated_at = now()
          WHERE id = $1::uuid
            AND tenant_id = $2::uuid
            AND status = 'active'
          RETURNING *
        `,
        switchId,
        context.tenantId,
        rollbackInstruction,
        context.actorId ?? null,
        JSON.stringify(this.sanitizeMetadata(dto.metadata ?? {}))
      );

      if (!rows[0]) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Active runtime kill switch not found',
        });
      }

      await this.writeAudit(
        context,
        {
          action: 'runtime_flag.kill_switch.deactivate',
          beforeState: { id: switchId, status: 'active' },
          afterState: {
            flagCode: rows[0].flag_code,
            killSwitchId: rows[0].id,
            rollbackLogged: true,
          },
        },
        tx
      );

      return rows[0];
    });

    return {
      killSwitch: this.serializeKillSwitch(row),
      auditState: 'recorded',
    };
  }

  private serializeAdapterReadiness(
    adapterCode: RuntimeFlagAdapterCode,
    providerReadiness: Awaited<ReturnType<RuntimeFlagsService['getProviderReadiness']>>
  ) {
    const definition = getRuntimeFlagAdapterDefinition(adapterCode);

    if (!definition) {
      throw new Error(`Unknown runtime flag adapter ${adapterCode}`);
    }

    const readinessState =
      adapterCode === 'flagsmith_provider'
        ? providerReadiness.profile.readinessState
        : definition.defaultReadinessState;

    return {
      definition: { ...definition },
      profile: {
        adapterCode,
        enabled: definition.defaultEnabled && readinessState !== 'disabled',
        readinessState,
        providerMode:
          adapterCode === 'flagsmith_provider'
            ? providerReadiness.profile.localDevMode
            : definition.localDevModes[0],
        platformToolCode: definition.platformToolCode,
        platformToolConnectionId:
          adapterCode === 'flagsmith_provider' ? providerReadiness.profile.connectionId : null,
        healthStatus:
          adapterCode === 'flagsmith_provider'
            ? providerReadiness.profile.healthStatus
            : 'disabled',
        ssoState:
          adapterCode === 'flagsmith_provider'
            ? providerReadiness.profile.ssoState
            : 'not_applicable',
        endpointConfigured:
          adapterCode === 'flagsmith_provider'
            ? providerReadiness.profile.endpointConfigured
            : false,
      },
    };
  }

  private sanitizeEvaluationContext(
    context: Record<string, unknown>,
    flagCode: string,
    requestContext: RuntimeFlagRequestContext,
    serverResolvedCapabilityCodes: readonly string[]
  ) {
    const allowedContextForFlag =
      getRuntimeFlagDefinition(flagCode)?.allowedContextKeys ?? RUNTIME_FLAG_CONTEXT_KEYS;
    const allowedForFlag = new Set<string>(allowedContextForFlag);
    const blockedKeys: string[] = [];
    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      const normalizedKey = key.trim();
      const lowerKey = normalizedKey.toLowerCase();
      const forbidden = RUNTIME_FLAG_FORBIDDEN_CONTEXT_PATTERNS.some((pattern) =>
        lowerKey.includes(pattern.toLowerCase())
      );

      if (
        !ALLOWED_CONTEXT_KEYS.has(normalizedKey) ||
        !allowedForFlag.has(normalizedKey) ||
        forbidden
      ) {
        blockedKeys.push(normalizedKey);
        continue;
      }

      if (normalizedKey === 'tenantId') {
        if (value !== requestContext.tenantId) {
          blockedKeys.push(normalizedKey);
          continue;
        }

        next[normalizedKey] = requestContext.tenantId;
        continue;
      }

      if (normalizedKey === 'resolvedCapabilityCodes') {
        if (Array.isArray(value) && value.length > 0) {
          blockedKeys.push(normalizedKey);
          continue;
        }

        continue;
      }

      if (!this.isSafeContextValue(normalizedKey, value)) {
        blockedKeys.push(normalizedKey);
        continue;
      }

      if (typeof value === 'string') {
        next[normalizedKey] = value.trim();
      } else if (['number', 'boolean'].includes(typeof value)) {
        next[normalizedKey] = value;
      }
    }

    if (blockedKeys.length > 0) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Runtime flag evaluation context contains unsafe or unsupported keys',
        details: {
          blockedKeys,
          rawContextLogged: false,
        },
      });
    }

    return {
      context: {
        ...next,
        ...(allowedForFlag.has('tenantId') ? { tenantId: requestContext.tenantId } : {}),
        ...(allowedForFlag.has('resolvedCapabilityCodes')
          ? { resolvedCapabilityCodes: [...serverResolvedCapabilityCodes] }
          : {}),
        flagCode,
      },
      blockedKeys,
    };
  }

  private async resolveServerCapabilityCodes(
    context: RuntimeFlagRequestContext
  ): Promise<string[]> {
    if (!this.moduleCapabilityService) {
      return [];
    }

    const result = await this.moduleCapabilityService.getCurrentTenantEffectiveCapabilities(
      context.tenantId
    );

    return [...result.effective.enabledCapabilityCodes].sort((left, right) =>
      left.localeCompare(right)
    );
  }

  private requireTrimmedText(value: unknown, field: string, maxLength: number) {
    const text = typeof value === 'string' ? value.trim() : '';

    if (!text || text.length > maxLength) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_REQUIRED,
        message: `${field} is required`,
        details: {
          field,
          trimmedNonEmpty: true,
        },
      });
    }

    return text;
  }

  private isSafeContextValue(key: string, value: unknown) {
    if (typeof value === 'string') {
      const text = value.trim();
      const lowerText = text.toLowerCase();
      const forbiddenText = RUNTIME_FLAG_FORBIDDEN_CONTEXT_PATTERNS.some((pattern) =>
        lowerText.includes(pattern.toLowerCase())
      );

      if (
        !text ||
        forbiddenText ||
        EMAIL_LIKE_PATTERN.test(text) ||
        BEARER_LIKE_PATTERN.test(text) ||
        JWT_LIKE_PATTERN.test(text)
      ) {
        return false;
      }

      if (['tenantCode', 'subsidiaryId', 'talentId', 'actorClass'].includes(key)) {
        return SAFE_IDENTIFIER_VALUE_PATTERN.test(text);
      }

      return SAFE_CONTEXT_VALUE_PATTERN.test(text);
    }

    return typeof value === 'number' || typeof value === 'boolean';
  }

  private sanitizeMetadata(metadata: Record<string, unknown>) {
    const safe: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      const forbidden = RUNTIME_FLAG_FORBIDDEN_CONTEXT_PATTERNS.some((pattern) =>
        lowerKey.includes(pattern.toLowerCase())
      );

      if (forbidden) {
        safe[key] = '[redacted]';
      } else if (['string', 'number', 'boolean'].includes(typeof value)) {
        safe[key] = value;
      }
    }

    return safe;
  }

  private resolveCorrelationId(
    sanitizedContext: Record<string, unknown>,
    context: RuntimeFlagRequestContext
  ) {
    return typeof sanitizedContext.correlationId === 'string'
      ? sanitizedContext.correlationId
      : (context.requestId ?? null);
  }

  private async deriveFlagsmithReadiness(
    connection: PlatformConnectionRow | null,
    ssoReadiness: PlatformSsoReadinessRow | null,
    envMode: string
  ): Promise<RuntimeFlagReadinessState> {
    if (!connection) {
      return envMode === 'stubbed' ? 'local_stub' : 'not_configured';
    }

    if (connection.local_dev_mode === 'stubbed') {
      return 'local_stub';
    }

    if (!connection.enabled) {
      return 'disabled';
    }

    if (!connection.endpoint_url) {
      return 'not_configured';
    }

    if (ssoReadiness?.status !== 'ready') {
      return 'sso_required';
    }

    if (connection.health_status === 'unhealthy') {
      return 'unhealthy';
    }

    const safety = await validateUrlSafety(connection.endpoint_url, { resolveDns: true });

    if (!safety.safe) {
      return 'unsafe_url';
    }

    if (connection.health_status === 'healthy') {
      return 'healthy';
    }

    return 'external_provided';
  }

  private async listActiveKillSwitches(tenantId: string) {
    const rows = await this.prisma.$queryRawUnsafe<RuntimeFlagKillSwitchRow[]>(
      `
        SELECT *
        FROM public.runtime_flag_kill_switch
        WHERE tenant_id = $1::uuid
          AND status = 'active'
          AND expires_at > now()
        ORDER BY updated_at DESC, created_at DESC
      `,
      tenantId
    );

    return rows.map((row) => this.serializeKillSwitch(row));
  }

  private async findActiveKillSwitch(tenantId: string, flagCode: string) {
    const rows = await this.prisma.$queryRawUnsafe<RuntimeFlagKillSwitchRow[]>(
      `
        SELECT *
        FROM public.runtime_flag_kill_switch
        WHERE tenant_id = $1::uuid
          AND flag_code = $2
          AND status = 'active'
          AND expires_at > now()
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
      `,
      tenantId,
      flagCode
    );

    return rows[0] ?? null;
  }

  private serializeKillSwitch(row: RuntimeFlagKillSwitchRow) {
    return {
      id: row.id,
      flagCode: row.flag_code,
      status: row.status,
      affectedBehavior: row.affected_behavior,
      reason: row.reason,
      rollbackInstruction: row.rollback_instruction,
      source: row.source,
      expiresAt: row.expires_at.toISOString(),
      activatedBy: row.activated_by,
      deactivatedBy: row.deactivated_by,
      deactivatedAt: row.deactivated_at?.toISOString() ?? null,
      auditMetadata: row.audit_metadata ?? {},
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private async findPlatformConnection(
    tenantId: string,
    toolCode: string,
    environment: PlatformToolConnectionEnvironment
  ) {
    const rows = await this.prisma.$queryRawUnsafe<PlatformConnectionRow[]>(
      `
        SELECT *
        FROM public.platform_tool_connection
        WHERE tenant_id = $1::uuid
          AND tool_code = $2
          AND environment = $3
        LIMIT 1
      `,
      tenantId,
      toolCode,
      environment
    );

    return rows[0] ?? null;
  }

  private async getSsoReadiness(toolCode: string) {
    const rows = await this.prisma.$queryRawUnsafe<PlatformSsoReadinessRow[]>(
      `
        SELECT tool_code, status, fail_closed
        FROM public.platform_external_tool_sso_readiness
        WHERE tool_code = $1
        LIMIT 1
      `,
      toolCode
    );

    return rows[0] ?? null;
  }

  private async ensureActorActive(context?: RuntimeFlagRequestContext): Promise<void> {
    if (
      !context?.actorId ||
      !context.tenantSchema ||
      !/^[A-Za-z0-9_]+$/.test(context.tenantSchema)
    ) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Runtime flag requests require an active AC operator',
      });
    }

    const schema = context.tenantSchema.replace(/"/g, '""');
    const rows = await this.prisma.$queryRawUnsafe<Array<{ is_active: boolean }>>(
      `
        SELECT is_active
        FROM "${schema}".system_user
        WHERE id = $1::uuid
        LIMIT 1
      `,
      context.actorId
    );

    if (rows[0]?.is_active !== true) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Account is disabled',
      });
    }
  }

  private async writeAudit(
    context: RuntimeFlagRequestContext,
    input: {
      action: string;
      beforeState?: Record<string, unknown> | null;
      afterState?: Record<string, unknown> | null;
    },
    client: RuntimeFlagSqlClient = this.prisma
  ): Promise<void> {
    try {
      await client.$executeRawUnsafe(
        `
          INSERT INTO public.platform_tool_audit_event
            (
              tenant_id,
              connection_id,
              tool_code,
              action,
              actor_id,
              before_state,
              after_state,
              request_id,
              ip_address,
              user_agent
            )
          VALUES
            ($1::uuid, NULL, 'flagsmith', $2, $3::uuid, $4::jsonb, $5::jsonb, $6, $7, $8)
        `,
        context.tenantId,
        input.action,
        context.actorId ?? null,
        input.beforeState ? JSON.stringify(input.beforeState) : null,
        input.afterState ? JSON.stringify(input.afterState) : null,
        context.requestId ?? null,
        context.ipAddress ?? null,
        Array.isArray(context.userAgent) ? context.userAgent.join(',') : (context.userAgent ?? null)
      );
    } catch {
      throw new InternalServerErrorException({
        code: 'RUNTIME_FLAG_AUDIT_FAILED',
        message: 'Runtime flag audit event could not be recorded',
        details: {
          rawContextLogged: false,
        },
      });
    }
  }

  private get prisma(): PrismaClient {
    return this.databaseService.getPrisma();
  }
}
