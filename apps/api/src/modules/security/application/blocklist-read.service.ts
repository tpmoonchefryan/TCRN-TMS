// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  buildBlocklistDetailResponse,
  buildBlocklistListItem,
  normalizeBlocklistListOptions,
} from '../domain/blocklist-read.policy';
import { type BlocklistListQueryDto } from '../dto/security.dto';
import { BlocklistReadRepository } from '../infrastructure/blocklist-read.repository';

@Injectable()
export class BlocklistReadService {
  constructor(
    private readonly blocklistReadRepository: BlocklistReadRepository,
  ) {}

  async findMany(tenantSchema: string, query: BlocklistListQueryDto) {
    const options = normalizeBlocklistListOptions(query);
    const scopeChain = await this.blocklistReadRepository.getScopeChain(
      tenantSchema,
      options.scopeType,
      options.scopeId,
    );

    const [total, items, disabledIds] = await Promise.all([
      this.blocklistReadRepository.countMany(tenantSchema, options, scopeChain),
      this.blocklistReadRepository.findMany(tenantSchema, options, scopeChain),
      this.blocklistReadRepository.getDisabledIds(
        tenantSchema,
        options.scopeType,
        options.scopeId,
      ),
    ]);

    const enrichedItems = items
      .map((item) => buildBlocklistListItem(item, options, disabledIds))
      .filter((item) => options.includeDisabled || !item.isDisabledHere);

    return {
      items: enrichedItems,
      total: options.includeDisabled ? total : enrichedItems.length,
    };
  }

  async findById(tenantSchema: string, id: string) {
    const entry = await this.blocklistReadRepository.findById(tenantSchema, id);

    if (!entry) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Blocklist entry not found',
      });
    }

    return buildBlocklistDetailResponse(entry);
  }
}
