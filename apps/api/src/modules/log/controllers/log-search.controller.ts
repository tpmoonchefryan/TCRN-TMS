// SPDX-License-Identifier: Apache-2.0
import { Controller, ForbiddenException, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ErrorCodes } from '@tcrn/shared';

import { CurrentUser, RequirePermissions, type AuthenticatedUser } from '../../../common/decorators';
import { isRawLogQuerySyntax } from '../domain/loki-query.policy';
import { buildCompatibleLogSearchQuery, LokiQueryService } from '../services';

const LOG_SEARCH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
          labels: {
            type: 'object',
            additionalProperties: { type: 'string' },
            example: {
              app: 'tcrn-tms',
              stream: 'integration_log',
              severity: 'info',
            },
          },
          data: {
            type: 'object',
            additionalProperties: true,
            example: {
              message: 'Webhook delivered',
              requestId: 'req_123',
            },
          },
        },
        required: ['timestamp', 'labels', 'data'],
      },
    },
    stats: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
    },
  },
  required: ['entries'],
  example: {
    entries: [
      {
        timestamp: '2026-04-13T09:30:00.000Z',
        labels: {
          app: 'tcrn-tms',
          stream: 'integration_log',
          severity: 'info',
        },
        data: {
          message: 'Webhook delivered',
          requestId: 'req_123',
        },
      },
    ],
    stats: {
      inspectedStreams: 1,
    },
  },
};

const LOG_SEARCH_UNAUTHORIZED_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'AUTH_UNAUTHORIZED' },
        message: { type: 'string', example: 'Authentication required' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code: 'AUTH_UNAUTHORIZED',
      message: 'Authentication required',
    },
  },
};

const LOG_SEARCH_FORBIDDEN_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: ErrorCodes.PERM_ACCESS_DENIED },
        message: { type: 'string', example: 'Access denied' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code: ErrorCodes.PERM_ACCESS_DENIED,
      message: 'Access denied',
    },
  },
};

@ApiTags('System - Logs')
@ApiBearerAuth()
@Controller('logs/search')
export class LogSearchController {
  constructor(private readonly lokiQueryService: LokiQueryService) {}

  @Get()
  @RequirePermissions({ resource: 'log.search', action: 'read' })
  @ApiOperation({ summary: 'Search logs across all streams' })
  @ApiQuery({ name: 'keyword', required: false, description: 'Search keyword' })
  @ApiQuery({ name: 'stream', required: false, description: 'Log stream filter' })
  @ApiQuery({ name: 'severity', required: false, description: 'Severity filter' })
  @ApiQuery({ name: 'start', required: false, description: 'Start time (ISO string)' })
  @ApiQuery({ name: 'end', required: false, description: 'End time (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results' })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Legacy plain-text keyword fallback. Raw LogQL selectors are denied.',
  })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    description: 'Relative time range (15m, 1h, 6h, 24h, 7d)',
  })
  @ApiQuery({
    name: 'app',
    required: false,
    description: 'Legacy application filter (kept for compatibility only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns matching log entries',
    schema: LOG_SEARCH_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to search logs',
    schema: LOG_SEARCH_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to search logs',
    schema: LOG_SEARCH_FORBIDDEN_SCHEMA,
  })
  async search(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Query('keyword') keyword?: string,
    @Query('stream') stream?: string,
    @Query('severity') severity?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
    @Query('query') query?: string,
    @Query('timeRange') timeRange?: string,
    @Query('app') app?: string
  ) {
    if (isRawLogQuerySyntax(query)) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Raw LogQL queries are not available through product log search',
      });
    }

    const tenantSchema = this.resolveTenantSchema(req, user);

    return this.lokiQueryService.query(
      buildCompatibleLogSearchQuery({
        tenantSchema,
        keyword,
        stream,
        severity,
        start,
        end,
        limit,
        query,
        timeRange,
        app,
      })
    );
  }

  @Get('change-logs')
  @RequirePermissions({ resource: 'log.change_log', action: 'read' })
  @ApiOperation({ summary: 'Search change logs in Loki' })
  @ApiResponse({
    status: 200,
    description: 'Returns matching change logs',
    schema: LOG_SEARCH_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to search change logs',
    schema: LOG_SEARCH_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to search change logs',
    schema: LOG_SEARCH_FORBIDDEN_SCHEMA,
  })
  async searchChangeLogs(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Query('objectType') objectType?: string,
    @Query('action') action?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string
  ) {
    return this.lokiQueryService.queryChangeLogs({
      tenantSchema: this.resolveTenantSchema(req, user),
      objectType,
      action,
      start,
      end,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('events')
  @RequirePermissions({ resource: 'log.tech_log', action: 'read' })
  @ApiOperation({ summary: 'Search tech events in Loki' })
  @ApiResponse({
    status: 200,
    description: 'Returns matching tech events',
    schema: LOG_SEARCH_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to search technical events',
    schema: LOG_SEARCH_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to search technical events',
    schema: LOG_SEARCH_FORBIDDEN_SCHEMA,
  })
  async searchTechEvents(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Query('severity') severity?: string,
    @Query('eventType') eventType?: string,
    @Query('scope') scope?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string
  ) {
    return this.lokiQueryService.queryTechEvents({
      tenantSchema: this.resolveTenantSchema(req, user),
      severity,
      eventType,
      scope,
      start,
      end,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('integrations')
  @RequirePermissions({ resource: 'log.integration_log', action: 'read' })
  @ApiOperation({ summary: 'Search integration logs in Loki' })
  @ApiResponse({
    status: 200,
    description: 'Returns matching integration logs',
    schema: LOG_SEARCH_RESPONSE_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to search integration logs',
    schema: LOG_SEARCH_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to search integration logs',
    schema: LOG_SEARCH_FORBIDDEN_SCHEMA,
  })
  async searchIntegrationLogs(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Query('direction') direction?: string,
    @Query('consumerCode') consumerCode?: string,
    @Query('status') status?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string
  ) {
    return this.lokiQueryService.queryIntegrationLogs({
      tenantSchema: this.resolveTenantSchema(req, user),
      direction,
      consumerCode,
      status,
      start,
      end,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  private resolveTenantSchema(req: Request, user: AuthenticatedUser | null): string {
    const tenantSchema = user?.tenantSchema ?? req.tenantContext?.schemaName;

    if (!tenantSchema || !/^[A-Za-z0-9_]+$/.test(tenantSchema)) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Tenant-scoped log search requires a valid tenant context',
      });
    }

    return tenantSchema;
  }
}
