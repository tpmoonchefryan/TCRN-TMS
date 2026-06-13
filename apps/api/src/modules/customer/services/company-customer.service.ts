// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';

import type { RequestContext } from '@tcrn/shared';

import { CompanyCustomerApplicationService } from '../application/company-customer.service';
import { CreateCompanyCustomerDto, UpdateCompanyCustomerDto } from '../dto/customer.dto';

/**
 * Company Customer Service
 * Compatibility facade for company customer write operations.
 */
@Injectable()
export class CompanyCustomerService {
  constructor(
    private readonly companyCustomerApplicationService: CompanyCustomerApplicationService
  ) {}

  create(talentId: string, dto: CreateCompanyCustomerDto, context: RequestContext) {
    return this.companyCustomerApplicationService.create(talentId, dto, context);
  }

  update(
    customerId: string,
    talentId: string,
    dto: UpdateCompanyCustomerDto,
    context: RequestContext
  ) {
    return this.companyCustomerApplicationService.update(customerId, talentId, dto, context);
  }

  createPiiPortalSession(customerId: string, talentId: string, context: RequestContext) {
    return this.companyCustomerApplicationService.createPiiPortalSession(
      customerId,
      talentId,
      context
    );
  }
}
