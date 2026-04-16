// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import { AdapterReadApplicationService } from '../application/adapter-read.service';
import { AdapterWriteApplicationService } from '../application/adapter-write.service';
import type { IntegrationAdapterOwnerScope } from '../domain/adapter-read.policy';
import {
  AdapterListQueryDto,
  CreateAdapterDto,
  OwnerType,
  UpdateAdapterConfigsDto,
  UpdateAdapterDto,
} from '../dto/integration.dto';
import { AdapterReadRepository } from '../infrastructure/adapter-read.repository';
import { AdapterWriteRepository } from '../infrastructure/adapter-write.repository';
import { AdapterCryptoService } from './adapter-crypto.service';

@Injectable()
export class AdapterService {
  constructor(
    databaseService: DatabaseService,
    cryptoService: AdapterCryptoService,
    changeLogService: ChangeLogService,
    techEventLog: TechEventLogService,
    private readonly adapterReadApplicationService: AdapterReadApplicationService = new AdapterReadApplicationService(
      new AdapterReadRepository(databaseService),
    ),
    private readonly adapterWriteApplicationService: AdapterWriteApplicationService = new AdapterWriteApplicationService(
      new AdapterWriteRepository(databaseService),
      adapterReadApplicationService,
      cryptoService,
      changeLogService,
      techEventLog,
    ),
  ) {}

  async findMany(
    scope: IntegrationAdapterOwnerScope,
    query: AdapterListQueryDto,
    context: RequestContext,
  ) {
    return this.adapterReadApplicationService.findMany(scope, query, context);
  }

  async findById(id: string, context: RequestContext) {
    return this.adapterReadApplicationService.findById(id, context);
  }

  async create(
    dto: CreateAdapterDto,
    context: RequestContext,
    scope: IntegrationAdapterOwnerScope = { ownerType: OwnerType.TENANT, ownerId: null },
  ) {
    return this.adapterWriteApplicationService.create(dto, context, scope);
  }

  async update(id: string, dto: UpdateAdapterDto, context: RequestContext) {
    return this.adapterWriteApplicationService.update(id, dto, context);
  }

  async updateConfigs(adapterId: string, dto: UpdateAdapterConfigsDto, context: RequestContext) {
    return this.adapterWriteApplicationService.updateConfigs(adapterId, dto, context);
  }

  async revealConfig(adapterId: string, configKey: string, context: RequestContext) {
    return this.adapterWriteApplicationService.revealConfig(adapterId, configKey, context);
  }

  async deactivate(id: string, context: RequestContext) {
    return this.adapterWriteApplicationService.deactivate(id, context);
  }

  async reactivate(id: string, context: RequestContext) {
    return this.adapterWriteApplicationService.reactivate(id, context);
  }

  async disableInherited(
    adapterId: string,
    scope: IntegrationAdapterOwnerScope,
    context: RequestContext,
  ) {
    return this.adapterWriteApplicationService.disableInherited(adapterId, scope, context);
  }

  async enableInherited(
    adapterId: string,
    scope: IntegrationAdapterOwnerScope,
    context: RequestContext,
  ) {
    return this.adapterWriteApplicationService.enableInherited(adapterId, scope, context);
  }
}
