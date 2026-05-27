// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { createHash } from 'crypto';
import type { Request } from 'express';

import type { RequestContext } from '@tcrn/shared';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';
import { ChangeLogService } from '../log/services';
import { RequirePlatformConfigPermission } from './config-rbac';
import { GlobalConfigService, type GlobalConfigAuditSnapshot } from './global-config.service';
import {
  buildRedactedPlatformConfigValue,
  getPlatformConfigExposurePolicy,
  type PlatformConfigExposurePolicy,
} from './platform-config-exposure';

// DTOs
export class SetConfigDto {
  @ApiProperty({
    description: 'JSON value to store for the specified platform config key',
    example: { domain: 'tcrn.app' },
  })
  @IsNotEmpty()
  value: unknown;
}

const GLOBAL_CONFIG_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string', example: 'system.baseDomain' },
    value: {
      type: 'object',
      additionalProperties: true,
      example: { domain: 'tcrn.app' },
    },
    description: {
      type: 'string',
      nullable: true,
      example: 'Base domain for system subdomains (e.g., tcrn.app)',
    },
  },
  required: ['key', 'value'],
} as const;

const createSuccessEnvelopeSchema = (
  dataSchema: Record<string, unknown>,
  exampleData: unknown
) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: exampleData,
  },
});

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code,
      message,
    },
  },
});

const GLOBAL_CONFIG_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(GLOBAL_CONFIG_ITEM_SCHEMA, {
  key: 'system.baseDomain',
  value: { domain: 'tcrn.app' },
  description: 'Base domain for system subdomains (e.g., tcrn.app)',
});

const GLOBAL_CONFIG_REDACTED_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      key: { type: 'string', example: 'email.config' },
      value: {
        type: 'object',
        properties: {
          exposureClass: { type: 'string', example: 'secret_or_sensitive_config' },
          redacted: { type: 'boolean', example: true },
          summary: {
            type: 'string',
            example: 'Email provider configuration; raw secret values must never leave the service.',
          },
        },
        required: ['exposureClass', 'redacted', 'summary'],
      },
      description: {
        type: 'string',
        nullable: true,
        example: 'Email provider configuration',
      },
    },
    required: ['key', 'value'],
  },
  {
    key: 'email.config',
    value: {
      exposureClass: 'secret_or_sensitive_config',
      redacted: true,
      summary: 'Email provider configuration; raw secret values must never leave the service.',
    },
    description: 'Email provider configuration',
  }
);

const GLOBAL_CONFIG_LIST_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'array',
    items: GLOBAL_CONFIG_ITEM_SCHEMA,
  },
  [
    {
      key: 'system.baseDomain',
      value: { domain: 'tcrn.app' },
      description: 'Base domain for system subdomains (e.g., tcrn.app)',
    },
  ]
);

const GLOBAL_CONFIG_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  'VALIDATION_FAILED',
  'Config value is required'
);

const GLOBAL_CONFIG_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required'
);

const GLOBAL_CONFIG_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_FORBIDDEN',
  'You do not have permission to access platform config'
);

const GLOBAL_CONFIG_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  'CONFIG_NOT_FOUND',
  "Config 'system.baseDomain' not found"
);

/**
 * Platform Config Controller
 * For AC tenant admin to manage global platform configuration
 * Route: /api/v1/platform/config
 */
@ApiTags('System - Config')
@Controller('platform/config')
@ApiBearerAuth()
export class GlobalConfigController {
  constructor(
    private readonly globalConfigService: GlobalConfigService,
    private readonly changeLogService: ChangeLogService
  ) {}

  /**
   * Check if user is AC tenant admin
   */
  private checkAcTenantAccess(user: AuthenticatedUser): void {
    // AC tenant has schema 'tenant_ac'
    if (user.tenantSchema !== 'tenant_ac') {
      throw new ForbiddenException({
        code: 'AC_TENANT_ONLY',
        message: 'This operation is only available for AC tenant administrators',
      });
    }
  }

  private assertKnownExposurePolicy(key: string): PlatformConfigExposurePolicy {
    const policy = getPlatformConfigExposurePolicy(key);

    if (!policy) {
      throw new ForbiddenException({
        code: 'PLATFORM_CONFIG_EXPOSURE_DENIED',
        message: `Platform config key '${key}' is not cataloged for runtime exposure`,
      });
    }

    return policy;
  }

  private assertPolicyReadableByUser(
    user: AuthenticatedUser,
    policy: PlatformConfigExposurePolicy
  ): void {
    if (policy.exposureClass === 'public_runtime_config') {
      return;
    }

    this.checkAcTenantAccess(user);
  }

  private async readConfigForPolicy(key: string, policy: PlatformConfigExposurePolicy) {
    if (policy.exposureClass !== 'secret_or_sensitive_config') {
      return this.globalConfigService.get(key);
    }

    const metadata = await this.globalConfigService.getMetadata(key);

    if (!metadata) {
      return null;
    }

    return {
      key: metadata.key,
      value: buildRedactedPlatformConfigValue(policy),
      description: metadata.description,
    };
  }

  private buildRequestContext(user: AuthenticatedUser, req: Request): RequestContext {
    const requestWithTrace = req as Request & { requestId?: string; traceId?: string };

    return {
      userId: user.id,
      userName: user.username ?? user.email ?? user.id,
      tenantId: user.tenantId,
      tenantSchema: user.tenantSchema,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: this.firstHeaderValue(req.headers['user-agent']),
      requestId:
        requestWithTrace.requestId ??
        requestWithTrace.traceId ??
        this.firstHeaderValue(req.headers['x-request-id']),
      traceId: requestWithTrace.traceId,
    };
  }

