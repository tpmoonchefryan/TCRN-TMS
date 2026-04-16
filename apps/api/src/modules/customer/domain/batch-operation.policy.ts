// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  BatchAction,
  type BatchOperationDto,
  type BatchOperationResultDto,
} from '../dto/customer.dto';

export const MAX_SYNC_BATCH_SIZE = 50;
export const MAX_ASYNC_BATCH_SIZE = 5000;
export const CUSTOMER_BATCH_QUEUE_JOB_NAME = 'batch-operation';

export interface BatchOperationQueuePayload {
  talentId: string;
  tenantSchema?: string;
  action: BatchAction;
  customerIds: string[];
  tags?: string[];
  membershipClassCode?: string;
  membershipTypeCode?: string;
  membershipLevelCode?: string;
  validFrom?: string;
  validTo?: string;
  reason?: string;
  userId?: string;
}

export const assertCustomerBatchSize = (customerIds: string[]): void => {
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
};

export const shouldQueueBatchOperation = (customerIds: string[]): boolean =>
  customerIds.length > MAX_SYNC_BATCH_SIZE;

export const createBatchOperationResult = (
  total: number,
): BatchOperationResultDto => ({
  total,
  success: 0,
  failed: 0,
  errors: [],
});

export const recordBatchOperationSuccess = (
  result: BatchOperationResultDto,
): BatchOperationResultDto => ({
  ...result,
  success: result.success + 1,
});

export const recordBatchOperationError = (
  result: BatchOperationResultDto,
  customerId: string,
  error: unknown,
): BatchOperationResultDto => ({
  ...result,
  failed: result.failed + 1,
  errors: [
    ...result.errors,
    {
      customerId,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
  ],
});

export const assertBatchTagsProvided = (
  action: BatchAction.ADD_TAGS | BatchAction.REMOVE_TAGS,
  tags?: string[],
): string[] => {
  if (!tags?.length) {
    throw new BadRequestException(`Tags required for ${action} action`);
  }

  return tags;
};

export const mergeCustomerTags = (
  currentTags: string[],
  incomingTags: string[],
): string[] => [...new Set([...currentTags, ...incomingTags])];

export const removeCustomerTags = (
  currentTags: string[],
  incomingTags: string[],
): string[] => currentTags.filter((tag) => !incomingTags.includes(tag));

export const assertMembershipClassCodeForNewMembership = (
  membershipClassCode?: string,
): string => {
  if (!membershipClassCode) {
    throw new BadRequestException('Membership class code required for new membership');
  }

  return membershipClassCode;
};

export const hasMembershipValidityUpdates = (
  dto: Pick<BatchOperationDto, 'validFrom' | 'validTo'>,
): boolean => Boolean(dto.validFrom || dto.validTo);

export const buildQueuedBatchOperationPayload = (
  talentId: string,
  dto: BatchOperationDto,
  context: RequestContext,
): BatchOperationQueuePayload => ({
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

export const buildQueuedBatchOperationResponse = (
  customerCount: number,
  jobId: string,
): { jobId: string; message: string } => ({
  jobId,
  message: `Batch operation queued for ${customerCount} customers. Check job status for progress.`,
});
