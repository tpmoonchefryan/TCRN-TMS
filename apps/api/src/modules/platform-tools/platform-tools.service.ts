// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { PrismaClient } from '@tcrn/database';
import {
  ErrorCodes,
  PLATFORM_TOOL_DEFINITIONS,
  getPlatformToolDefinition,
  type PlatformToolConnectionEnvironment,
  type PlatformToolHealthState,
  type PlatformToolLocalDevMode,
  type PlatformToolSsoState,
} from '@tcrn/shared';

import { DatabaseService } from '../database/database.service';
import type {
  PlatformToolConfigMutationDto,
  PlatformToolConnectionQueryDto,
  UpsertPlatformToolConnectionDto,
} from './dto/platform-tools.dto';
import { validateUrlSafety } from './url-safety';

export interface PlatformToolRequestContext {
  tenantId: string;
  tenantSchema?: string;
  actorId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string | string[];
}

interface DefinitionRow {
  code: string;
  family: string;
  display_key: string;
  label: string;
  localized_label: Record<string, string>;
  default_state: string;
  owner_phase: string;
  human_ui: boolean;
  deep_link: boolean;
  allowed_local_dev_modes: string[];
  sso_requirement: 'required' | 'not_applicable';
  license_posture: string;
  default_connection: 'none';
  sort_order: number;
}

interface ConnectionRow {
  id: string;
  tenant_id: string;
  tool_code: string;
  environment: PlatformToolConnectionEnvironment;
  deployment_mode: PlatformToolLocalDevMode;
  local_dev_mode: PlatformToolLocalDevMode;
  endpoint_url: string | null;
  internal_service_url: string | null;
  namespace: string | null;
  service_name: string | null;
  enabled: boolean;
  readiness_state: string;
  sso_readiness_state: PlatformToolSsoState;
  health_status: PlatformToolHealthState;
  last_checked_at: Date | null;
  config_version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  version: number;
}

interface ConfigValueRow {
  config_key: string;
  config_value: Record<string, unknown> | null;
  is_secret: boolean;
  secret_ref: string | null;
  secret_status: string;
  updated_at: Date;
  updated_by: string | null;
}

interface HealthSnapshotRow {
  id: string;
  status: PlatformToolHealthState;
  latency_ms: number | null;
  safe_details: Record<string, unknown>;
  checked_at: Date;
  checked_by: string | null;
}

interface SsoReadinessRow {
  tool_code: string;
  status: PlatformToolSsoState;
  fail_closed: boolean;
  evidence: Record<string, unknown>;
}

interface AuditEventRow {
  id: string;
  tool_code: string;
  action: string;
  after_state: Record<string, unknown> | null;
  created_at: Date;
}

interface SerializedToolDefinition {
  code: string;
  family: string;
  displayKey: string;
  label: string;
  localizedLabel: unknown;
  defaultState: string;
  ownerPhase: string;
  humanUi: boolean;
  deepLink: boolean;
  allowedLocalDevModes: readonly PlatformToolLocalDevMode[] | string[];
  ssoRequirement: 'required' | 'not_applicable';
  licensePosture: string;
  defaultConnection: string;
  sortOrder: number;
  sourceOfTruthBoundary: string;
}

const DEFAULT_ENVIRONMENT: PlatformToolConnectionEnvironment = 'local';
const REDACTED = '[redacted]';

