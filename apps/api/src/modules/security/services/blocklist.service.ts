// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
} from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { BlocklistReadService } from '../application/blocklist-read.service';
import { BlocklistWriteService } from '../application/blocklist-write.service';
import type { BlocklistEntryWithMeta } from '../domain/blocklist-read.policy';
import {
  BlocklistListQueryDto,
  CreateBlocklistDto,
  DisableScopeDto,
  TestBlocklistDto,
  UpdateBlocklistDto,
} from '../dto/security.dto';

@Injectable()
export class BlocklistService {
  constructor(
    private readonly blocklistReadService: BlocklistReadService,
    private readonly blocklistWriteService: BlocklistWriteService,
  ) {}

  /**
   * List blocklist entries with inheritance support
   */
  async findMany(
    tenantSchema: string,
    query: BlocklistListQueryDto,
  ): Promise<{ items: BlocklistEntryWithMeta[]; total: number }> {
    return this.blocklistReadService.findMany(tenantSchema, query);
  }

  /**
   * Get entry by ID
   */
  async findById(tenantSchema: string, id: string) {
    return this.blocklistReadService.findById(tenantSchema, id);
  }

  /**
   * Create entry
   */
  create(dto: CreateBlocklistDto, context: RequestContext) {
    return this.blocklistWriteService.create(dto, context);
  }

  /**
   * Update entry
   */
  update(id: string, dto: UpdateBlocklistDto, context: RequestContext) {
    return this.blocklistWriteService.update(id, dto, context);
  }

  /**
   * Delete entry (soft delete)
   */
  delete(id: string, context: RequestContext) {
    return this.blocklistWriteService.delete(id, context);
  }

  /**
   * Test pattern
   */
  test(dto: TestBlocklistDto) {
    return this.blocklistWriteService.test(dto);
  }

  /**
   * Disable inherited blocklist entry in current scope
   */
  async disableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableScopeDto,
    userId: string,
  ): Promise<{ id: string; disabled: boolean }> {
    return this.blocklistWriteService.disableInScope(
      tenantSchema,
      id,
      dto,
      userId,
    );
  }

  /**
   * Enable previously disabled inherited blocklist entry
   */
  async enableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableScopeDto,
  ): Promise<{ id: string; enabled: boolean }> {
    return this.blocklistWriteService.enableInScope(tenantSchema, id, dto);
  }
}
