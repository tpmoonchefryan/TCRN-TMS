// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { PlatformIdentityApplicationService } from '../application/platform-identity.service';
import type {
  CreatePlatformIdentityDto,
  PlatformIdentityHistoryQueryDto,
  UpdatePlatformIdentityDto,
} from '../dto/customer.dto';

/**
 * Platform Identity Service
 * Compatibility facade for customer platform identity operations.
 */
@Injectable()
export class PlatformIdentityService {
  constructor(
    private readonly platformIdentityApplicationService: PlatformIdentityApplicationService,
  ) {}

  findByCustomer(
    customerId: string,
    talentId: string,
    context: RequestContext,
  ) {
    return this.platformIdentityApplicationService.findByCustomer(
      customerId,
      talentId,
      context,
    );
  }

  create(
    customerId: string,
    talentId: string,
    dto: CreatePlatformIdentityDto,
    context: RequestContext,
  ) {
    return this.platformIdentityApplicationService.create(
      customerId,
      talentId,
      dto,
      context,
    );
  }

  update(
    customerId: string,
    identityId: string,
    talentId: string,
    dto: UpdatePlatformIdentityDto,
    context: RequestContext,
  ) {
    return this.platformIdentityApplicationService.update(
      customerId,
      identityId,
      talentId,
      dto,
      context,
    );
  }

  getHistory(
    customerId: string,
    talentId: string,
    query: PlatformIdentityHistoryQueryDto,
    context: RequestContext,
  ) {
    return this.platformIdentityApplicationService.getHistory(
      customerId,
      talentId,
      query,
      context,
    );
  }
}