@Injectable()
export class PlatformToolsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listDefinitions(
    context?: PlatformToolRequestContext
  ): Promise<SerializedToolDefinition[]> {
    await this.ensureActorActive(context);

    const rows = await this.prisma.$queryRawUnsafe<DefinitionRow[]>(`
      SELECT
        code,
        family,
        display_key,
        label,
        localized_label,
        default_state,
        owner_phase,
        human_ui,
        deep_link,
        allowed_local_dev_modes,
        sso_requirement,
        license_posture,
        default_connection,
        sort_order
      FROM public.platform_tool_definition
      ORDER BY sort_order ASC, code ASC
    `);

    if (rows.length === 0) {
      return PLATFORM_TOOL_DEFINITIONS.map((definition) => ({
        ...definition,
        sourceOfTruthBoundary:
          'TCRN owns platform tool connection metadata; the external tool never owns product authority.',
      }));
    }

    return rows.map((row) => ({
      code: row.code,
      family: row.family,
      displayKey: row.display_key,
      label: row.label,
      localizedLabel: row.localized_label,
      defaultState: row.default_state,
      ownerPhase: row.owner_phase,
      humanUi: row.human_ui,
      deepLink: row.deep_link,
      allowedLocalDevModes: row.allowed_local_dev_modes,
      ssoRequirement: row.sso_requirement,
      licensePosture: row.license_posture,
      defaultConnection: row.default_connection,
      sortOrder: row.sort_order,
      sourceOfTruthBoundary:
        'TCRN owns platform tool connection metadata; the external tool never owns product authority.',
    }));
  }

  async listConnections(query: PlatformToolConnectionQueryDto, context: PlatformToolRequestContext) {
    await this.ensureActorActive(context);

    const environment = query.environment ?? DEFAULT_ENVIRONMENT;
    const definitions = await this.listDefinitions();
    const rows = await this.prisma.$queryRawUnsafe<ConnectionRow[]>(
      `
        SELECT *
        FROM public.platform_tool_connection
        WHERE tenant_id = $1::uuid
          AND environment = $2
        ORDER BY tool_code ASC
      `,
      context.tenantId,
      environment
    );
    const byCode = new Map(rows.map((row) => [row.tool_code, row]));
    const ssoRows = await this.readSsoReadiness();
    const ssoByCode = new Map(ssoRows.map((row) => [row.tool_code, row]));

    return definitions
      .filter((definition) => !query.family || definition.family === query.family)
      .map((definition) =>
        this.serializeConnection({
          definition,
          connection: byCode.get(definition.code) ?? null,
          configs: [],
          healthSnapshots: [],
          ssoReadiness: ssoByCode.get(definition.code) ?? null,
          auditEvents: [],
          environment,
        })
      );
  }

  async getConnection(
    toolCode: string,
    query: PlatformToolConnectionQueryDto,
    context: PlatformToolRequestContext
  ) {
    await this.ensureActorActive(context);

    const definition = await this.getDefinitionOrThrow(toolCode);
    const environment = query.environment ?? DEFAULT_ENVIRONMENT;
    const connection = await this.findConnection(context.tenantId, toolCode, environment);
    const configs = connection ? await this.listConfigValues(connection.id) : [];
    const healthSnapshots = connection ? await this.listHealthSnapshots(connection.id) : [];
    const auditEvents = await this.listAuditEvents(context.tenantId, toolCode, connection?.id);
    const ssoReadiness = await this.getSsoReadiness(toolCode);

    return this.serializeConnection({
      definition,
      connection,
      configs,
      healthSnapshots,
      ssoReadiness,
      auditEvents,
      environment,
    });
  }

  async upsertConnection(
    toolCode: string,
    dto: UpsertPlatformToolConnectionDto,
    context: PlatformToolRequestContext
  ) {
    await this.ensureActorActive(context);

    const definition = await this.getDefinitionOrThrow(toolCode);
    const environment = dto.environment ?? DEFAULT_ENVIRONMENT;
    const deploymentMode = dto.deploymentMode ?? 'disabled';
    const localDevMode = dto.localDevMode ?? deploymentMode;
    const allowedModes = new Set(definition.allowedLocalDevModes);

    if (!allowedModes.has(deploymentMode) || !allowedModes.has(localDevMode)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_INVALID,
        message: 'Unsupported local development mode for this tool',
      });
    }

    const endpointUrl = this.normalizeNullableString(dto.endpointUrl);
    const internalServiceUrl = this.normalizeNullableString(dto.internalServiceUrl);
    const namespace = this.normalizeNullableString(dto.namespace);
    const serviceName = this.normalizeNullableString(dto.serviceName);
    const existing = await this.findConnection(context.tenantId, toolCode, environment);

    try {
      await this.validateConfiguredUrls({
        endpointUrl,
        internalServiceUrl,
        namespace,
        serviceName,
        enabled: dto.enabled ?? false,
      });
    } catch (error) {
      await this.writeAudit(context, {
        connectionId: existing?.id,
        toolCode,
        action: 'connection.validation_denied',
        beforeState: existing ? this.redactConnection(existing) : null,
        afterState: {
          endpointUrlPresent: Boolean(endpointUrl),
          internalServiceUrlPresent: Boolean(internalServiceUrl),
          namespacePresent: Boolean(namespace),
          serviceNamePresent: Boolean(serviceName),
          reason: this.getExceptionReason(error),
          rawValueLogged: false,
        },
      });
      throw error;
    }

    if (dto.version && existing && dto.version !== existing.version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Platform tool connection version mismatch',
      });
    }

    const ssoReadiness = await this.getSsoReadiness(toolCode);
    const readinessState = this.deriveReadinessState({
      enabled: dto.enabled ?? existing?.enabled ?? false,
      endpointUrl,
      definitionSsoRequirement: definition.ssoRequirement,
      ssoState: ssoReadiness?.status ?? (definition.ssoRequirement === 'not_applicable' ? 'not_applicable' : 'blocked'),
    });

    const connection = existing
      ? await this.updateConnectionRow(existing.id, {
          deploymentMode,
          localDevMode,
          endpointUrl,
          internalServiceUrl,
          namespace,
          serviceName,
          enabled: dto.enabled ?? existing.enabled,
          readinessState,
          ssoReadinessState:
            ssoReadiness?.status ??
            (definition.ssoRequirement === 'not_applicable' ? 'not_applicable' : 'blocked'),
          actorId: context.actorId,
        })
      : await this.insertConnectionRow(context.tenantId, toolCode, environment, {
          deploymentMode,
          localDevMode,
          endpointUrl,
          internalServiceUrl,
          namespace,
          serviceName,
          enabled: dto.enabled ?? false,
          readinessState,
          ssoReadinessState:
            ssoReadiness?.status ??
            (definition.ssoRequirement === 'not_applicable' ? 'not_applicable' : 'blocked'),
          actorId: context.actorId,
        });

    if (dto.configs?.length) {
      await this.applyConfigMutations(connection.id, toolCode, dto.configs, context);
    }

    await this.writeAudit(context, {
      connectionId: connection.id,
      toolCode,
      action: existing ? 'connection.update' : 'connection.create',
      beforeState: existing ? this.redactConnection(existing) : null,
      afterState: this.redactConnection(connection),
    });

    return this.getConnection(toolCode, { environment }, context);
  }

  async runHealthCheck(
    toolCode: string,
    query: PlatformToolConnectionQueryDto,
    context: PlatformToolRequestContext
  ) {
    await this.ensureActorActive(context);

    const definition = await this.getDefinitionOrThrow(toolCode);
    const environment = query.environment ?? DEFAULT_ENVIRONMENT;
    let connection = await this.findConnection(context.tenantId, toolCode, environment);

    if (!connection) {
      connection = await this.insertConnectionRow(context.tenantId, toolCode, environment, {
        deploymentMode: 'disabled',
        localDevMode: 'disabled',
        endpointUrl: null,
        internalServiceUrl: null,
        namespace: null,
        serviceName: null,
        enabled: false,
        readinessState: 'not_configured',
        ssoReadinessState:
          definition.ssoRequirement === 'not_applicable' ? 'not_applicable' : 'blocked',
        actorId: context.actorId,
      });
    }

    const started = Date.now();
    const health = await this.evaluateHealth(definition, connection);
    const latencyMs = Math.max(0, Date.now() - started);

    const snapshotRows = await this.prisma.$queryRawUnsafe<HealthSnapshotRow[]>(
      `
        INSERT INTO public.platform_tool_health_snapshot
          (connection_id, status, latency_ms, safe_details, checked_by)
        VALUES ($1::uuid, $2, $3, $4::jsonb, $5::uuid)
        RETURNING id, status, latency_ms, safe_details, checked_at, checked_by
      `,
      connection.id,
      health.status,
      latencyMs,
      JSON.stringify(health.safeDetails),
      context.actorId ?? null
    );

    await this.prisma.$executeRawUnsafe(
      `
        UPDATE public.platform_tool_connection
        SET health_status = $2::varchar,
            last_checked_at = now(),
            readiness_state = CASE $2::varchar
              WHEN 'healthy' THEN 'ready'
              WHEN 'degraded' THEN 'degraded'
              WHEN 'disabled' THEN 'disabled'
              WHEN 'not_configured' THEN 'not_configured'
              WHEN 'sso_required' THEN 'sso_required'
              ELSE 'unhealthy'
            END,
            updated_at = now(),
            updated_by = $3::uuid,
            version = version + 1
        WHERE id = $1::uuid
      `,
      connection.id,
      health.status,
      context.actorId ?? null
    );

    await this.writeAudit(context, {
      connectionId: connection.id,
      toolCode,
      action: 'health.run',
      beforeState: this.redactConnection(connection),
      afterState: {
        status: health.status,
        latencyMs,
        safeDetails: health.safeDetails,
      },
    });

    return {
      toolCode,
      environment,
      snapshot: this.serializeHealthSnapshot(snapshotRows[0]),
    };
  }

  async getDeepLink(
    toolCode: string,
    query: PlatformToolConnectionQueryDto,
    context: PlatformToolRequestContext
  ) {
    await this.ensureActorActive(context);

    const definition = await this.getDefinitionOrThrow(toolCode);
    const environment = query.environment ?? DEFAULT_ENVIRONMENT;
    const connection = await this.findConnection(context.tenantId, toolCode, environment);
    const ssoReadiness = await this.getSsoReadiness(toolCode);
    const denial = await this.getDeepLinkDenialReason(definition, connection, ssoReadiness);

    await this.writeAudit(context, {
      connectionId: connection?.id,
      toolCode,
      action: denial ? 'deep_link.denied' : 'deep_link.accepted',
      beforeState: null,
      afterState: {
        state: denial ?? 'accepted',
        environment,
      },
    });

    if (denial) {
      return {
        toolCode,
        environment,
        state: denial,
        url: null,
        opensInNewTab: false,
      };
    }

    return {
      toolCode,
      environment,
      state: 'accepted',
      url: connection?.endpoint_url ?? null,
      opensInNewTab: true,
    };
  }

  async getDeploymentBoundary(context: PlatformToolRequestContext) {
    await this.ensureActorActive(context);

    const definitions = await this.listDefinitions();
    const rows = await this.prisma.$queryRawUnsafe<ConnectionRow[]>(
      `
        SELECT *
        FROM public.platform_tool_connection
        WHERE tenant_id = $1::uuid
        ORDER BY tool_code ASC, environment ASC
      `,
      context.tenantId
    );

    return {
      tenantId: context.tenantId,
      liveClusterRequired: false,
      boundary:
        'Phase 4 records intended deployment metadata only; it is not evidence that a full external tool stack is installed or enabled.',
      tools: definitions.map((definition) => {
        const connection = rows.find((row) => row.tool_code === definition.code);

        return {
          toolCode: definition.code,
          family: definition.family,
          defaultConnection: definition.defaultConnection,
          allowedLocalDevModes: definition.allowedLocalDevModes,
          requiredSecretRefs: this.requiredSecretRefs(definition.code),
          k8s: connection
            ? {
                namespace: connection.namespace,
                serviceName: connection.service_name,
                internalServiceUrl: connection.internal_service_url,
                deploymentMode: connection.deployment_mode,
                localDevMode: connection.local_dev_mode,
              }
            : null,
        };
      }),
    };
  }

  private get prisma(): PrismaClient {
    return this.databaseService.getPrisma();
  }

  private async getDefinitionOrThrow(toolCode: string) {
    const definitions = await this.listDefinitions();
    const definition = definitions.find((entry) => entry.code === toolCode);

    if (!definition) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: `Platform tool '${toolCode}' was not found`,
      });
    }

    return definition;
  }

  private async ensureActorActive(context?: PlatformToolRequestContext) {
    if (!context) {
      return;
    }

    if (!context.actorId || !context.tenantSchema || !/^[A-Za-z0-9_]+$/.test(context.tenantSchema)) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Active AC operator context is required for platform tool connections',
      });
    }

    const rows = await this.prisma.$queryRawUnsafe<Array<{ isActive: boolean }>>(
      `
        SELECT is_active as "isActive"
        FROM "${context.tenantSchema}".system_user
        WHERE id = $1::uuid
        LIMIT 1
      `,
      context.actorId
    );

    if (!rows[0]?.isActive) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Platform tool actor is not active',
      });
    }
  }

  private async findConnection(
    tenantId: string,
    toolCode: string,
    environment: PlatformToolConnectionEnvironment
  ) {
    const rows = await this.prisma.$queryRawUnsafe<ConnectionRow[]>(
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

  private async insertConnectionRow(
    tenantId: string,
    toolCode: string,
    environment: PlatformToolConnectionEnvironment,
    input: {
      deploymentMode: PlatformToolLocalDevMode;
      localDevMode: PlatformToolLocalDevMode;
      endpointUrl: string | null;
      internalServiceUrl: string | null;
      namespace: string | null;
      serviceName: string | null;
      enabled: boolean;
      readinessState: string;
      ssoReadinessState: PlatformToolSsoState;
      actorId?: string;
    }
  ) {
    const rows = await this.prisma.$queryRawUnsafe<ConnectionRow[]>(
      `
        INSERT INTO public.platform_tool_connection
          (
            tenant_id,
            tool_code,
            environment,
            deployment_mode,
            local_dev_mode,
            endpoint_url,
            internal_service_url,
            namespace,
            service_name,
            enabled,
            readiness_state,
            sso_readiness_state,
            created_by,
            updated_by
          )
        VALUES
          ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::uuid, $13::uuid)
        RETURNING *
      `,
      tenantId,
      toolCode,
      environment,
      input.deploymentMode,
      input.localDevMode,
      input.endpointUrl,
      input.internalServiceUrl,
      input.namespace,
      input.serviceName,
      input.enabled,
      input.readinessState,
      input.ssoReadinessState,
      input.actorId ?? null
    );

    return rows[0];
  }

  private async updateConnectionRow(
    connectionId: string,
    input: {
      deploymentMode: PlatformToolLocalDevMode;
      localDevMode: PlatformToolLocalDevMode;
      endpointUrl: string | null;
      internalServiceUrl: string | null;
      namespace: string | null;
      serviceName: string | null;
      enabled: boolean;
      readinessState: string;
      ssoReadinessState: PlatformToolSsoState;
      actorId?: string;
    }
  ) {
    const rows = await this.prisma.$queryRawUnsafe<ConnectionRow[]>(
      `
        UPDATE public.platform_tool_connection
        SET deployment_mode = $2,
            local_dev_mode = $3,
            endpoint_url = $4,
            internal_service_url = $5,
            namespace = $6,
            service_name = $7,
            enabled = $8,
            readiness_state = $9,
            sso_readiness_state = $10,
            updated_by = $11::uuid,
            updated_at = now(),
            config_version = config_version + 1,
            version = version + 1
        WHERE id = $1::uuid
        RETURNING *
      `,
      connectionId,
      input.deploymentMode,
      input.localDevMode,
      input.endpointUrl,
      input.internalServiceUrl,
      input.namespace,
      input.serviceName,
      input.enabled,
      input.readinessState,
      input.ssoReadinessState,
      input.actorId ?? null
    );

    return rows[0];
  }

  private async listConfigValues(connectionId: string) {
    return this.prisma.$queryRawUnsafe<ConfigValueRow[]>(
      `
        SELECT config_key, config_value, is_secret, secret_ref, secret_status, updated_at, updated_by
        FROM public.platform_tool_config_value
        WHERE connection_id = $1::uuid
        ORDER BY config_key ASC
      `,
      connectionId
    );
  }

  private async listHealthSnapshots(connectionId: string) {
    return this.prisma.$queryRawUnsafe<HealthSnapshotRow[]>(
      `
        SELECT id, status, latency_ms, safe_details, checked_at, checked_by
        FROM public.platform_tool_health_snapshot
        WHERE connection_id = $1::uuid
        ORDER BY checked_at DESC
        LIMIT 5
      `,
      connectionId
    );
  }

  private async listAuditEvents(tenantId: string, toolCode: string, connectionId?: string) {
    return this.prisma.$queryRawUnsafe<AuditEventRow[]>(
      `
        SELECT id, tool_code, action, after_state, created_at
        FROM public.platform_tool_audit_event
        WHERE tenant_id = $1::uuid
          AND tool_code = $2
          AND ($3::uuid IS NULL OR connection_id = $3::uuid)
        ORDER BY created_at DESC
        LIMIT 10
      `,
      tenantId,
      toolCode,
      connectionId ?? null
    );
  }

  private async readSsoReadiness() {
    return this.prisma.$queryRawUnsafe<SsoReadinessRow[]>(`
      SELECT tool_code, status, fail_closed, evidence
      FROM public.platform_external_tool_sso_readiness
    `);
  }

  private async getSsoReadiness(toolCode: string) {
    const rows = await this.prisma.$queryRawUnsafe<SsoReadinessRow[]>(
      `
        SELECT tool_code, status, fail_closed, evidence
        FROM public.platform_external_tool_sso_readiness
        WHERE tool_code = $1
        LIMIT 1
      `,
      toolCode
    );

    return rows[0] ?? null;
  }

  private async applyConfigMutations(
    connectionId: string,
    toolCode: string,
    configs: PlatformToolConfigMutationDto[],
    context: PlatformToolRequestContext
  ) {
    for (const item of configs) {
      const mutation = item.mutation ?? 'keep';
      const isSecret = item.isSecret ?? mutation === 'reference';

      if (mutation === 'keep') {
        continue;
      }

      const secretStatus = this.resolveSecretStatus(item);
      const secretRef = this.resolveSecretRef(connectionId, item);
      const configValue =
        isSecret || mutation === 'clear' || mutation === 'reference'
          ? null
          : JSON.stringify(item.configValue ?? {});

      await this.prisma.$executeRawUnsafe(
        `
          INSERT INTO public.platform_tool_config_value
            (
              connection_id,
              config_key,
              config_value,
              is_secret,
              secret_ref,
              secret_status,
              updated_by
            )
          VALUES ($1::uuid, $2, $3::jsonb, $4, $5, $6, $7::uuid)
          ON CONFLICT (connection_id, config_key) DO UPDATE SET
            config_value = EXCLUDED.config_value,
            is_secret = EXCLUDED.is_secret,
            secret_ref = EXCLUDED.secret_ref,
            secret_status = EXCLUDED.secret_status,
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
        `,
        connectionId,
        item.configKey,
        configValue,
        isSecret,
        secretRef,
        secretStatus,
        context.actorId ?? null
      );

      await this.writeAudit(context, {
        connectionId,
        toolCode,
        action: `config.${mutation}`,
        beforeState: null,
        afterState: {
          configKey: item.configKey,
          mutation,
          isSecret,
          secretStatus,
          secretReferenceMode:
            mutation === 'reference' ? 'external_reference' : isSecret ? 'managed_reference' : 'none',
          hasNonSecretConfigValue: Boolean(configValue),
          rawValueLogged: false,
        },
      });
    }
  }

  private async writeAudit(
    context: PlatformToolRequestContext,
    input: {
      connectionId?: string | null;
      toolCode: string;
      action: string;
      beforeState?: Record<string, unknown> | null;
      afterState?: Record<string, unknown> | null;
    }
  ) {
    await this.prisma.$executeRawUnsafe(
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
          ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, $7::jsonb, $8, $9, $10)
      `,
      context.tenantId,
      input.connectionId ?? null,
      input.toolCode,
      input.action,
      context.actorId ?? null,
      input.beforeState ? JSON.stringify(input.beforeState) : null,
      input.afterState ? JSON.stringify(input.afterState) : null,
      context.requestId ?? null,
      context.ipAddress ?? null,
      Array.isArray(context.userAgent) ? context.userAgent.join(',') : (context.userAgent ?? null)
    );
  }

  private async validateConfiguredUrls(input: {
    endpointUrl: string | null;
    internalServiceUrl: string | null;
    namespace: string | null;
    serviceName: string | null;
    enabled: boolean;
  }) {
    for (const [field, url] of [
      ['endpointUrl', input.endpointUrl],
      ['internalServiceUrl', input.internalServiceUrl],
    ] as const) {
      if (!url) {
        continue;
      }

      const isInternalServiceUrl = field === 'internalServiceUrl';
      const result = await validateUrlSafety(url, {
        allowKubernetesServiceHost: isInternalServiceUrl,
        resolveDns: !isInternalServiceUrl,
      });

      if (!result.safe) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FIELD_INVALID,
          message: `${field} is not SSRF-safe`,
          details: {
            field,
            reason: result.reason,
          },
        });
      }
    }

    if (input.enabled && !input.endpointUrl && !input.internalServiceUrl) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_REQUIRED,
        message: 'Enabled platform tool connections require a safe endpoint or service URL',
      });
    }

    if (input.internalServiceUrl && (!input.namespace || !input.serviceName)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_REQUIRED,
        message: 'Internal service URL requires namespace and service name boundary metadata',
      });
    }
  }

  private deriveReadinessState(input: {
    enabled: boolean;
    endpointUrl: string | null;
    definitionSsoRequirement: 'required' | 'not_applicable';
    ssoState: PlatformToolSsoState;
  }) {
    if (!input.enabled) {
      return input.endpointUrl ? 'disabled' : 'not_configured';
    }

    if (input.definitionSsoRequirement === 'required' && input.ssoState !== 'ready') {
      return 'sso_required';
    }

    return input.endpointUrl ? 'configured' : 'not_configured';
  }

  private async evaluateHealth(definition: SerializedToolDefinition, connection: ConnectionRow) {
    if (!connection.enabled) {
      return {
        status: connection.endpoint_url || connection.internal_service_url ? 'disabled' : 'not_configured',
        safeDetails: {
          probeMode: 'metadata_only',
          reason: 'connection_disabled',
        },
      } satisfies { status: PlatformToolHealthState; safeDetails: Record<string, unknown> };
    }

    if (definition.ssoRequirement === 'required' && connection.sso_readiness_state !== 'ready') {
      return {
        status: 'sso_required',
        safeDetails: {
          probeMode: 'metadata_only',
          reason: 'sso_not_ready',
        },
      } satisfies { status: PlatformToolHealthState; safeDetails: Record<string, unknown> };
    }

    const targetUrl = connection.endpoint_url ?? connection.internal_service_url;

    if (!targetUrl) {
      return {
        status: 'not_configured',
        safeDetails: {
          probeMode: 'metadata_only',
          reason: 'missing_endpoint',
        },
      } satisfies { status: PlatformToolHealthState; safeDetails: Record<string, unknown> };
    }

    const safety = await validateUrlSafety(targetUrl, {
      allowKubernetesServiceHost: Boolean(connection.internal_service_url),
      resolveDns: !connection.internal_service_url,
    });

    if (!safety.safe) {
      return {
        status: 'unhealthy',
        safeDetails: {
          probeMode: 'metadata_only',
          reason: safety.reason,
        },
      } satisfies { status: PlatformToolHealthState; safeDetails: Record<string, unknown> };
    }

    if (connection.local_dev_mode === 'stubbed') {
      return {
        status: 'healthy',
        safeDetails: {
          probeMode: 'stubbed',
          host: safety.hostname,
        },
      } satisfies { status: PlatformToolHealthState; safeDetails: Record<string, unknown> };
    }

    return {
      status: 'degraded',
      safeDetails: {
        probeMode: 'metadata_only',
        host: safety.hostname,
        reason: 'network_probe_deferred_until_tool_specific_phase',
      },
    } satisfies { status: PlatformToolHealthState; safeDetails: Record<string, unknown> };
  }

  private async getDeepLinkDenialReason(
    definition: SerializedToolDefinition,
    connection: ConnectionRow | null,
    ssoReadiness: SsoReadinessRow | null
  ) {
    if (!definition.deepLink) {
      return 'disabled';
    }

    if (!connection) {
      return 'not_configured';
    }

    if (!connection.enabled) {
      return 'disabled';
    }

    if (!connection.endpoint_url) {
      return 'not_configured';
    }

    const safety = await validateUrlSafety(connection.endpoint_url, {
      resolveDns: true,
    });

    if (!safety.safe) {
      return 'unsafe_url';
    }

    if (definition.ssoRequirement === 'required' && ssoReadiness?.status !== 'ready') {
      return 'sso_required';
    }

    if (!['healthy', 'degraded'].includes(connection.health_status)) {
      return 'unhealthy';
    }

    return null;
  }

  private serializeConnection(input: {
    definition: SerializedToolDefinition;
    connection: ConnectionRow | null;
    configs: ConfigValueRow[];
    healthSnapshots: HealthSnapshotRow[];
    ssoReadiness: SsoReadinessRow | null;
    auditEvents: AuditEventRow[];
    environment: PlatformToolConnectionEnvironment;
  }) {
    return {
      definition: input.definition,
      connection: input.connection
        ? {
            id: input.connection.id,
            tenantId: input.connection.tenant_id,
            toolCode: input.connection.tool_code,
            environment: input.connection.environment,
            deploymentMode: input.connection.deployment_mode,
            localDevMode: input.connection.local_dev_mode,
            endpointUrl: input.connection.endpoint_url,
            internalServiceUrl: input.connection.internal_service_url,
            namespace: input.connection.namespace,
            serviceName: input.connection.service_name,
            enabled: input.connection.enabled,
            readinessState: input.connection.readiness_state,
            ssoReadinessState: input.connection.sso_readiness_state,
            healthStatus: input.connection.health_status,
            lastCheckedAt: input.connection.last_checked_at,
            configVersion: input.connection.config_version,
            version: input.connection.version,
          }
        : {
            id: null,
            toolCode: input.definition.code,
            environment: input.environment,
            deploymentMode: 'disabled',
            localDevMode: 'disabled',
            endpointUrl: null,
            internalServiceUrl: null,
            namespace: null,
            serviceName: null,
            enabled: false,
            readinessState: 'not_configured',
            ssoReadinessState:
              input.definition.ssoRequirement === 'not_applicable' ? 'not_applicable' : 'blocked',
            healthStatus: 'unknown',
            lastCheckedAt: null,
            configVersion: 0,
            version: 0,
          },
      configValues: input.configs.map((row) => ({
        configKey: row.config_key,
        isSecret: row.is_secret,
        value: row.is_secret ? REDACTED : row.config_value,
        secretRef: row.is_secret && row.secret_ref ? REDACTED : row.secret_ref,
        secretStatus: row.secret_status,
        updatedAt: row.updated_at,
      })),
      ssoReadiness: input.ssoReadiness
        ? {
            status: input.ssoReadiness.status,
            failClosed: input.ssoReadiness.fail_closed,
            evidence: input.ssoReadiness.evidence,
          }
        : {
            status: input.definition.ssoRequirement === 'not_applicable' ? 'not_applicable' : 'blocked',
            failClosed: input.definition.ssoRequirement !== 'not_applicable',
            evidence: {},
          },
      healthSnapshots: input.healthSnapshots.map((snapshot) =>
        this.serializeHealthSnapshot(snapshot)
      ),
      auditTrail: input.auditEvents.map((event) => ({
        id: event.id,
        toolCode: event.tool_code,
        action: event.action,
        afterState: event.after_state,
        createdAt: event.created_at,
      })),
    };
  }

  private serializeHealthSnapshot(snapshot: HealthSnapshotRow) {
    return {
      id: snapshot.id,
      status: snapshot.status,
      latencyMs: snapshot.latency_ms,
      safeDetails: snapshot.safe_details,
      checkedAt: snapshot.checked_at,
      checkedBy: snapshot.checked_by,
    };
  }

  private redactConnection(connection: ConnectionRow): Record<string, unknown> {
    return {
      id: connection.id,
      toolCode: connection.tool_code,
      environment: connection.environment,
      deploymentMode: connection.deployment_mode,
      localDevMode: connection.local_dev_mode,
      enabled: connection.enabled,
      readinessState: connection.readiness_state,
      ssoReadinessState: connection.sso_readiness_state,
      healthStatus: connection.health_status,
      hasEndpointUrl: Boolean(connection.endpoint_url),
      hasInternalServiceUrl: Boolean(connection.internal_service_url),
      namespace: connection.namespace,
      serviceName: connection.service_name,
      version: connection.version,
    };
  }

  private resolveSecretStatus(item: PlatformToolConfigMutationDto): string {
    if (item.mutation === 'clear') {
      return 'cleared';
    }

    if (item.mutation === 'reference') {
      if (!item.secretRef) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FIELD_REQUIRED,
          message: 'Secret reference mutation requires secretRef',
        });
      }

      if (!/^(env|vault|k8s):[A-Za-z0-9_.:/-]+$/.test(item.secretRef)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FIELD_INVALID,
          message: 'Secret reference must use env:, vault:, or k8s: prefix',
        });
      }

      return 'external_reference';
    }

    if (item.isSecret) {
      return 'set';
    }

    return 'not_set';
  }

  private resolveSecretRef(connectionId: string, item: PlatformToolConfigMutationDto): string | null {
    if (item.mutation === 'clear') {
      return null;
    }

    if (!item.isSecret && item.mutation !== 'reference') {
      return null;
    }

    if (item.mutation === 'reference') {
      return item.secretRef ?? null;
    }

    return `managed:${connectionId}:${item.configKey}`;
  }

  private normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private getExceptionReason(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();

      if (typeof response === 'object' && response && 'details' in response) {
        const details = (response as { details?: { reason?: unknown } }).details;

        if (typeof details?.reason === 'string') {
          return details.reason;
        }
      }

      if (typeof response === 'object' && response && 'message' in response) {
        const message = (response as { message?: unknown }).message;

        if (typeof message === 'string') {
          return message;
        }
      }
    }

    return 'unknown_validation_error';
  }

  private requiredSecretRefs(toolCode: string) {
    const definition = getPlatformToolDefinition(toolCode);

    if (!definition?.humanUi) {
      return [];
    }

    return [`env:PLATFORM_TOOL_${toolCode.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_CLIENT_SECRET`];
  }
}
