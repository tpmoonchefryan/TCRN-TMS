// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { PiiServiceConfigApplicationService } from '../application/pii-service-config.service';
import {
  CreatePiiServiceConfigDto,
  PaginationQueryDto,
  UpdatePiiServiceConfigDto,
} from '../dto/pii-config.dto';

@Injectable()
export class PiiServiceConfigService {
  constructor(
    private readonly piiServiceConfigApplicationService: PiiServiceConfigApplicationService,
  ) {}

  /**
   * Get all PII service configs (multi-tenant aware - using raw SQL for proper schema support)
   */
  findMany(query: PaginationQueryDto, context: RequestContext) {
    return this.piiServiceConfigApplicationService.findMany(query, context);
  }

  /**
   * Get PII service config by ID (multi-tenant aware - using raw SQL for proper schema support)
   */
  findById(id: string, context: RequestContext) {
    return this.piiServiceConfigApplicationService.findById(id, context);
  }

  /**
   * Create PII service config (multi-tenant aware - using raw SQL for proper schema support)
   */
  create(dto: CreatePiiServiceConfigDto, context: RequestContext) {
    return this.piiServiceConfigApplicationService.create(dto, context);
  }

  /**
   * Update PII service config (multi-tenant aware - using raw SQL for proper schema support)
   */
  update(
    id: string,
    dto: UpdatePiiServiceConfigDto,
    context: RequestContext,
  ) {
    return this.piiServiceConfigApplicationService.update(id, dto, context);
  }

  async testConnection(id: string, context: RequestContext) {
    return this.piiServiceConfigApplicationService.testConnection(id, context);
  }
}
