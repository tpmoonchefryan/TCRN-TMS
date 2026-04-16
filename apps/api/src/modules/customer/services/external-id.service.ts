// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { CustomerExternalIdApplicationService } from '../application/customer-external-id.service';

/**
 * Customer External ID Service
 * Compatibility facade for customer external identifier operations.
 */
@Injectable()
export class CustomerExternalIdService {
  constructor(
    private readonly customerExternalIdApplicationService: CustomerExternalIdApplicationService,
  ) {}

  findByCustomer(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    return this.customerExternalIdApplicationService.findByCustomer(
      customerId,
      talentId,
      context,
    );
  }

  create(
    customerId: string,
    talentId: string,
    dto: { consumerCode: string; externalId: string },
    context: RequestContext,
  ) {
    return this.customerExternalIdApplicationService.create(
      customerId,
      talentId,
      dto,
      context,
    );
  }

  delete(
    customerId: string,
    externalIdId: string,
    talentId: string,
    context: RequestContext,
  ) {
    return this.customerExternalIdApplicationService.delete(
      customerId,
      externalIdId,
      talentId,
      context,
    );
  }

  findCustomerByExternalId(
    consumerCode: string,
    externalId: string,
    profileStoreId: string,
    context: RequestContext,
  ) {
    return this.customerExternalIdApplicationService.findCustomerByExternalId(
      consumerCode,
      externalId,
      profileStoreId,
      context,
    );
  }

  existsInProfileStore(
    consumerCode: string,
    externalId: string,
    profileStoreId: string,
    context: RequestContext,
  ) {
    return this.customerExternalIdApplicationService.existsInProfileStore(
      consumerCode,
      externalId,
      profileStoreId,
      context,
    );
  }
}
