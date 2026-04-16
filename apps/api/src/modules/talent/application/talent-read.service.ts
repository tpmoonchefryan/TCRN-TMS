// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import type {
  TalentData,
  TalentExternalPagesDomainConfig,
  TalentListOptions,
  TalentProfileStoreRecord,
  TalentStats,
} from '../domain/talent-read.policy';
import { TalentReadRepository } from '../infrastructure/talent-read.repository';

@Injectable()
export class TalentReadService {
  constructor(
    private readonly talentReadRepository: TalentReadRepository,
  ) {}

  findById(id: string, tenantSchema: string): Promise<TalentData | null> {
    return this.talentReadRepository.findById(id, tenantSchema);
  }

  findByCode(code: string, tenantSchema: string): Promise<TalentData | null> {
    return this.talentReadRepository.findByCode(code, tenantSchema);
  }

  findByHomepagePath(
    homepagePath: string,
    tenantSchema: string,
  ): Promise<TalentData | null> {
    return this.talentReadRepository.findByHomepagePath(
      homepagePath,
      tenantSchema,
    );
  }

  findByCustomDomain(
    customDomain: string,
    tenantSchema: string,
  ): Promise<TalentData | null> {
    return this.talentReadRepository.findByCustomDomain(
      customDomain,
      tenantSchema,
    );
  }

  getProfileStoreById(
    profileStoreId: string,
    tenantSchema: string,
  ): Promise<TalentProfileStoreRecord | null> {
    return this.talentReadRepository.getProfileStoreById(
      profileStoreId,
      tenantSchema,
    );
  }

  getTalentStats(talentId: string, tenantSchema: string): Promise<TalentStats> {
    return this.talentReadRepository.getTalentStats(talentId, tenantSchema);
  }

  getExternalPagesDomainConfig(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentExternalPagesDomainConfig> {
    return this.talentReadRepository.getExternalPagesDomainConfig(
      talentId,
      tenantSchema,
    );
  }

  list(
    tenantSchema: string,
    options: TalentListOptions = {},
  ): Promise<{ data: TalentData[]; total: number }> {
    return this.talentReadRepository.list(tenantSchema, options);
  }
}
