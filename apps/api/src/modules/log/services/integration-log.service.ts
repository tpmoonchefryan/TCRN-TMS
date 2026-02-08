// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { IntegrationDirection, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { LogMaskingService } from './log-masking.service';

export interface InboundLogDto {
  consumerId?: string;
  consumerCode?: string;
  endpoint: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: Record<string, unknown>;
  responseStatus: number;
  responseBody?: Record<string, unknown>;
  latencyMs: number;
  errorMessage?: string;
  traceId?: string;
}

export interface OutboundLogDto {
  consumerId?: string;
  consumerCode?: string;
  externalSystem?: string;
  endpoint: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: Record<string, unknown> | unknown;
  latencyMs?: number;
  errorMessage?: string;
  success?: boolean;
  traceId?: string;
}

/**
 * Integration Log Service
 * Records API communications with external systems
 * In production, this would use BullMQ for async processing
 */
@Injectable()
export class IntegrationLogService {
  private readonly logger = new Logger(IntegrationLogService.name);
  private readonly MAX_BODY_SIZE = 10 * 1024; // 10KB

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly maskingService: LogMaskingService,
  ) {}

  /**
   * Log inbound request (from external system) - multi-tenant aware
   */
  async logInbound(data: InboundLogDto, context?: RequestContext): Promise<void> {
    try {
      const prisma = this.databaseService.getPrisma();
      const schema = context?.tenantSchema || 'public';

      const maskedRequestHeaders = this.maskHeaders(data.requestHeaders);
      const maskedRequestBody = this.truncateBody(
        this.maskingService.maskIntegrationLogBody(data.requestBody ?? null),
      );
      const maskedResponseBody = this.truncateBody(
        this.maskingService.maskIntegrationLogBody(
          (data.responseBody && typeof data.responseBody === 'object' ? data.responseBody : null) as Record<string, unknown> | null
        ),
      );

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schema}".integration_log (
          id, occurred_at, consumer_id, consumer_code, direction, endpoint, method,
          request_headers, request_body, response_status, response_body, latency_ms, error_message, trace_id
        ) VALUES (
          gen_random_uuid(), NOW(), $1::uuid, $2, $3, $4, $5,
          $6::jsonb, $7::jsonb, $8, $9::jsonb, $10, $11, $12
        )
      `,
        data.consumerId ?? null,
        data.consumerCode ?? null,
        IntegrationDirection.INBOUND,
        data.endpoint,
        data.method,
        maskedRequestHeaders ? JSON.stringify(maskedRequestHeaders) : null,
        maskedRequestBody ? JSON.stringify(maskedRequestBody) : null,
        data.responseStatus,
        maskedResponseBody ? JSON.stringify(maskedResponseBody) : null,
        data.latencyMs,
        data.errorMessage ?? null,
        data.traceId ?? null,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log inbound request: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Log outbound request (to external system) - multi-tenant aware
   */
  async logOutbound(data: OutboundLogDto, context?: RequestContext): Promise<void> {
    try {
      const prisma = this.databaseService.getPrisma();
      const schema = context?.tenantSchema || 'public';

      const maskedRequestHeaders = this.maskHeaders(data.requestHeaders);
      const maskedRequestBody = this.truncateBody(
        this.maskingService.maskIntegrationLogBody(data.requestBody ?? null),
      );
      const maskedResponseBody = this.truncateBody(
        this.maskingService.maskIntegrationLogBody(
          (data.responseBody && typeof data.responseBody === 'object' ? data.responseBody : null) as Record<string, unknown> | null
        ),
      );

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schema}".integration_log (
          id, occurred_at, consumer_id, consumer_code, direction, endpoint, method,
          request_headers, request_body, response_status, response_body, latency_ms, error_message, trace_id
        ) VALUES (
          gen_random_uuid(), NOW(), $1::uuid, $2, $3, $4, $5,
          $6::jsonb, $7::jsonb, $8, $9::jsonb, $10, $11, $12
        )
      `,
        data.consumerId ?? null,
        data.consumerCode ?? null,
        IntegrationDirection.OUTBOUND,
        data.endpoint,
        data.method,
        maskedRequestHeaders ? JSON.stringify(maskedRequestHeaders) : null,
        maskedRequestBody ? JSON.stringify(maskedRequestBody) : null,
        data.responseStatus ?? null,
        maskedResponseBody ? JSON.stringify(maskedResponseBody) : null,
        data.latencyMs ?? null,
        data.errorMessage ?? null,
        data.traceId ?? null,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log outbound request: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Mask sensitive headers
   */
  private maskHeaders(
    headers: Record<string, string> | null | undefined,
  ): Record<string, string> | null {
    if (!headers) return null;

    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'cookie',
      'set-cookie',
      'x-auth-token',
    ];

    const masked = { ...headers };

    for (const key of Object.keys(masked)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        masked[key] = '***';
      }
    }

    return masked;
  }

  /**
   * Truncate large request/response bodies
   */
  private truncateBody(body: unknown): unknown {
    if (!body) return null;

    const jsonStr = JSON.stringify(body);

    if (jsonStr.length > this.MAX_BODY_SIZE) {
      return {
        _truncated: true,
        _original_size: jsonStr.length,
        _preview: jsonStr.substring(0, 1000) + '...',
      };
    }

    return body;
  }
}

