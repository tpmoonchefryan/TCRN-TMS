// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { ProfileStoreApplicationService } from '../application/profile-store.service';
import {
  CreateProfileStoreDto,
  PaginationQueryDto,
  UpdateProfileStoreDto,
} from '../dto/pii-config.dto';

@Injectable()
export class ProfileStoreService {
  constructor(
    private readonly profileStoreApplicationService: ProfileStoreApplicationService,
  ) {}

  /**
   * Get all profile stores (multi-tenant aware - using raw SQL for proper schema support)
   */
  findMany(query: PaginationQueryDto, context: RequestContext) {
    return this.profileStoreApplicationService.findMany(query, context);
  }

  /**
   * Get profile store by ID (multi-tenant aware - using raw SQL for proper schema support)
   */
  findById(id: string, context: RequestContext) {
    return this.profileStoreApplicationService.findById(id, context);
  }

  /**
   * Create profile store (multi-tenant aware - using raw SQL for proper schema support)
   */
  create(dto: CreateProfileStoreDto, context: RequestContext) {
    return this.profileStoreApplicationService.create(dto, context);
  }

  /**
   * Update profile store (multi-tenant aware - using raw SQL for proper schema support)
   */
  update(id: string, dto: UpdateProfileStoreDto, context: RequestContext) {
    return this.profileStoreApplicationService.update(id, dto, context);
  }
}
