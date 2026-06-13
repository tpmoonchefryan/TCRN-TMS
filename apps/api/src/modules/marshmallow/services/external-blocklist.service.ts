// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';

import { type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { RedisService } from '../../redis';
import { ExternalBlocklistApplicationService } from '../application/external-blocklist.service';
import type { ExternalBlocklistItemWithMeta } from '../domain/external-blocklist.policy';
import type {
  CreateExternalBlocklistDto,
  DisableExternalBlocklistDto,
  ExternalBlocklistItem,
  ExternalBlocklistQueryDto,
  OwnerType,
  UpdateExternalBlocklistDto,
} from '../dto/external-blocklist.dto';
import { ExternalBlocklistCacheRepository } from '../infrastructure/external-blocklist-cache.repository';
import { ExternalBlocklistRepository } from '../infrastructure/external-blocklist.repository';

@Injectable()
export class ExternalBlocklistService {
  constructor(
    databaseService: DatabaseService,
    redisService: RedisService,
    private readonly externalBlocklistApplicationService: ExternalBlocklistApplicationService = new ExternalBlocklistApplicationService(
      new ExternalBlocklistRepository(databaseService),
      new ExternalBlocklistCacheRepository(redisService)
    )
  ) {}

  async findMany(
    tenantSchema: string,
    query: ExternalBlocklistQueryDto
  ): Promise<{ items: ExternalBlocklistItemWithMeta[]; total: number }> {
    return this.externalBlocklistApplicationService.findMany(tenantSchema, query);
  }

  async findWithInheritance(
    tenantSchema: string,
    scopeType: OwnerType,
    scopeId: string | null
  ): Promise<ExternalBlocklistItemWithMeta[]> {
    return this.externalBlocklistApplicationService.findWithInheritance(
      tenantSchema,
      scopeType,
      scopeId
    );
  }

  async findById(tenantSchema: string, id: string): Promise<ExternalBlocklistItem | null> {
    return this.externalBlocklistApplicationService.findById(tenantSchema, id);
  }

  async create(
    tenantSchema: string,
    dto: CreateExternalBlocklistDto,
    context: RequestContext
  ): Promise<ExternalBlocklistItem> {
    return this.externalBlocklistApplicationService.create(tenantSchema, dto, context);
  }

  async update(
    tenantSchema: string,
    id: string,
    dto: UpdateExternalBlocklistDto,
    context: RequestContext
  ): Promise<ExternalBlocklistItem> {
    return this.externalBlocklistApplicationService.update(tenantSchema, id, dto, context);
  }

  async delete(tenantSchema: string, id: string): Promise<void> {
    return this.externalBlocklistApplicationService.delete(tenantSchema, id);
  }

  async batchToggle(
    tenantSchema: string,
    ids: string[],
    isActive: boolean,
    context: RequestContext
  ): Promise<{ updated: number }> {
    return this.externalBlocklistApplicationService.batchToggle(
      tenantSchema,
      ids,
      isActive,
      context
    );
  }

  async disableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableExternalBlocklistDto,
    userId: string
  ): Promise<{ id: string; disabled: boolean }> {
    return this.externalBlocklistApplicationService.disableInScope(tenantSchema, id, dto, userId);
  }

  async enableInScope(
    tenantSchema: string,
    id: string,
    dto: DisableExternalBlocklistDto
  ): Promise<{ id: string; enabled: boolean }> {
    return this.externalBlocklistApplicationService.enableInScope(tenantSchema, id, dto);
  }
}

export type { ExternalBlocklistItemWithMeta };
