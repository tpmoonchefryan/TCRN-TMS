// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { ChangeLogService, TechEventLogService } from '../../log';
import {
  buildCustomerProfileActivationResult,
  hasCustomerProfileVersionMismatch,
} from '../domain/customer-profile-write.policy';
import { CustomerAction } from '../dto/customer.dto';
import { CustomerProfileWriteRepository } from '../infrastructure/customer-profile-write.repository';
import { CustomerArchiveAccessService } from './customer-archive-access.service';
import { CustomerPiiPlatformApplicationService } from './customer-pii-platform.service';

@Injectable()
export class CustomerProfileWriteService {
  constructor(
    private readonly customerProfileWriteRepository: CustomerProfileWriteRepository,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLogService: TechEventLogService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly customerPiiPlatformApplicationService: CustomerPiiPlatformApplicationService,
  ) {}

  async deactivate(
    customerId: string,
    talentId: string,
    reasonCode: string | undefined,
    version: number,
    context: RequestContext,
  ) {
    const customer =
      await this.customerArchiveAccessService.requireCustomerArchiveAccess(
        customerId,
        talentId,
        context,
      );

    if (hasCustomerProfileVersionMismatch(customer, version)) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    const inactivationReasonId = reasonCode
      ? await this.customerProfileWriteRepository.findActiveInactivationReasonId(
          context.tenantSchema,
          reasonCode,
        )
      : null;
    const occurredAt = new Date();

    await this.customerProfileWriteRepository.deactivate(context.tenantSchema, {
      customerId,
      inactivationReasonId,
      occurredAt,
      talentId,
      userId: context.userId,
    });

    await this.changeLogService.create(
      prisma,
      {
        action: 'deactivate',
        objectType: 'customer_profile',
        objectId: customerId,
        objectName: customer.nickname,
        oldValue: { isActive: true },
        newValue: { isActive: false, inactivationReasonId },
      },
      context,
    );

    await this.customerProfileWriteRepository.createAccessLog(context.tenantSchema, {
      customerId,
      profileStoreId: customer.profileStoreId,
      talentId,
      action: CustomerAction.DEACTIVATE,
      userId: context.userId,
      userName: context.userName,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    try {
      await this.customerPiiPlatformApplicationService.syncCustomerLifecycleState(
        customerId,
        talentId,
        customer.profileType,
        {
          action: 'deactivate',
          isActive: false,
          reasonCode: reasonCode ?? null,
          occurredAt,
        },
        context,
      );
    } catch (error) {
      await this.techEventLogService.warn(
        'PII_PLATFORM_LIFECYCLE_SYNC_FAILED',
        'Failed to synchronize customer deactivation to TCRN PII Platform',
        {
          customerId,
          talentId,
          profileType: customer.profileType,
          operatorId: context.userId,
          reasonCode: reasonCode ?? null,
          originalError: error instanceof Error ? error.message : String(error),
        },
        context,
      );
      throw error;
    }

    return buildCustomerProfileActivationResult(customerId, false);
  }

  async reactivate(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    const customer =
      await this.customerArchiveAccessService.requireCustomerArchiveAccess(
        customerId,
        talentId,
        context,
      );

    const occurredAt = new Date();

    await this.customerProfileWriteRepository.reactivate(context.tenantSchema, {
      customerId,
      occurredAt,
      talentId,
      userId: context.userId,
    });

    await this.changeLogService.create(
      prisma,
      {
        action: 'reactivate',
        objectType: 'customer_profile',
        objectId: customerId,
        objectName: customer.nickname,
        oldValue: { isActive: false },
        newValue: { isActive: true },
      },
      context,
    );

    await this.customerProfileWriteRepository.createAccessLog(context.tenantSchema, {
      customerId,
      profileStoreId: customer.profileStoreId,
      talentId,
      action: CustomerAction.REACTIVATE,
      userId: context.userId,
      userName: context.userName,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    try {
      await this.customerPiiPlatformApplicationService.syncCustomerLifecycleState(
        customerId,
        talentId,
        customer.profileType,
        {
          action: 'reactivate',
          isActive: true,
          occurredAt,
        },
        context,
      );
    } catch (error) {
      await this.techEventLogService.warn(
        'PII_PLATFORM_LIFECYCLE_SYNC_FAILED',
        'Failed to synchronize customer reactivation to TCRN PII Platform',
        {
          customerId,
          talentId,
          profileType: customer.profileType,
          operatorId: context.userId,
          originalError: error instanceof Error ? error.message : String(error),
        },
        context,
      );
      throw error;
    }

    return buildCustomerProfileActivationResult(customerId, true);
  }
}
