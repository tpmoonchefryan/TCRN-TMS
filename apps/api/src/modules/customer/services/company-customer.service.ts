// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { CompanyCustomerApplicationService } from '../application/company-customer.service';
import {
  CreateCompanyCustomerDto,
  UpdateCompanyCustomerDto,
} from '../dto/customer.dto';

/**
 * Company Customer Service
 * Compatibility facade for company customer write operations.
 */
@Injectable()
export class CompanyCustomerService {
  constructor(
    private readonly companyCustomerApplicationService: CompanyCustomerApplicationService,
  ) {}

  create(
    talentId: string,
    dto: CreateCompanyCustomerDto,
    context: RequestContext,
  ) {
    return this.companyCustomerApplicationService.create(talentId, dto, context);
  }

  update(
    customerId: string,
    talentId: string,
    dto: UpdateCompanyCustomerDto,
    context: RequestContext,
  ) {
    return this.companyCustomerApplicationService.update(
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
    return this.companyCustomerApplicationService.createPiiPortalSession(
      customerId,
      talentId,
      context,
    );
  }
}
