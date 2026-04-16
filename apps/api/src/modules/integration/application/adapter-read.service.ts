// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  type IntegrationAdapterOwnerScope,
  mapIntegrationAdapterDetail,
  mapIntegrationAdapterListItem,
} from '../domain/adapter-read.policy';
import { type AdapterListQueryDto } from '../dto/integration.dto';
import { AdapterReadRepository } from '../infrastructure/adapter-read.repository';
import { getAdapterTenantSchema } from './adapter-context.util';

@Injectable()
export class AdapterReadApplicationService {
  constructor(
    private readonly adapterReadRepository: AdapterReadRepository,
  ) {}

  async findMany(
    scope: IntegrationAdapterOwnerScope,
    query: AdapterListQueryDto,
    context: RequestContext,
  ) {
    const rows = await this.adapterReadRepository.findMany(
      getAdapterTenantSchema(context),
      scope,
      query,
    );

    return rows.map((row) => mapIntegrationAdapterListItem(row, scope));
  }

  async findById(id: string, context: RequestContext) {
    const tenantSchema = getAdapterTenantSchema(context);
    const adapter = await this.adapterReadRepository.findById(tenantSchema, id);

    if (!adapter) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Adapter not found',
      });
    }

    const configs = await this.adapterReadRepository.findConfigs(tenantSchema, id);
    return mapIntegrationAdapterDetail(adapter, configs);
  }
}