  private firstHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private buildAuditValue(
    snapshot: GlobalConfigAuditSnapshot,
    policy: PlatformConfigExposurePolicy
  ): Record<string, unknown> {
    const base = {
      key: snapshot.key,
      exposureClass: policy.exposureClass,
      description: snapshot.description ?? null,
    };

    if (policy.exposureClass === 'secret_or_sensitive_config') {
      return {
        ...base,
        valueRedacted: true,
        valueSummary: policy.summary,
        valueDigest: this.hashJsonValue(snapshot.value),
      };
    }

    return {
      ...base,
      value: snapshot.value,
    };
  }

  private hashJsonValue(value: unknown): string {
    return createHash('sha256').update(this.stableStringify(value)).digest('hex');
  }

  private buildAuditDecision(
    key: string,
    policy: PlatformConfigExposurePolicy,
    context: RequestContext
  ) {
    const secretOrSensitive = policy.exposureClass === 'secret_or_sensitive_config';

    return {
      key,
      exposureClass: policy.exposureClass,
      valueHandling: secretOrSensitive ? 'redacted_summary_and_digest' : 'plain_value',
      rawValueLogged: !secretOrSensitive,
      requestId: context.requestId ?? null,
    };
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      return `{${Object.keys(value as Record<string, unknown>)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${this.stableStringify((value as Record<string, unknown>)[key])}`
        )
        .join(',')}}`;
    }

    return JSON.stringify(value) ?? 'undefined';
  }

  private async recordPlatformConfigChange(
    key: string,
    policy: PlatformConfigExposurePolicy,
    before: GlobalConfigAuditSnapshot | null,
    after: GlobalConfigAuditSnapshot | null,
    context: RequestContext
  ) {
    if (!after) {
      return;
    }

    await this.changeLogService.createDirect(
      {
        action: before ? 'update' : 'create',
        objectType: 'platform_config',
        objectId: after.id,
        objectName: key,
        oldValue: before ? this.buildAuditValue(before, policy) : undefined,
        newValue: {
          ...this.buildAuditValue(after, policy),
          auditDecision: this.buildAuditDecision(key, policy, context),
        },
      },
      context
    );
  }

  /**
   * GET /api/v1/platform/config/:key
   * Get platform config by key
   */
  @Get(':key')
  @RequirePlatformConfigPermission('read')
  @ApiOperation({ summary: 'Get platform config by key' })
  @ApiParam({
    name: 'key',
    description: 'Platform config key',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns a cataloged platform config. Secret or sensitive keys return redacted metadata only.',
    schema: {
      oneOf: [GLOBAL_CONFIG_SUCCESS_SCHEMA, GLOBAL_CONFIG_REDACTED_SUCCESS_SCHEMA],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to access platform config',
    schema: GLOBAL_CONFIG_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission to read platform config',
    schema: GLOBAL_CONFIG_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Requested platform config key was not found',
    schema: GLOBAL_CONFIG_NOT_FOUND_SCHEMA,
  })
  async get(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string) {
    const policy = this.assertKnownExposurePolicy(key);
    this.assertPolicyReadableByUser(user, policy);

    const config = await this.readConfigForPolicy(key, policy);

    if (!config) {
      throw new NotFoundException({
        code: 'CONFIG_NOT_FOUND',
        message: `Config '${key}' not found`,
      });
    }

    return success(config);
  }

  /**
   * PATCH /api/v1/platform/config/:key
   * Set platform config (AC tenant only)
   */
  @Patch(':key')
  @RequirePlatformConfigPermission('write')
  @ApiOperation({ summary: 'Set platform config (AC tenant only)' })
  @ApiParam({
    name: 'key',
    description: 'Platform config key',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated platform config',
    schema: GLOBAL_CONFIG_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Config payload validation failed',
    schema: GLOBAL_CONFIG_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update platform config',
    schema: GLOBAL_CONFIG_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission or is not in the AC tenant',
    schema: GLOBAL_CONFIG_FORBIDDEN_SCHEMA,
  })
  async set(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: SetConfigDto,
    @Req() req: Request
  ) {
    const policy = this.assertKnownExposurePolicy(key);
    this.checkAcTenantAccess(user);

    const before = await this.globalConfigService.getAuditSnapshot(key);
    const config = await this.globalConfigService.set(key, dto.value);
    const after = await this.globalConfigService.getAuditSnapshot(key);

    await this.recordPlatformConfigChange(
      key,
      policy,
      before,
      after,
      this.buildRequestContext(user, req)
    );

    if (policy.exposureClass === 'secret_or_sensitive_config') {
      return success({
        key: config.key,
        value: buildRedactedPlatformConfigValue(policy),
        description: config.description,
      });
    }

    return success(config);
  }

  /**
   * GET /api/v1/platform/config
   * List all platform configs (AC tenant only)
   */
  @Get()
  @RequirePlatformConfigPermission('admin')
  @ApiOperation({ summary: 'List all platform configs (AC tenant only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns all platform config entries',
    schema: GLOBAL_CONFIG_LIST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list platform config entries',
    schema: GLOBAL_CONFIG_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission or is not in the AC tenant',
    schema: GLOBAL_CONFIG_FORBIDDEN_SCHEMA,
  })
  async list(@CurrentUser() user: AuthenticatedUser) {
    // Only AC tenant can list all configs
    this.checkAcTenantAccess(user);

    const configs = await this.globalConfigService.getAll();

    return success(
      configs.flatMap((config) => {
        const policy = getPlatformConfigExposurePolicy(config.key);

        if (!policy) {
          return [];
        }

        if (policy.exposureClass === 'secret_or_sensitive_config') {
          return [
            {
              key: config.key,
              value: buildRedactedPlatformConfigValue(policy),
              description: config.description,
            },
          ];
        }

        return [config];
      })
    );
  }
}
