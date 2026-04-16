// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Injectable,
} from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import { CustomerProfileReadService } from '../application/customer-profile-read.service';
import { CustomerProfileWriteService } from '../application/customer-profile-write.service';
import {
    CustomerListQueryDto,
} from '../dto/customer.dto';

/**
 * Customer Profile Service
 * Base service for customer profile operations
 */
@Injectable()
export class CustomerProfileService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLogService: TechEventLogService,
    private readonly customerProfileReadService: CustomerProfileReadService,
    private readonly customerProfileWriteService: CustomerProfileWriteService,
  ) {}

  /**
   * Get customer profiles list with filters
   */
  async findMany(talentId: string, query: CustomerListQueryDto, context: RequestContext) {
    return this.customerProfileReadService.findMany(talentId, query, context);
  }

  /**
   * Get customer profile by ID
   */
  async findById(id: string, talentId: string, context: RequestContext) {
    return this.customerProfileReadService.findById(id, talentId, context);
  }

  /**
   * Deactivate customer (multi-tenant aware)
   */
  async deactivate(
    id: string,
    talentId: string,
    reasonCode: string | undefined,
    version: number,
    context: RequestContext,
  ) {
    return this.customerProfileWriteService.deactivate(
      id,
      talentId,
      reasonCode,
      version,
      context,
    );
  }

  /**
   * Reactivate customer (multi-tenant aware)
   */
  async reactivate(id: string, talentId: string, context: RequestContext) {
    return this.customerProfileWriteService.reactivate(id, talentId, context);
  }

}
