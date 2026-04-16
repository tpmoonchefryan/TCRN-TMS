// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { MembershipRecordApplicationService } from '../application/membership-record.service';
import type {
  CreateMembershipDto,
  MembershipListQueryDto,
  UpdateMembershipDto,
} from '../dto/customer.dto';

/**
 * Membership Record Service
 * Compatibility facade for customer membership operations.
 */
@Injectable()
export class MembershipRecordService {
  constructor(
    private readonly membershipRecordApplicationService: MembershipRecordApplicationService,
  ) {}

  findByCustomer(
    customerId: string,
    talentId: string,
    query: MembershipListQueryDto,
    context: RequestContext,
  ) {
    return this.membershipRecordApplicationService.findByCustomer(
      customerId,
      talentId,
      query,
      context,
    );
  }

  create(
    customerId: string,
    talentId: string,
    dto: CreateMembershipDto,
    context: RequestContext,
  ) {
    return this.membershipRecordApplicationService.create(
      customerId,
      talentId,
      dto,
      context,
    );
  }

  update(
    customerId: string,
    recordId: string,
    talentId: string,
    dto: UpdateMembershipDto,
    context: RequestContext,
  ) {
    return this.membershipRecordApplicationService.update(
      customerId,
      recordId,
      talentId,
      dto,
      context,
    );
  }

  getSummary(customerId: string, context: RequestContext) {
    return this.membershipRecordApplicationService.getSummary(customerId, context);
  }
}
