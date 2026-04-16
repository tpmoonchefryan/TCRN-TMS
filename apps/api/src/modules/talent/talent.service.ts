// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { CustomerArchiveAccessService } from '../customer/application/customer-archive-access.service';
import { CustomerArchiveRepository } from '../customer/infrastructure/customer-archive.repository';
import { DatabaseService } from '../database';
import { TalentCustomDomainService } from './application/talent-custom-domain.service';
import { TalentLifecycleService } from './application/talent-lifecycle.service';
import { TalentReadService } from './application/talent-read.service';
import { TalentWriteService } from './application/talent-write.service';
import type {
  TalentData,
  TalentListOptions,
  TalentPublishReadiness,
} from './domain/talent-read.policy';
import type { TalentExternalPagesDomainConfig, TalentProfileStoreRecord, TalentStats } from './domain/talent-read.policy';
import type {
  TalentCreateInput,
  TalentDeleteInput,
  TalentDeleteResult,
  TalentUpdateInput,
} from './domain/talent-write.policy';
import { TalentCustomDomainRepository } from './infrastructure/talent-custom-domain.repository';
import { TalentLifecycleRepository } from './infrastructure/talent-lifecycle.repository';
import { TalentReadRepository } from './infrastructure/talent-read.repository';
import { TalentWriteRepository } from './infrastructure/talent-write.repository';

export type {
  TalentData,
  TalentLifecycleIssue,
  TalentLifecycleStatus,
  TalentPublishReadiness,
} from './domain/talent-read.policy';

/**
 * Talent Service
 * Manages artists/VTubers
 */
@Injectable()
export class TalentService {
  constructor(
    databaseService: DatabaseService = new DatabaseService(),
    private readonly talentReadService: TalentReadService = new TalentReadService(
      new TalentReadRepository(),
    ),
    private readonly talentLifecycleService: TalentLifecycleService = new TalentLifecycleService(
      new TalentReadService(new TalentReadRepository()),
      new CustomerArchiveAccessService(
        new CustomerArchiveRepository(databaseService),
      ),
      new TalentLifecycleRepository(),
    ),
    private readonly talentWriteService: TalentWriteService = new TalentWriteService(
      new TalentReadService(new TalentReadRepository()),
      new TalentWriteRepository(),
    ),
    private readonly talentCustomDomainService: TalentCustomDomainService = new TalentCustomDomainService(
      new TalentCustomDomainRepository(),
    ),
  ) {}

  /**
   * Find talent by ID
   */
  async findById(id: string, tenantSchema: string): Promise<TalentData | null> {
    return this.talentReadService.findById(id, tenantSchema);
  }

  /**
   * Find talent by code
   */
  async findByCode(code: string, tenantSchema: string): Promise<TalentData | null> {
    return this.talentReadService.findByCode(code, tenantSchema);
  }

  /**
   * Find talent by homepage path
   */
  async findByHomepagePath(homepagePath: string, tenantSchema: string): Promise<TalentData | null> {
    return this.talentReadService.findByHomepagePath(homepagePath, tenantSchema);
  }

  /**
   * Get profile store by ID
   */
  async getProfileStoreById(
    profileStoreId: string,
    tenantSchema: string,
  ): Promise<TalentProfileStoreRecord | null> {
    return this.talentReadService.getProfileStoreById(profileStoreId, tenantSchema);
  }

