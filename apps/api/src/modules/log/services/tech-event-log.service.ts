// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import {
  LogSeverity,
  type RequestContext,
  TechEventScope,
  TechEventType,
} from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { LogMaskingService } from './log-masking.service';

export interface TechEventLogDto {
  severity: LogSeverity;
  eventType: TechEventType | string;
  scope?: TechEventScope | string;
  traceId?: string;
  spanId?: string;
  source?: string;
  message?: string;
  payload?: Record<string, unknown>;
  errorCode?: string;
  errorStack?: string;
}

/**
 * Technical Event Log Service
 * Handles async logging of system events
 * In production, this would use BullMQ for async processing
 */
@Injectable()
export class TechEventLogService {
  private readonly logger = new Logger(TechEventLogService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly maskingService: LogMaskingService,
  ) {}

  /**
   * Log a technical event (async write) - multi-tenant aware
   * In production, this should be pushed to a queue
   * @param data - Event log data
   * @param context - Optional request context for tenant schema (if not provided, logs to public schema)
   */
  async log(data: TechEventLogDto, context?: RequestContext): Promise<void> {
    try {
      // 1. Apply masking to payload
      const maskedPayload = data.payload
        ? this.maskingService.maskTechLogPayload(data.payload)
        : null;

      // 2. Write to database using raw SQL for multi-tenant support
      const prisma = this.databaseService.getPrisma();
      const schema = context?.tenantSchema || 'public';
      const scope = data.scope || TechEventScope.GENERAL;
      const errorStack = process.env.NODE_ENV === 'development' ? data.errorStack ?? null : null;

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schema}".technical_event_log (
          id, occurred_at, severity, event_type, scope, trace_id, span_id, source, message, payload_json, error_code, error_stack
        ) VALUES (
          gen_random_uuid(), NOW(), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10
        )
      `,
        data.severity,
        data.eventType,
        scope,
        data.traceId ?? null,
        data.spanId ?? null,
        data.source ?? null,
        data.message ?? null,
        maskedPayload ? JSON.stringify(maskedPayload) : null,
        data.errorCode ?? null,
        errorStack,
      );
    } catch (error) {
      // Log error but don't throw
      this.logger.error(
        `Failed to log tech event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // Convenience methods

  /**
   * Log info event
   */
  async info(
    eventType: TechEventType | string,
    message: string,
    payload?: Record<string, unknown>,
    context?: RequestContext,
  ): Promise<void> {
    await this.log({
      severity: LogSeverity.INFO,
      eventType,
      message,
      payload,
    }, context);
  }

  /**
   * Log warning event
   */
  async warn(
    eventType: TechEventType | string,
    message: string,
    payload?: Record<string, unknown>,
    context?: RequestContext,
  ): Promise<void> {
    await this.log({
      severity: LogSeverity.WARN,
      eventType,
      message,
      payload,
    }, context);
  }

  /**
   * Log error event
   */
  async error(
    eventType: TechEventType | string,
    message: string,
    error?: Error,
    payload?: Record<string, unknown>,
    context?: RequestContext,
  ): Promise<void> {
    await this.log({
      severity: LogSeverity.ERROR,
      eventType,
      message,
      payload,
      errorCode: (error as Error & { code?: string })?.code,
      errorStack: error?.stack,
    }, context);
  }

  /**
   * Log security event
   */
  async security(
    eventType: TechEventType | string,
    message: string,
    payload?: Record<string, unknown>,
    context?: RequestContext,
  ): Promise<void> {
    await this.log({
      severity: LogSeverity.INFO,
      eventType,
      scope: TechEventScope.SECURITY,
      message,
      payload,
    }, context);
  }

  /**
   * Log PII access event
   */
  async piiAccess(
    eventType: TechEventType | string,
    message: string,
    payload?: Record<string, unknown>,
    context?: RequestContext,
  ): Promise<void> {
    await this.log({
      severity: LogSeverity.INFO,
      eventType,
      scope: TechEventScope.PII,
      message,
      payload,
    }, context);
  }

  /**
   * Log import event
   */
  async import(
    eventType: TechEventType | string,
    message: string,
    payload?: Record<string, unknown>,
    context?: RequestContext,
  ): Promise<void> {
    await this.log({
      severity: LogSeverity.INFO,
      eventType,
      scope: TechEventScope.IMPORT,
      message,
      payload,
    }, context);
  }

  /**
   * Log permission event
   */
  async permission(
    eventType: TechEventType | string,
    message: string,
    payload?: Record<string, unknown>,
    context?: RequestContext,
  ): Promise<void> {
    await this.log({
      severity: LogSeverity.INFO,
      eventType,
      scope: TechEventScope.PERMISSION,
      message,
      payload,
    }, context);
  }
}

/**
 * Tech Event Log Query Service
 * Handles read operations with multi-tenant support
 */
@Injectable()
export class TechEventLogQueryService {
  private readonly queryLogger = new Logger(TechEventLogQueryService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Find tech event logs with filters (multi-tenant)
   */
  async findMany(
    query: {
      severity?: LogSeverity;
      eventType?: string;
      scope?: string;
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

    if (query.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(query.severity);
    }
    if (query.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(query.eventType);
    }
    if (query.scope) {
      conditions.push(`scope = $${paramIndex++}`);
      params.push(query.scope);
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
      const items = await prisma.$queryRawUnsafe<TechEventLogRow[]>(
        `SELECT id, occurred_at, severity, event_type, scope, trace_id, span_id, source, message, payload_json, error_code, error_stack
         FROM "${tenantSchema}".technical_event_log
         ${whereClause}
         ORDER BY occurred_at DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        ...params,
      );

      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${tenantSchema}".technical_event_log ${whereClause}`,
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
      this.queryLogger.error(`Failed to query tech event logs: ${error instanceof Error ? error.message : String(error)}`);
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
      const items = await prisma.$queryRawUnsafe<TechEventLogRow[]>(
        `SELECT id, occurred_at, severity, event_type, scope, trace_id, span_id, source, message, payload_json, error_code, error_stack
         FROM "${tenantSchema}".technical_event_log
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
   * Format database entry to API response
   */
  private formatEntry(entry: TechEventLogRow) {
    return {
      id: entry.id,
      occurredAt: entry.occurred_at,
      severity: entry.severity as LogSeverity,
      eventType: entry.event_type,
      scope: entry.scope,
      traceId: entry.trace_id,
      spanId: entry.span_id,
      source: entry.source,
      message: entry.message,
      payloadJson: entry.payload_json,
      errorCode: entry.error_code,
      errorStack: entry.error_stack,
    };
  }
}

/**
 * Raw query result type for technical_event_log table
 */
interface TechEventLogRow {
  id: string;
  occurred_at: Date;
  severity: string;
  event_type: string;
  scope: string;
  trace_id: string | null;
  span_id: string | null;
  source: string | null;
  message: string | null;
  payload_json: unknown;
  error_code: string | null;
  error_stack: string | null;
}
