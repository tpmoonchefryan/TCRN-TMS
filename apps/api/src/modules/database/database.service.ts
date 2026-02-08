// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { checkDatabaseConnection, prisma, type PrismaClient } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

/**
 * Database Service
 * Provides database operations with middleware support:
 * - Optimistic locking (PRD §10.1)
 * - Soft delete filtering
 * - Audit field population
 * - Multi-language field handling
 */
@Injectable()
export class DatabaseService {
  /**
   * Get Prisma client instance
   */
  getPrisma(): PrismaClient {
    return prisma;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    return checkDatabaseConnection();
  }

  /**
   * Check optimistic lock version before update (PRD §10.1)
   * @throws ConflictException if version mismatch
   */
  async checkVersion(
    tableName: string,
    schemaName: string,
    id: string,
    expectedVersion: number
  ): Promise<void> {
    const result = await prisma.$queryRawUnsafe<Array<{ version: number }>>(
      `SELECT version FROM "${schemaName}"."${tableName}" WHERE id = $1::uuid`,
      id
    );

    if (result.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Record not found',
      });
    }

    if (result[0].version !== expectedVersion) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user. Please refresh and try again.',
        details: {
          currentVersion: result[0].version,
          expectedVersion,
        },
      });
    }
  }

  /**
   * Increment version for optimistic locking
   */
  async incrementVersion(
    tableName: string,
    schemaName: string,
    id: string
  ): Promise<number> {
    const result = await prisma.$queryRawUnsafe<Array<{ version: number }>>(
      `UPDATE "${schemaName}"."${tableName}" 
       SET version = version + 1, updated_at = now() 
       WHERE id = $1::uuid 
       RETURNING version`,
      id
    );
    return result[0]?.version || 1;
  }

  /**
   * Soft delete a record (PRD §10.1)
   */
  async softDelete(
    tableName: string,
    schemaName: string,
    id: string,
    updatedBy: string
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schemaName}"."${tableName}" 
       SET is_active = false, updated_at = now(), updated_by = $2::uuid 
       WHERE id = $1::uuid`,
      id,
      updatedBy
    );
  }

  /**
   * Reactivate a soft-deleted record
   */
  async reactivate(
    tableName: string,
    schemaName: string,
    id: string,
    updatedBy: string
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schemaName}"."${tableName}" 
       SET is_active = true, updated_at = now(), updated_by = $2::uuid 
       WHERE id = $1::uuid`,
      id,
      updatedBy
    );
  }

  /**
   * Get localized name field based on language preference
   */
  getLocalizedField<T extends Record<string, unknown>>(
    entity: T,
    fieldPrefix: string,
    language: 'en' | 'zh' | 'ja' = 'en'
  ): string {
    const fieldName = `${fieldPrefix}${language.charAt(0).toUpperCase()}${language.slice(1)}` as keyof T;
    const fallbackField = `${fieldPrefix}En` as keyof T;
    
    return (entity[fieldName] as string) || (entity[fallbackField] as string) || '';
  }

  /**
   * Build where clause for active records only
   */
  buildActiveFilter(includeInactive: boolean = false): { isActive?: boolean } {
    return includeInactive ? {} : { isActive: true };
  }

  /**
   * Build pagination parameters
   */
  buildPagination(page: number = 1, pageSize: number = 20): { skip: number; take: number } {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    
    return {
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    };
  }

  /**
   * Calculate pagination metadata
   */
  calculatePaginationMeta(
    totalItems: number,
    page: number,
    pageSize: number
  ): {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  } {
    return {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  /**
   * Execute within a transaction
   */
  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return prisma.$transaction(async () => {
      return fn();
    });
  }

  /**
   * Get entity code validation regex (PRD §10.1)
   */
  getCodeRegex(): RegExp {
    return /^[A-Z0-9_]{3,32}$/;
  }

  /**
   * Validate entity code format
   */
  isValidCode(code: string): boolean {
    return this.getCodeRegex().test(code);
  }

  /**
   * Convert input to uppercase code format
   */
  toCode(input: string): string {
    return input.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  }
}
