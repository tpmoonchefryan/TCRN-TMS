// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { QUEUE_NAMES } from '../../queue';
import {
  BatchAction,
  BatchOperationDto,
  BatchOperationResultDto,
} from '../dto/customer.dto';

// Maximum batch size for synchronous operations
const MAX_SYNC_BATCH_SIZE = 50;
// Maximum batch size for async operations
const MAX_ASYNC_BATCH_SIZE = 5000;

@Injectable()
export class BatchOperationService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue(QUEUE_NAMES.IMPORT) private readonly batchQueue: Queue,
  ) {}

  /**
   * Execute batch operation
   * For small batches (<=50), execute synchronously
   * For large batches (>50), queue for async processing
   */
  async executeBatch(
    talentId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<BatchOperationResultDto | { jobId: string; message: string }> {
    const { customerIds, action } = dto;

    // Validate batch size
    if (customerIds.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No customers specified for batch operation',
      });
    }

    if (customerIds.length > MAX_ASYNC_BATCH_SIZE) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: `Batch size exceeds maximum of ${MAX_ASYNC_BATCH_SIZE}`,
      });
    }

    // For small batches, execute synchronously
    if (customerIds.length <= MAX_SYNC_BATCH_SIZE) {
      return this.executeSyncBatch(talentId, dto, context);
    }

    // For large batches, queue for async processing
    return this.queueAsyncBatch(talentId, dto, context);
  }

  /**
   * Execute batch operation synchronously
   */
  private async executeSyncBatch(
    talentId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<BatchOperationResultDto> {
    const { customerIds, action } = dto;
    const result: BatchOperationResultDto = {
      total: customerIds.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    const prisma = this.databaseService.getPrisma();

    // Get tenant schema from context
    const tenantSchema = context.tenantSchema || 'public';

    for (const customerId of customerIds) {
      try {
        switch (action) {
          case BatchAction.DEACTIVATE:
            await this.deactivateCustomer(prisma, tenantSchema, customerId, dto.reason, context);
            break;

          case BatchAction.REACTIVATE:
            await this.reactivateCustomer(prisma, tenantSchema, customerId, context);
            break;

          case BatchAction.ADD_TAGS:
            if (!dto.tags?.length) {
              throw new BadRequestException('Tags required for add_tags action');
            }
            await this.addTags(prisma, tenantSchema, customerId, dto.tags, context);
            break;

          case BatchAction.REMOVE_TAGS:
            if (!dto.tags?.length) {
              throw new BadRequestException('Tags required for remove_tags action');
            }
            await this.removeTags(prisma, tenantSchema, customerId, dto.tags, context);
            break;

          case BatchAction.UPDATE_MEMBERSHIP:
            await this.updateMembership(prisma, tenantSchema, customerId, dto, context);
            break;

          default:
            throw new BadRequestException(`Unknown action: ${action}`);
        }
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          customerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Queue batch operation for async processing
   */
  private async queueAsyncBatch(
    talentId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<{ jobId: string; message: string }> {
    const job = await this.batchQueue.add('batch-operation', {
      talentId,
      tenantSchema: context.tenantSchema,
      action: dto.action,
      customerIds: dto.customerIds,
      tags: dto.tags,
      membershipClassCode: dto.membershipClassCode,
      membershipTypeCode: dto.membershipTypeCode,
      membershipLevelCode: dto.membershipLevelCode,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      reason: dto.reason,
      userId: context.userId,
    });

    return {
      jobId: job.id || 'unknown',
      message: `Batch operation queued for ${dto.customerIds.length} customers. Check job status for progress.`,
    };
  }

  /**
   * Deactivate customer
   */
  private async deactivateCustomer(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    customerId: string,
    reason: string | undefined,
    context: RequestContext,
  ): Promise<void> {
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".customer_profile
      SET is_active = false,
          updated_at = NOW(),
          last_modified_by = $2::uuid
      WHERE id = $1::uuid
    `, customerId, context.userId);
  }

  /**
   * Reactivate customer
   */
  private async reactivateCustomer(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    customerId: string,
    context: RequestContext,
  ): Promise<void> {
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".customer_profile
      SET is_active = true,
          updated_at = NOW(),
          last_modified_by = $2::uuid
      WHERE id = $1::uuid
    `, customerId, context.userId);
  }

  /**
   * Add tags to customer
   */
  private async addTags(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    customerId: string,
    tags: string[],
    context: RequestContext,
  ): Promise<void> {
    // Get current tags
    const result = await prisma.$queryRawUnsafe<Array<{ tags: string[] }>>(`
      SELECT tags FROM "${tenantSchema}".customer_profile WHERE id = $1::uuid
    `, customerId);

    if (!result.length) {
      throw new NotFoundException('Customer not found');
    }

    const currentTags = result[0].tags || [];
    const newTags = [...new Set([...currentTags, ...tags])];

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".customer_profile
      SET tags = $2::text[],
          updated_at = NOW(),
          last_modified_by = $3::uuid
      WHERE id = $1::uuid
    `, customerId, newTags, context.userId);
  }

  /**
   * Remove tags from customer
   */
  private async removeTags(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    customerId: string,
    tags: string[],
    context: RequestContext,
  ): Promise<void> {
    // Get current tags
    const result = await prisma.$queryRawUnsafe<Array<{ tags: string[] }>>(`
      SELECT tags FROM "${tenantSchema}".customer_profile WHERE id = $1::uuid
    `, customerId);

    if (!result.length) {
      throw new NotFoundException('Customer not found');
    }

    const currentTags = result[0].tags || [];
    const newTags = currentTags.filter((t) => !tags.includes(t));

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".customer_profile
      SET tags = $2::text[],
          updated_at = NOW(),
          last_modified_by = $3::uuid
      WHERE id = $1::uuid
    `, customerId, newTags, context.userId);
  }

  /**
   * Update membership
   */
  private async updateMembership(
    prisma: ReturnType<DatabaseService['getPrisma']>,
    tenantSchema: string,
    customerId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<void> {
    // Find active membership
    const membership = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".membership_record
      WHERE customer_profile_id = $1::uuid
        AND status = 'active'
      LIMIT 1
    `, customerId);

    if (!membership.length) {
      // Create new membership if none exists
      if (!dto.membershipClassCode) {
        throw new BadRequestException('Membership class code required for new membership');
      }

      // Lookup class, type, level
      const membershipClass = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".membership_class WHERE code = $1
      `, dto.membershipClassCode);

      if (!membershipClass.length) {
        throw new NotFoundException('Membership class not found');
      }

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${tenantSchema}".membership_record (
          id, customer_profile_id, membership_class_id, status,
          valid_from, valid_to, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::uuid, 'active',
          COALESCE($3::timestamptz, NOW()), $4::timestamptz, NOW(), NOW()
        )
      `, customerId, membershipClass[0].id, dto.validFrom, dto.validTo);
    } else {
      // Update existing membership
      const updates: string[] = [];
      const params: unknown[] = [membership[0].id];
      let paramIndex = 2;

      if (dto.validFrom) {
        updates.push(`valid_from = $${paramIndex}::timestamptz`);
        params.push(dto.validFrom);
        paramIndex++;
      }

      if (dto.validTo) {
        updates.push(`valid_to = $${paramIndex}::timestamptz`);
        params.push(dto.validTo);
        paramIndex++;
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        await prisma.$executeRawUnsafe(`
          UPDATE "${tenantSchema}".membership_record
          SET ${updates.join(', ')}
          WHERE id = $1::uuid
        `, ...params);
      }
    }
  }
}
