// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { SubsidiaryReadApplicationService } from './application/subsidiary-read.service';
import { SubsidiaryWriteApplicationService } from './application/subsidiary-write.service';
import {
  type SubsidiaryData,
  type SubsidiaryListOptions,
} from './domain/subsidiary-read.policy';
import { SubsidiaryReadRepository } from './infrastructure/subsidiary-read.repository';
import { SubsidiaryWriteRepository } from './infrastructure/subsidiary-write.repository';

export type { SubsidiaryData } from './domain/subsidiary-read.policy';

/**
 * Subsidiary Service
 * Manages hierarchical organization units (分级目录)
 */
@Injectable()
export class SubsidiaryService {
  constructor(
    private readonly subsidiaryReadApplicationService: SubsidiaryReadApplicationService = new SubsidiaryReadApplicationService(
      new SubsidiaryReadRepository(),
    ),
    private readonly subsidiaryWriteApplicationService: SubsidiaryWriteApplicationService = new SubsidiaryWriteApplicationService(
      new SubsidiaryWriteRepository(),
      subsidiaryReadApplicationService,
    ),
  ) {}

  /**
   * Find subsidiary by ID
   */
  async findById(id: string, tenantSchema: string): Promise<SubsidiaryData | null> {
    return this.subsidiaryReadApplicationService.findById(id, tenantSchema);
  }

  /**
   * Find subsidiary by code
   */
  async findByCode(code: string, tenantSchema: string): Promise<SubsidiaryData | null> {
    return this.subsidiaryReadApplicationService.findByCode(code, tenantSchema);
  }

  /**
   * List subsidiaries with filtering
   */
  async list(
    tenantSchema: string,
    options: SubsidiaryListOptions = {},
  ): Promise<{ data: SubsidiaryData[]; total: number }> {
    return this.subsidiaryReadApplicationService.list(tenantSchema, options);
  }

  /**
   * Create a new subsidiary
   */
  async create(
    tenantSchema: string,
    data: {
      parentId?: string | null;
      code: string;
      nameEn: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
    },
    userId: string
  ): Promise<SubsidiaryData> {
    return this.subsidiaryWriteApplicationService.create(tenantSchema, data, userId);
  }

  /**
   * Update a subsidiary
   */
  async update(
    id: string,
    tenantSchema: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      version: number;
    },
    userId: string
  ): Promise<SubsidiaryData> {
    return this.subsidiaryWriteApplicationService.update(id, tenantSchema, data, userId);
  }

  /**
   * Move subsidiary to a new parent
   */
  async move(
    id: string,
    tenantSchema: string,
    newParentId: string | null,
    version: number,
    userId: string
  ): Promise<{ subsidiary: SubsidiaryData; affectedChildren: number }> {
    return this.subsidiaryWriteApplicationService.move(
      id,
      tenantSchema,
      newParentId,
      version,
      userId,
    ) as never;
  }

  /**
   * Deactivate a subsidiary
   */
  async deactivate(
    id: string,
    tenantSchema: string,
    cascade: boolean,
    version: number,
    userId: string
  ): Promise<{ subsidiaries: number; talents: number }> {
    return this.subsidiaryWriteApplicationService.deactivate(
      id,
      tenantSchema,
      cascade,
      version,
      userId,
    );
  }

  /**
   * Reactivate a subsidiary
   */
  async reactivate(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<SubsidiaryData> {
    return this.subsidiaryWriteApplicationService.reactivate(
      id,
      tenantSchema,
      version,
      userId,
    );
  }

  /**
   * Get children count
   */
  async getChildrenCount(id: string, tenantSchema: string): Promise<number> {
    return this.subsidiaryReadApplicationService.getChildrenCount(id, tenantSchema);
  }

  /**
   * Get talent count for a subsidiary (direct children only)
   */
  async getTalentCount(id: string, tenantSchema: string): Promise<number> {
    return this.subsidiaryReadApplicationService.getTalentCount(id, tenantSchema);
  }
}
