// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { IndividualCustomerPiiApplicationService } from '../application/individual-customer-pii.service';
import { IndividualCustomerWriteApplicationService } from '../application/individual-customer-write.service';
import type {
  CreateIndividualCustomerDto,
  UpdateIndividualCustomerDto,
  UpdateIndividualPiiDto,
} from '../dto/customer.dto';

/**
 * Individual Customer Service
 * Compatibility facade for individual customer operations.
 */
@Injectable()
export class IndividualCustomerService {
  constructor(
    private readonly individualCustomerWriteApplicationService: IndividualCustomerWriteApplicationService,
    private readonly individualCustomerPiiApplicationService: IndividualCustomerPiiApplicationService,
  ) {}

  create(
    talentId: string,
    dto: CreateIndividualCustomerDto,
    context: RequestContext,
  ) {
    return this.individualCustomerWriteApplicationService.create(
      talentId,
      dto,
      context,
    );
  }

  update(
    customerId: string,
    talentId: string,
    dto: UpdateIndividualCustomerDto,
    context: RequestContext,
  ) {
    return this.individualCustomerWriteApplicationService.update(
      customerId,
      talentId,
      dto,
      context,
    );
  }

  createPiiPortalSession(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    return this.individualCustomerPiiApplicationService.createPortalSession(
      customerId,
      talentId,
      context,
    );
  }

  updatePii(
    customerId: string,
    talentId: string,
    dto: UpdateIndividualPiiDto,
    context: RequestContext,
  ) {
    return this.individualCustomerPiiApplicationService.updatePii(
      customerId,
      talentId,
      dto,
      context,
    );
  }
}
