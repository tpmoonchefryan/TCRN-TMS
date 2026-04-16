// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, Injectable } from '@nestjs/common';
import { ErrorCodes, type RequestContext, TechEventType } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import {
  buildIndividualCustomerPiiUpdateFieldChanges,
  collectIndividualCustomerPiiUpdatedFields,
  hasIndividualCustomerPiiVersionMismatch,
} from '../domain/individual-customer-pii.policy';
import {
  buildCustomerPiiPlatformSyncResult,
  buildCustomerPiiPortalSessionResult,
} from '../domain/pii-platform.policy';
import {
  CustomerAction,
  ProfileType,
  type UpdateIndividualPiiDto,
} from '../dto/customer.dto';
import { IndividualCustomerPiiRepository } from '../infrastructure/individual-customer-pii.repository';
import { CustomerArchiveAccessService } from './customer-archive-access.service';
import { CustomerPiiPlatformApplicationService } from './customer-pii-platform.service';

@Injectable()
export class IndividualCustomerPiiApplicationService {
  constructor(
    private readonly individualCustomerPiiRepository: IndividualCustomerPiiRepository,
    private readonly databaseService: DatabaseService,
    private readonly techEventLogService: TechEventLogService,
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly customerPiiPlatformApplicationService: CustomerPiiPlatformApplicationService,
  ) {}

  async createPortalSession(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    const customer = await this.verifyAccess(customerId, talentId, context);
    const portalSession =
      await this.customerPiiPlatformApplicationService.createPortalSession(
        customerId,
        talentId,
        ProfileType.INDIVIDUAL,
        context,
      );

    await this.techEventLogService.piiAccess(
      TechEventType.PII_ACCESS_REQUESTED,
      'PII portal session created for individual customer',
      {
        customerId,
        operatorId: context.userId,
        operatorUsername: context.userName,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      context,
    );

    await this.individualCustomerPiiRepository.insertAccessLog(
      this.databaseService.getPrisma(),
      context.tenantSchema,
      {
        customerId,
        profileStoreId: customer.profileStoreId,
        talentId,
        action: CustomerAction.PII_VIEW,
        userId: context.userId,
        userName: context.userName,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      },
    );

    return buildCustomerPiiPortalSessionResult(portalSession);
  }

  async updatePii(
    customerId: string,
    talentId: string,
    dto: UpdateIndividualPiiDto,
    context: RequestContext,
  ) {
    const customer = await this.verifyAccess(customerId, talentId, context);

    if (hasIndividualCustomerPiiVersionMismatch(customer, dto.version)) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    await this.customerPiiPlatformApplicationService.upsertCustomerPii(
      customerId,
      talentId,
      ProfileType.INDIVIDUAL,
      dto.pii,
      context,
    );

    const fieldsUpdated = collectIndividualCustomerPiiUpdatedFields(dto.pii);

    await this.techEventLogService.piiAccess(
      TechEventType.PII_ACCESS_REQUESTED,
      'PII data synchronized to TCRN PII Platform for individual customer',
      {
        customerId,
        operatorId: context.userId,
        fieldsUpdated,
      },
      context,
    );

    await this.individualCustomerPiiRepository.withTransaction(async (prisma) => {
      await this.individualCustomerPiiRepository.insertPiiUpdateAccessLog(
        prisma,
        context.tenantSchema,
        {
          customerId,
          profileStoreId: customer.profileStoreId,
          talentId,
          action: CustomerAction.PII_UPDATE,
          fieldChanges: buildIndividualCustomerPiiUpdateFieldChanges(dto.pii),
          userId: context.userId,
          userName: context.userName,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
        },
      );

      await this.individualCustomerPiiRepository.incrementCustomerVersion(
        prisma,
        context.tenantSchema,
        {
          customerId,
          talentId,
          userId: context.userId,
        },
      );
    });

    return buildCustomerPiiPlatformSyncResult(customerId);
  }

  private async verifyAccess(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    return this.customerArchiveAccessService.requireCustomerArchiveAccess(
      customerId,
      talentId,
      context,
      {
        expectedProfileType: ProfileType.INDIVIDUAL,
      },
    );
  }
}
