// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  buildCustomerExternalIdObjectName,
  buildDuplicateCustomerExternalIdMessage,
  mapCustomerExternalIdRecord,
} from '../domain/customer-external-id.policy';
import { CustomerExternalIdRepository } from '../infrastructure/customer-external-id.repository';
import { CustomerArchiveAccessService } from './customer-archive-access.service';

@Injectable()
export class CustomerExternalIdApplicationService {
  constructor(
    private readonly customerArchiveAccessService: CustomerArchiveAccessService,
    private readonly customerExternalIdRepository: CustomerExternalIdRepository,
  ) {}

  async findByCustomer(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const externalIds = await this.customerExternalIdRepository.findByCustomer(
      context.tenantSchema,
      customerId,
    );

    return externalIds.map((record) => mapCustomerExternalIdRecord(record));
  }

  async create(
    customerId: string,
    talentId: string,
    dto: { consumerCode: string; externalId: string },
    context: RequestContext,
  ) {
    const customer = await this.verifyCustomerAccess(customerId, talentId, context);
    const consumer = await this.customerExternalIdRepository.findActiveConsumerByCode(
      context.tenantSchema,
      dto.consumerCode,
    );

    if (!consumer) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Consumer not found',
      });
    }

    const existing = await this.customerExternalIdRepository.findDuplicateExternalId(
      context.tenantSchema,
      customer.profileStoreId,
      consumer.id,
      dto.externalId,
    );

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: buildDuplicateCustomerExternalIdMessage(
          dto.consumerCode,
          dto.externalId,
        ),
      });
    }

    const created = await this.customerExternalIdRepository.create(context.tenantSchema, {
      customerId,
      profileStoreId: customer.profileStoreId,
      consumerId: consumer.id,
      externalId: dto.externalId,
      userId: context.userId,
    });

    await this.customerExternalIdRepository.insertChangeLog(context.tenantSchema, {
      action: 'create',
      objectId: created.id,
      objectName: buildCustomerExternalIdObjectName(consumer.code, dto.externalId),
      diff: JSON.stringify({
        new: {
          consumerCode: consumer.code,
          externalId: dto.externalId,
        },
      }),
      userId: context.userId,
      ipAddress: context.ipAddress,
    });

    return mapCustomerExternalIdRecord({
      id: created.id,
      consumerId: consumer.id,
      consumerCode: consumer.code,
      consumerName: consumer.nameEn,
      externalId: created.externalId,
      createdAt: created.createdAt,
      createdBy: context.userId,
    });
  }

  async delete(
    customerId: string,
    externalIdId: string,
    talentId: string,
    context: RequestContext,
  ) {
    await this.verifyCustomerAccess(customerId, talentId, context);

    const externalId = await this.customerExternalIdRepository.findOwnedExternalId(
      context.tenantSchema,
      customerId,
      externalIdId,
    );

    if (!externalId) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External ID not found',
      });
    }

    await this.customerExternalIdRepository.delete(context.tenantSchema, externalIdId);

    await this.customerExternalIdRepository.insertChangeLog(context.tenantSchema, {
      action: 'delete',
      objectId: externalIdId,
      objectName: buildCustomerExternalIdObjectName(
        externalId.consumerCode,
        externalId.externalId,
      ),
      diff: JSON.stringify({
        old: {
          consumerCode: externalId.consumerCode,
          externalId: externalId.externalId,
        },
      }),
      userId: context.userId,
      ipAddress: context.ipAddress,
    });
  }

  findCustomerByExternalId(
    consumerCode: string,
    externalId: string,
    profileStoreId: string,
    context: RequestContext,
  ) {
    return this.customerExternalIdRepository.findCustomerByExternalId(
      context.tenantSchema,
      consumerCode,
      externalId,
      profileStoreId,
    );
  }

  existsInProfileStore(
    consumerCode: string,
    externalId: string,
    profileStoreId: string,
    context: RequestContext,
  ) {
    return this.customerExternalIdRepository.existsInProfileStore(
      context.tenantSchema,
      consumerCode,
      externalId,
      profileStoreId,
    );
  }

  private async verifyCustomerAccess(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    return this.customerArchiveAccessService.requireCustomerArchiveAccess(
      customerId,
      talentId,
      context,
    );
  }
}