  /**
   * Get talent statistics (customer count, etc.)
   */
  async getTalentStats(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentStats> {
    return this.talentReadService.getTalentStats(talentId, tenantSchema);
  }

  /**
   * Get external pages domain configuration (homepage and marshmallow)
   */
  async getExternalPagesDomainConfig(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentExternalPagesDomainConfig> {
    return this.talentReadService.getExternalPagesDomainConfig(
      talentId,
      tenantSchema,
    );
  }

  /**
   * List talents with filtering
   */
  async list(
    tenantSchema: string,
    options: TalentListOptions = {}
  ): Promise<{ data: TalentData[]; total: number }> {
    return this.talentReadService.list(tenantSchema, options);
  }

  /**
   * Create a new talent
   */
  async create(
    tenantSchema: string,
    data: TalentCreateInput,
    userId: string,
  ): Promise<TalentData> {
    return this.talentWriteService.create(tenantSchema, data, userId);
  }

  /**
   * Update a talent
   */
  async update(
    id: string,
    tenantSchema: string,
    data: TalentUpdateInput,
    userId: string,
  ): Promise<TalentData> {
    return this.talentWriteService.update(id, tenantSchema, data, userId);
  }

  async delete(
    id: string,
    tenantSchema: string,
    data: TalentDeleteInput,
  ): Promise<TalentDeleteResult> {
    return this.talentWriteService.delete(id, tenantSchema, data);
  }

  /**
   * Move talent to a new subsidiary
   */
  async move(
    id: string,
    tenantSchema: string,
    newSubsidiaryId: string | null,
    version: number,
    userId: string,
  ): Promise<TalentData> {
    return this.talentLifecycleService.move(
      id,
      tenantSchema,
      newSubsidiaryId,
      version,
      userId,
    );
  }

  async getPublishReadiness(
    id: string,
    tenantSchema: string
  ): Promise<TalentPublishReadiness> {
    return this.talentLifecycleService.getPublishReadiness(id, tenantSchema);
  }

  async publish(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<TalentData> {
    return this.talentLifecycleService.publish(id, tenantSchema, version, userId);
  }

  async disable(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<TalentData> {
    return this.talentLifecycleService.disable(id, tenantSchema, version, userId);
  }

  async reEnable(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<TalentData> {
    return this.talentLifecycleService.reEnable(
      id,
      tenantSchema,
      version,
      userId,
    );
  }

  // =============================================================================
  // UNIFIED CUSTOM DOMAIN MANAGEMENT
  // =============================================================================

  /**
   * Get unified custom domain configuration
   * homepage_path → Homepage routing, marshmallow_path → Marshmallow routing
   */
  async getCustomDomainConfig(
    talentId: string,
    tenantSchema: string
  ) {
    return this.talentCustomDomainService.getCustomDomainConfig(
      talentId,
      tenantSchema,
    );
  }

  /**
   * Set custom domain for talent
   */
  async setCustomDomain(
    talentId: string,
    tenantSchema: string,
    customDomain: string | null
  ) {
    return this.talentCustomDomainService.setCustomDomain(
      talentId,
      tenantSchema,
      customDomain,
    );
  }

  /**
   * Verify custom domain by checking DNS TXT record
   */
  async verifyCustomDomain(
    talentId: string,
    tenantSchema: string
  ): Promise<{ verified: boolean; message: string }> {
    return this.talentCustomDomainService.verifyCustomDomain(
      talentId,
      tenantSchema,
    );
  }

  /**
   * Update service paths for custom domain
   * homepage_path is used by public-homepage.service.ts for routing
   * marshmallow_path is used by public-marshmallow.service.ts for routing
   */
  async updateServicePaths(
    talentId: string,
    tenantSchema: string,
    paths: {
      homepageCustomPath?: string;
      marshmallowCustomPath?: string;
    }
  ): Promise<{
    homepageCustomPath: string | null;
    marshmallowCustomPath: string | null;
  }> {
    return this.talentCustomDomainService.updateServicePaths(
      talentId,
      tenantSchema,
      paths,
    );
  }

  /**
   * Update SSL mode for custom domain
   */
  async updateSslMode(
    talentId: string,
    tenantSchema: string,
    sslMode: 'auto' | 'self_hosted' | 'cloudflare'
  ): Promise<{ customDomainSslMode: string }> {
    return this.talentCustomDomainService.updateSslMode(
      talentId,
      tenantSchema,
      sslMode,
    );
  }

  /**
   * Find talent by custom domain
   */
  async findByCustomDomain(
    customDomain: string,
    tenantSchema: string
  ): Promise<TalentData | null> {
    return this.talentReadService.findByCustomDomain(customDomain, tenantSchema);
  }
}
