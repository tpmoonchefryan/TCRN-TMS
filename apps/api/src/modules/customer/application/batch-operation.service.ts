// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import {
  assertBatchTagsProvided,
  assertCustomerBatchSize,
  assertMembershipClassCodeForNewMembership,
  buildQueuedBatchOperationPayload,
  buildQueuedBatchOperationResponse,
  createBatchOperationResult,
  hasMembershipValidityUpdates,
  mergeCustomerTags,
  recordBatchOperationError,
  recordBatchOperationSuccess,
  removeCustomerTags,
  shouldQueueBatchOperation,
} from '../domain/batch-operation.policy';
import {
  BatchAction,
  type BatchOperationDto,
  type BatchOperationResultDto,
} from '../dto/customer.dto';
import { BatchOperationQueueGateway } from '../infrastructure/batch-operation.queue';
import { BatchOperationRepository } from '../infrastructure/batch-operation.repository';

@Injectable()
export class BatchOperationApplicationService {
  constructor(
    private readonly batchOperationRepository: BatchOperationRepository,
    private readonly batchOperationQueueGateway: BatchOperationQueueGateway,
  ) {}

  async executeBatch(
    talentId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<BatchOperationResultDto | { jobId: string; message: string }> {
    assertCustomerBatchSize(dto.customerIds);

    if (shouldQueueBatchOperation(dto.customerIds)) {
      const jobId = await this.batchOperationQueueGateway.enqueue(
        buildQueuedBatchOperationPayload(talentId, dto, context),
      );

      return buildQueuedBatchOperationResponse(dto.customerIds.length, jobId);
    }

    return this.executeSyncBatch(dto, context);
  }

  private async executeSyncBatch(
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<BatchOperationResultDto> {
    const tenantSchema = context.tenantSchema || 'public';
    let result = createBatchOperationResult(dto.customerIds.length);

    for (const customerId of dto.customerIds) {
      try {
        await this.executeSingleOperation(tenantSchema, customerId, dto, context);
        result = recordBatchOperationSuccess(result);
      } catch (error) {
        result = recordBatchOperationError(result, customerId, error);
      }
    }

    return result;
  }

  private async executeSingleOperation(
    tenantSchema: string,
    customerId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<void> {
    switch (dto.action) {
      case BatchAction.DEACTIVATE:
        return this.batchOperationRepository.deactivateCustomer(
          tenantSchema,
          customerId,
          context.userId,
        );

      case BatchAction.REACTIVATE:
        return this.batchOperationRepository.reactivateCustomer(
          tenantSchema,
          customerId,
          context.userId,
        );

      case BatchAction.ADD_TAGS:
        return this.addTags(tenantSchema, customerId, dto, context);

      case BatchAction.REMOVE_TAGS:
        return this.removeTags(tenantSchema, customerId, dto, context);

      case BatchAction.UPDATE_MEMBERSHIP:
        return this.updateMembership(tenantSchema, customerId, dto);

      default:
        throw new BadRequestException(`Unknown action: ${dto.action}`);
    }
  }

  private async addTags(
    tenantSchema: string,
    customerId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<void> {
    const tags = assertBatchTagsProvided(BatchAction.ADD_TAGS, dto.tags);
    const currentTags = await this.getCustomerTagsOrThrow(tenantSchema, customerId);

    await this.batchOperationRepository.updateCustomerTags(
      tenantSchema,
      customerId,
      mergeCustomerTags(currentTags, tags),
      context.userId,
    );
  }

  private async removeTags(
    tenantSchema: string,
    customerId: string,
    dto: BatchOperationDto,
    context: RequestContext,
  ): Promise<void> {
    const tags = assertBatchTagsProvided(BatchAction.REMOVE_TAGS, dto.tags);
    const currentTags = await this.getCustomerTagsOrThrow(tenantSchema, customerId);

    await this.batchOperationRepository.updateCustomerTags(
      tenantSchema,
      customerId,
      removeCustomerTags(currentTags, tags),
      context.userId,
    );
  }

  private async updateMembership(
    tenantSchema: string,
    customerId: string,
    dto: BatchOperationDto,
  ): Promise<void> {
    const membershipId = await this.batchOperationRepository.findActiveMembershipId(
      tenantSchema,
      customerId,
    );

    if (!membershipId) {
      const membershipClassCode = assertMembershipClassCodeForNewMembership(
        dto.membershipClassCode,
      );
      const membershipClassId =
        await this.batchOperationRepository.findMembershipClassIdByCode(
          tenantSchema,
          membershipClassCode,
        );

      if (!membershipClassId) {
        throw new NotFoundException('Membership class not found');
      }

      await this.batchOperationRepository.createMembershipRecord(
        tenantSchema,
        customerId,
        membershipClassId,
        dto.validFrom,
        dto.validTo,
      );
      return;
    }

    if (!hasMembershipValidityUpdates(dto)) {
      return;
    }

    await this.batchOperationRepository.updateMembershipRecordValidity(
      tenantSchema,
      membershipId,
      {
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      },
    );
  }

  private async getCustomerTagsOrThrow(
    tenantSchema: string,
    customerId: string,
  ): Promise<string[]> {
    const tags = await this.batchOperationRepository.getCustomerTags(
      tenantSchema,
      customerId,
    );

    if (tags === null) {
      throw new NotFoundException('Customer not found');
    }

    return tags;
  }
}
