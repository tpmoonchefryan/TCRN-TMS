// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import {
  type ChangeAction,
  type ChangeLogDiff,
  type CreateChangeLogDto,
  type RequestContext,
} from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { LogMaskingService } from './log-masking.service';

/**
 * Change Log Service
 * Handles synchronous change log writes within transactions
 */
@Injectable()
export class ChangeLogService {
  private readonly logger = new Logger(ChangeLogService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly maskingService: LogMaskingService,
  ) {}

  /**
   * Create change log entry (synchronous, multi-tenant aware)
   */
  async create(
    tx: Prisma.TransactionClient,
    data: CreateChangeLogDto,
    context: RequestContext,
  ): Promise<void> {
    try {
      // 1. Calculate diff
      const diff = this.calculateDiff(data.oldValue ?? null, data.newValue);

      // 2. Apply masking
      const maskedDiff = this.maskingService.maskChangeLogDiff(
        data.objectType,
        diff,
      );

      // 3. Write to database using raw SQL for multi-tenancy support
      const schema = context.tenantSchema;
      if (schema) {
        // Use raw SQL to write to the correct tenant schema
        await tx.$executeRawUnsafe(`
          INSERT INTO "${schema}".change_log (
            id, occurred_at, operator_id, operator_name, action,
            object_type, object_id, object_name, diff,
            ip_address, user_agent, request_id
          ) VALUES (
            gen_random_uuid(), NOW(), $1::uuid, $2, $3,
            $4, $5::uuid, $6, $7::jsonb,
            $8::inet, $9, $10
          )
        `,
          context.userId ?? null,
          context.userName ?? null,
          data.action,
          data.objectType,
          data.objectId,
          data.objectName ?? null,
          JSON.stringify(maskedDiff),
          context.ipAddress || null,
          context.userAgent ?? null,
          context.requestId ?? null,
        );
      } else {
        // Fallback to Prisma ORM for non-tenant contexts
        await tx.changeLog.create({
          data: {
            occurredAt: new Date(),
            operatorId: context.userId ?? null,
            operatorName: context.userName ?? null,
            action: data.action,
            objectType: data.objectType,
            objectId: data.objectId,
            objectName: data.objectName ?? null,
            diff: maskedDiff as Prisma.InputJsonValue,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null,
            requestId: context.requestId ?? null,
          },
        });
      }
    } catch (error) {
      // Log error but don't throw - change log failure shouldn't block business operations
      this.logger.error(
        `Failed to create change log: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Create change log entry using default Prisma client (non-transactional)
   */
  async createDirect(
    data: CreateChangeLogDto,
    context: RequestContext,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await this.create(prisma as unknown as Prisma.TransactionClient, data, context);
  }

  /**
   * Calculate object diff
   */
  private calculateDiff(
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown>,
  ): ChangeLogDiff {
    const diff: ChangeLogDiff = {};

    if (!oldValue) {
      // Create operation - all fields are new
      for (const [key, value] of Object.entries(newValue)) {
        if (!this.isSystemField(key)) {
          diff[key] = { old: null, new: value };
        }
      }
      return diff;
    }

    // Update operation - only record changed fields
    const allKeys = new Set([
      ...Object.keys(oldValue),
      ...Object.keys(newValue),
    ]);

    for (const key of allKeys) {
      if (this.isSystemField(key)) continue;

      const oldVal = oldValue[key];
      const newVal = newValue[key];

      if (!this.isEqual(oldVal, newVal)) {
        diff[key] = { old: oldVal, new: newVal };
      }
    }

    return diff;
  }

  /**
   * System fields that should not be logged
   */
  private isSystemField(field: string): boolean {
    return [
      'id',
      'created_at',
      'createdAt',
      'updated_at',
      'updatedAt',
      'created_by',
      'createdBy',
      'updated_by',
      'updatedBy',
      'version',
      'password_hash',
      'passwordHash',
      'totp_secret',
      'totpSecret',
    ].includes(field);
  }

  /**
   * Deep compare two values
   */
  private isEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}

/**
 * Change Log Query Service
 * Handles read operations for change logs with multi-tenant support
 */
@Injectable()
export class ChangeLogQueryService {
  private readonly logger = new Logger(ChangeLogQueryService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Find change logs with filters (multi-tenant)
   */
  async findMany(
    query: {
      objectType?: string;
      objectId?: string;
      operatorId?: string;
      action?: ChangeAction;
      startDate?: string;
      endDate?: string;
      requestId?: string;
      page?: number;
      pageSize?: number;
    },
    tenantSchema: string,
  ) {
    const prisma = this.databaseService.getPrisma();
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions (use cl. prefix for table alias)
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.objectType) {
      conditions.push(`cl.object_type = $${paramIndex++}`);
      params.push(query.objectType);
    }
    if (query.objectId) {
      conditions.push(`cl.object_id = $${paramIndex++}::uuid`);
      params.push(query.objectId);
    }
    if (query.operatorId) {
      conditions.push(`cl.operator_id = $${paramIndex++}::uuid`);
      params.push(query.operatorId);
    }
    if (query.action) {
      conditions.push(`cl.action = $${paramIndex++}`);
      params.push(query.action);
    }
    if (query.requestId) {
      conditions.push(`cl.request_id = $${paramIndex++}`);
      params.push(query.requestId);
    }
    if (query.startDate) {
      conditions.push(`cl.occurred_at >= $${paramIndex++}::timestamptz`);
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push(`cl.occurred_at <= $${paramIndex++}::timestamptz`);
      params.push(query.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      // Query items with user info join
      const items = await prisma.$queryRawUnsafe<ChangeLogRow[]>(
        `SELECT 
           cl.id, cl.occurred_at, cl.operator_id, 
           COALESCE(cl.operator_name, su.display_name, su.username) as operator_name,
           cl.action, cl.object_type, cl.object_id, cl.object_name, 
           cl.diff, cl.ip_address, cl.user_agent, cl.request_id
         FROM "${tenantSchema}".change_log cl
         LEFT JOIN "${tenantSchema}".system_user su ON cl.operator_id = su.id
         ${whereClause}
         ORDER BY cl.occurred_at DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        ...params,
      );

      // Query total count
      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "${tenantSchema}".change_log cl ${whereClause}`,
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
      this.logger.error(`Failed to query change logs: ${error instanceof Error ? error.message : String(error)}`);
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
   * Find change logs by object
   */
  async findByObject(
    objectType: string,
    objectId: string,
    query: { page?: number; pageSize?: number },
    tenantSchema: string,
  ) {
    return this.findMany(
      {
        objectType,
        objectId,
        ...query,
      },
      tenantSchema,
    );
  }

  /**
   * Find change logs by operator
   */
  async findByOperator(
    operatorId: string,
    query: { page?: number; pageSize?: number },
    tenantSchema: string,
  ) {
    return this.findMany(
      {
        operatorId,
        ...query,
      },
      tenantSchema,
    );
  }

  /**
   * Format database entry to API response
   */
  private formatEntry(entry: ChangeLogRow) {
    return {
      id: entry.id,
      occurredAt: entry.occurred_at,
      operatorId: entry.operator_id,
      operatorName: entry.operator_name,
      action: entry.action as ChangeAction,
      objectType: entry.object_type,
      objectId: entry.object_id,
      objectName: entry.object_name,
      diff: entry.diff as ChangeLogDiff | null,
      ipAddress: entry.ip_address,
      userAgent: entry.user_agent,
      requestId: entry.request_id,
    };
  }
}

/**
 * Raw query result type for change_log table
 */
interface ChangeLogRow {
  id: string;
  occurred_at: Date;
  operator_id: string | null;
  operator_name: string | null;
  action: string;
  object_type: string;
  object_id: string;
  object_name: string | null;
  diff: unknown;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
}
