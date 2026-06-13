// SPDX-License-Identifier: Apache-2.0
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { PrismaClient } from '@tcrn/database';
import {
  ErrorCodes,
  OBSERVABILITY_ADAPTER_DEFINITIONS,
  OBSERVABILITY_SIGNAL_POLICY,
  getObservabilityAdapterDefinition,
  type ObservabilityAdapterCode,
  type ObservabilityBackendMode,
  type ObservabilityReadinessState,
  type PlatformToolConnectionEnvironment,
  type PlatformToolHealthState,
  type PlatformToolSsoState,
} from '@tcrn/shared';

import { DatabaseService } from '../database/database.service';
import { validateUrlSafety } from '../platform-tools/url-safety';
import type { ObservabilityAdapterQueryDto } from './dto/observability-adapters.dto';

export interface ObservabilityAdapterRequestContext {
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
  deployment_mode: ObservabilityBackendMode | string;
  local_dev_mode: ObservabilityBackendMode | string;
  endpoint_url: string | null;
  enabled: boolean;
  readiness_state: ObservabilityReadinessState | string;
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

interface SerializedAdapterDefinition {
  code: ObservabilityAdapterCode;
  label: string;
  localizedLabel: unknown;
  signalFamily: string;
  platformToolCode: string | null;
  defaultEnabled: false;
  defaultReadinessState: string;
  ownerPhase: string;
  humanUi: boolean;
  deepLink: boolean;
  safeQueryCapability: string;
  localDevModes: readonly string[];
  ssoRequirement: string;
  licensePosture: string;
  sourceOfTruthBoundary: string;
  defaultBackendState: string;
  sortOrder: number;
}

interface ObservabilityAdapterSummary {
  definition: SerializedAdapterDefinition;
  profile: {
    adapterCode: ObservabilityAdapterCode;
    environment: PlatformToolConnectionEnvironment;
    enabled: boolean;
    backendMode: string;
    readinessState: string;
    healthStatus: string;
    ssoState: PlatformToolSsoState | 'not_applicable';
    platformToolConnectionId: string | null;
    platformToolCode: string | null;
    endpointConfigured: boolean;
    lastCheckedAt: string | null;
    configVersion: number;
  };
  policy: {
    sourceOfTruthBoundary: string;
    rawQueryAllowedForOrdinaryTenants: false;
    maxQueryRangeHours: number;
    maxResultLimit: number;
  };
}

const DEFAULT_ENVIRONMENT: PlatformToolConnectionEnvironment = 'local';

@Injectable()
export class ObservabilityAdaptersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService
  ) {}

  async listDefinitions(context?: ObservabilityAdapterRequestContext) {
    await this.ensureActorActive(context);
    return OBSERVABILITY_ADAPTER_DEFINITIONS.map((definition) => ({ ...definition }));
  }

  async getSignalPolicy(context?: ObservabilityAdapterRequestContext) {
    await this.ensureActorActive(context);
    return {
      ...OBSERVABILITY_SIGNAL_POLICY,
      checkedAt: new Date().toISOString(),
    };
  }

  async getSummary(
    query: ObservabilityAdapterQueryDto,
    context: ObservabilityAdapterRequestContext
  ): Promise<ObservabilityAdapterSummary[]> {
    await this.ensureActorActive(context);

    const environment = query.environment ?? DEFAULT_ENVIRONMENT;
    const connections = await this.readPlatformConnections(context.tenantId, environment);
    const ssoReadiness = await this.readSsoReadiness();
    const connectionByTool = new Map(connections.map((row) => [row.tool_code, row]));
    const ssoByTool = new Map(ssoReadiness.map((row) => [row.tool_code, row]));

    return OBSERVABILITY_ADAPTER_DEFINITIONS.map((definition) =>
      this.serializeSummary({
        definition,
        environment,
        connection: definition.platformToolCode
          ? connectionByTool.get(definition.platformToolCode) ?? null
          : null,
        ssoReadiness: definition.platformToolCode
          ? ssoByTool.get(definition.platformToolCode) ?? null
          : null,
      })
    );
  }

  async getDeepLink(
    adapterCode: string,
    query: ObservabilityAdapterQueryDto,
    context: ObservabilityAdapterRequestContext
  ) {
    await this.ensureActorActive(context);

    const definition = getObservabilityAdapterDefinition(adapterCode);

    if (!definition) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Observability adapter not found',
      });
    }

    const environment = query.environment ?? DEFAULT_ENVIRONMENT;

    if (!definition.deepLink || !definition.platformToolCode) {
      const auditOk = await this.writeDeepLinkAudit(context, {
        adapterCode: definition.code,
        toolCode: definition.platformToolCode ?? definition.code,
        environment,
        state: 'not_configured',
        connectionId: null,
      });

      return {
        adapterCode: definition.code,
        environment,
        state: auditOk ? 'not_configured' : 'audit_failed',
        url: null,
        opensInNewTab: false,
      };
    }

    const connection = await this.findPlatformConnection(
      context.tenantId,
      definition.platformToolCode,
      environment
    );
    const ssoReadiness = await this.getSsoReadiness(definition.platformToolCode);
    const denial = await this.getDeepLinkDenialReason(connection, ssoReadiness);
    const state = denial ?? 'accepted';
    const auditOk = await this.writeDeepLinkAudit(context, {
      adapterCode: definition.code,
      toolCode: definition.platformToolCode,
      environment,
      state,
      connectionId: connection?.id ?? null,
    });

    if (!auditOk) {
      return {
        adapterCode: definition.code,
        environment,
        state: 'audit_failed',
        url: null,
        opensInNewTab: false,
      };
    }

    if (denial) {
      return {
        adapterCode: definition.code,
        environment,
        state: denial,
        url: null,
        opensInNewTab: false,
      };
    }

    return {
      adapterCode: definition.code,
      environment,
      state: 'accepted',
      url: connection?.endpoint_url ?? null,
      opensInNewTab: true,
    };
  }

  private serializeDefinition(
    definition: (typeof OBSERVABILITY_ADAPTER_DEFINITIONS)[number]
  ): SerializedAdapterDefinition {
    return { ...definition };
  }

  private serializeSummary(input: {
    definition: (typeof OBSERVABILITY_ADAPTER_DEFINITIONS)[number];
    environment: PlatformToolConnectionEnvironment;
    connection: PlatformConnectionRow | null;
    ssoReadiness: PlatformSsoReadinessRow | null;
  }): ObservabilityAdapterSummary {
    const envProfile = this.deriveEnvProfile(input.definition.code);
    const ssoState =
      input.definition.ssoRequirement === 'not_applicable'
        ? 'not_applicable'
        : input.ssoReadiness?.status ?? 'blocked';
    const readinessState =
      input.definition.platformToolCode && input.connection
        ? this.deriveConnectionReadiness(input.connection, ssoState)
        : envProfile.readinessState;

    return {
      definition: this.serializeDefinition(input.definition),
      profile: {
        adapterCode: input.definition.code,
        environment: input.environment,
        enabled: input.connection?.enabled ?? envProfile.enabled,
        backendMode: input.connection?.local_dev_mode ?? envProfile.backendMode,
        readinessState,
        healthStatus: input.connection?.health_status ?? envProfile.healthStatus,
        ssoState,
        platformToolConnectionId: input.connection?.id ?? null,
        platformToolCode: input.definition.platformToolCode,
        endpointConfigured: Boolean(input.connection?.endpoint_url ?? envProfile.endpointConfigured),
        lastCheckedAt: input.connection?.last_checked_at?.toISOString() ?? null,
        configVersion: input.connection?.version ?? 0,
      },
      policy: {
        sourceOfTruthBoundary: input.definition.sourceOfTruthBoundary,
        rawQueryAllowedForOrdinaryTenants:
          OBSERVABILITY_SIGNAL_POLICY.rawQueryAllowedForOrdinaryTenants,
        maxQueryRangeHours: OBSERVABILITY_SIGNAL_POLICY.maxQueryRangeHours,
        maxResultLimit: OBSERVABILITY_SIGNAL_POLICY.maxResultLimit,
      },
    };
  }

  private deriveEnvProfile(adapterCode: ObservabilityAdapterCode): {
    enabled: boolean;
    backendMode: ObservabilityBackendMode;
    readinessState: ObservabilityReadinessState;
    healthStatus: PlatformToolHealthState;
    endpointConfigured: boolean;
  } {
    const otelEnabled = this.configService.get<string>('OTEL_ENABLED', 'false') === 'true';
    const otelTraceEndpoint = this.configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT', '');
    const otelMetricsEndpoint = this.configService.get<string>(
      'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
      ''
    );
    const lokiEnabled = this.configService.get<string>('LOKI_ENABLED', 'false') === 'true';
    const lokiQueryUrl = this.configService.get<string>('LOKI_QUERY_URL', '');

    if (adapterCode === 'otel_trace_exporter') {
      return {
        enabled: otelEnabled && Boolean(otelTraceEndpoint),
        backendMode: otelEnabled ? 'external_provided' : 'disabled',
        readinessState: !otelEnabled ? 'disabled' : otelTraceEndpoint ? 'external_provided' : 'missing_config',
        healthStatus: !otelEnabled ? 'disabled' : otelTraceEndpoint ? 'unknown' : 'not_configured',
        endpointConfigured: Boolean(otelTraceEndpoint),
      };
    }

    if (adapterCode === 'otel_metrics_exporter') {
      return {
        enabled: otelEnabled && Boolean(otelMetricsEndpoint),
        backendMode: otelEnabled ? 'external_provided' : 'disabled',
        readinessState: !otelEnabled
          ? 'disabled'
          : otelMetricsEndpoint
            ? 'external_provided'
            : 'missing_config',
        healthStatus: !otelEnabled ? 'disabled' : otelMetricsEndpoint ? 'unknown' : 'not_configured',
        endpointConfigured: Boolean(otelMetricsEndpoint),
      };
    }

    if (adapterCode === 'loki_log_backend') {
      return {
        enabled: lokiEnabled,
        backendMode: lokiEnabled ? 'compose_opt_in' : 'disabled',
        readinessState: lokiEnabled ? 'compose_opt_in_not_running' : 'disabled',
        healthStatus: lokiEnabled && lokiQueryUrl ? 'unknown' : 'disabled',
        endpointConfigured: Boolean(lokiQueryUrl),
      };
    }

    if (adapterCode === 'prometheus_alert_rules') {
      return {
        enabled: false,
        backendMode: 'repository_readback',
        readinessState: 'repository_readback',
        healthStatus: 'not_configured',
        endpointConfigured: false,
      };
    }

    return {
      enabled: false,
      backendMode: 'disabled',
      readinessState: 'disabled',
      healthStatus: 'disabled',
      endpointConfigured: false,
    };
  }

  private deriveConnectionReadiness(
    connection: PlatformConnectionRow,
    ssoState: PlatformToolSsoState | 'not_applicable'
  ) {
    if (!connection.enabled) {
      return 'disabled';
    }

    if (!connection.endpoint_url) {
      return 'not_configured';
    }

    if (ssoState === 'blocked') {
      return 'sso_required';
    }

    if (connection.health_status === 'unhealthy') {
      return 'unhealthy';
    }

    return connection.readiness_state;
  }

  private async getDeepLinkDenialReason(
    connection: PlatformConnectionRow | null,
    ssoReadiness: PlatformSsoReadinessRow | null
  ) {
    if (!connection || !connection.endpoint_url) {
      return 'not_configured';
    }

    if (!connection.enabled) {
      return 'disabled';
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

    return null;
  }

  private async readPlatformConnections(
    tenantId: string,
    environment: PlatformToolConnectionEnvironment
  ) {
    return this.prisma.$queryRawUnsafe<PlatformConnectionRow[]>(
      `
        SELECT *
        FROM public.platform_tool_connection
        WHERE tenant_id = $1::uuid
          AND environment = $2
          AND tool_code = 'grafana'
        ORDER BY tool_code ASC
      `,
      tenantId,
      environment
    );
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

  private async readSsoReadiness() {
    return this.prisma.$queryRawUnsafe<PlatformSsoReadinessRow[]>(`
      SELECT tool_code, status, fail_closed
      FROM public.platform_external_tool_sso_readiness
      WHERE tool_code = 'grafana'
    `);
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

  private async ensureActorActive(context?: ObservabilityAdapterRequestContext): Promise<void> {
    if (
      !context?.actorId ||
      !context.tenantSchema ||
      !/^[A-Za-z0-9_]+$/.test(context.tenantSchema)
    ) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Observability adapter requests require an active AC operator',
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

  private async writeDeepLinkAudit(
    context: ObservabilityAdapterRequestContext,
    input: {
      adapterCode: ObservabilityAdapterCode;
      toolCode: string;
      environment: PlatformToolConnectionEnvironment;
      state: string;
      connectionId: string | null;
    }
  ): Promise<boolean> {
    try {
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
            ($1::uuid, $2::uuid, $3, $4, $5::uuid, NULL, $6::jsonb, $7, $8, $9)
        `,
        context.tenantId,
        input.connectionId,
        input.toolCode,
        input.state === 'accepted'
          ? 'observability.deep_link.accepted'
          : 'observability.deep_link.denied',
        context.actorId ?? null,
        JSON.stringify({
          adapterCode: input.adapterCode,
          environment: input.environment,
          state: input.state,
          rawUrlLogged: false,
        }),
        context.requestId ?? null,
        context.ipAddress ?? null,
        Array.isArray(context.userAgent) ? context.userAgent.join(',') : (context.userAgent ?? null)
      );

      return true;
    } catch {
      return false;
    }
  }

  private get prisma(): PrismaClient {
    return this.databaseService.getPrisma();
  }
}