/**
 * Integration Log Query Service
 * Handles read operations with multi-tenant support
 */
@Injectable()
export class IntegrationLogQueryService {
  private readonly queryLogger = new Logger(IntegrationLogQueryService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Find integration logs with filters (multi-tenant)
   */
  async findMany(
    query: {
      consumerId?: string;
      consumerCode?: string;
      direction?: IntegrationDirection;
      responseStatus?: number;
      traceId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    },
    tenantSchema: string,
  ) {
    const prisma = this.databaseService.getPrisma();
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.consumerId) {
      conditions.push(`consumer_id = $${paramIndex++}::uuid`);
      params.push(query.consumerId);
    }
    if (query.consumerCode) {
      conditions.push(`consumer_code = $${paramIndex++}`);
      params.push(query.consumerCode);
    }
    if (query.direction) {
      conditions.push(`direction = $${paramIndex++}`);
      params.push(query.direction);
    }
    if (query.responseStatus) {
      conditions.push(`response_status = $${paramIndex++}`);
      params.push(query.responseStatus);
    }
    if (query.traceId) {
      conditions.push(`trace_id = $${paramIndex++}`);
      params.push(query.traceId);
    }
    if (query.startDate) {
      conditions.push(`occurred_at >= $${paramIndex++}::timestamptz`);
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push(`occurred_at <= $${paramIndex++}::timestamptz`);
      params.push(query.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const items = await prisma.$queryRawUnsafe<IntegrationLogRow[]>(
        `SELECT id, occurred_at, consumer_id, consumer_code, direction, endpoint, method, request_headers, request_body, response_status, response_body, latency_ms, error_message, trace_id
         FROM "${tenantSchema}".integration_log
         ${whereClause}
         ORDER BY occurred_at DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        ...params,
      );

      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${tenantSchema}".integration_log ${whereClause}`,
        ...params,
      );
      const total = Number(countResult[0]?.count || 0);

      return {
        items: items.map((item) => this.formatEntry(item)),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.queryLogger.error(`Failed to query integration logs: ${error instanceof Error ? error.message : String(error)}`);
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * Find by trace ID (multi-tenant)
   */
  async findByTraceId(traceId: string, tenantSchema: string) {
    const prisma = this.databaseService.getPrisma();
    try {
      const items = await prisma.$queryRawUnsafe<IntegrationLogRow[]>(
        `SELECT id, occurred_at, consumer_id, consumer_code, direction, endpoint, method, request_headers, request_body, response_status, response_body, latency_ms, error_message, trace_id
         FROM "${tenantSchema}".integration_log
         WHERE trace_id = $1
         ORDER BY occurred_at ASC`,
        traceId,
      );
      return items.map((item) => this.formatEntry(item));
    } catch (error) {
      this.queryLogger.error(`Failed to find by trace ID: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Find failed requests (multi-tenant)
   */
  async findFailed(query: { page?: number; pageSize?: number }, tenantSchema: string) {
    const prisma = this.databaseService.getPrisma();
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    try {
      const items = await prisma.$queryRawUnsafe<IntegrationLogRow[]>(
        `SELECT id, occurred_at, consumer_id, consumer_code, direction, endpoint, method, request_headers, request_body, response_status, response_body, latency_ms, error_message, trace_id
         FROM "${tenantSchema}".integration_log
         WHERE response_status >= 400 OR error_message IS NOT NULL
         ORDER BY occurred_at DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
      );

      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${tenantSchema}".integration_log WHERE response_status >= 400 OR error_message IS NOT NULL`,
      );
      const total = Number(countResult[0]?.count || 0);

      return {
        items: items.map((item) => this.formatEntry(item)),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.queryLogger.error(`Failed to find failed requests: ${error instanceof Error ? error.message : String(error)}`);
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * Format database entry to API response
   */
  private formatEntry(entry: IntegrationLogRow) {
    return {
      id: entry.id,
      occurredAt: entry.occurred_at,
      consumerId: entry.consumer_id,
      consumerCode: entry.consumer_code,
      direction: entry.direction as IntegrationDirection,
      endpoint: entry.endpoint,
      method: entry.method,
      requestHeaders: entry.request_headers,
      requestBody: entry.request_body,
      responseStatus: entry.response_status,
      responseBody: entry.response_body,
      latencyMs: entry.latency_ms,
      errorMessage: entry.error_message,
      traceId: entry.trace_id,
    };
  }
}

/**
 * Raw query result type for integration_log table
 */
interface IntegrationLogRow {
  id: string;
  occurred_at: Date;
  consumer_id: string | null;
  consumer_code: string | null;
  direction: string;
  endpoint: string;
  method: string;
  request_headers: unknown;
  request_body: unknown;
  response_status: number | null;
  response_body: unknown;
  latency_ms: number | null;
  error_message: string | null;
  trace_id: string | null;
}
