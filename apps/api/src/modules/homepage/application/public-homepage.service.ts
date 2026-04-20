// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  buildPublicHomepageData,
  hasPublishedHomepage,
  type PublicHomepageData,
  type PublicHomepageTalentRecord,
} from '../domain/public-homepage-read.policy';
import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';
import { getHomepageComponentCount } from '../utils/public-schedule';
import { DomainLookupService } from './domain-lookup.service';

export type { PublicHomepageData } from '../domain/public-homepage-read.policy';

@Injectable()
export class PublicHomepageService {
  private readonly logger = new Logger(PublicHomepageService.name);

  constructor(
    private readonly publicHomepageReadRepository: PublicHomepageReadRepository,
    private readonly domainLookupService: DomainLookupService,
  ) {}

  async getPublishedHomepage(path: string): Promise<PublicHomepageData | null> {
    this.logger.debug(`[getPublishedHomepage] Looking up path: "${path}"`);
    const tenantSchemas = await this.publicHomepageReadRepository.listActiveTenantSchemas();

    this.logger.debug(
      `[getPublishedHomepage] Found ${tenantSchemas.length} active tenants: ${tenantSchemas.join(', ')}`,
    );

    for (const schema of tenantSchemas) {
      try {
        const talent = await this.publicHomepageReadRepository.findPublishedTalentByPath(schema, path);

        this.logger.debug(
          `[getPublishedHomepage] Schema "${schema}": found ${talent ? 1 : 0} matching talents`,
        );

        if (!talent) {
          continue;
        }

        this.logger.debug(
          `[getPublishedHomepage] Found talent: id=${talent.id}, displayName="${talent.displayName}", homepagePath="${talent.homepagePath}"`,
        );

        const result = await this.getPublishedHomepageForTalent(schema, talent);
        this.logger.debug(
          `[getPublishedHomepage] Returning ${result ? 'published' : 'hidden'} data for "${talent.displayName}"`,
        );
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.debug(
          `[getPublishedHomepage] Skipping schema "${schema}" due to lookup error: ${message}`,
        );
      }
    }

    this.logger.debug(`[getPublishedHomepage] No matching talent found for path "${path}"`);
    return null;
  }

  async getPublishedHomepageOrThrow(path: string): Promise<PublicHomepageData> {
    const data = await this.getPublishedHomepage(path);

    if (!data) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found or not published',
      });
    }

    return data;
  }

  async getPublishedHomepageByCodes(
    tenantCode: string,
    talentCode: string,
  ): Promise<PublicHomepageData | null> {
    const tenantSchema =
      await this.publicHomepageReadRepository.findActiveTenantSchemaByCode(tenantCode);

    if (!tenantSchema) {
      return null;
    }

    const talent =
      await this.publicHomepageReadRepository.findPublishedTalentByCode(tenantSchema, talentCode);

    if (!talent) {
      return null;
    }

    return this.getPublishedHomepageForTalent(tenantSchema, talent);
  }

  async getPublishedHomepageByCodesOrThrow(
    tenantCode: string,
    talentCode: string,
  ): Promise<PublicHomepageData> {
    const data = await this.getPublishedHomepageByCodes(tenantCode, talentCode);

    if (!data) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found or not published',
      });
    }

    return data;
  }

  async getPublishedHomepageByDomain(domain: string): Promise<PublicHomepageData | null> {
    const mapping = await this.domainLookupService.lookupDomain(domain);

    if (!mapping) {
      return null;
    }

    const talent = await this.publicHomepageReadRepository.findPublishedTalentById(
      mapping.tenantSchema,
      mapping.talentId,
    );

    if (!talent) {
      return null;
    }

    return this.getPublishedHomepageForTalent(mapping.tenantSchema, talent);
  }

  private async getPublishedHomepageForTalent(
    schema: string,
    talent: PublicHomepageTalentRecord,
  ): Promise<PublicHomepageData | null> {
    const homepage = await this.publicHomepageReadRepository.findPublishedHomepageRecord(
      schema,
      talent.id,
    );

    this.logger.debug(
      `[getPublishedHomepageForTalent] Homepage record ${homepage ? 'found' : 'missing'} for talent "${talent.displayName}"`,
    );

    if (!hasPublishedHomepage(homepage)) {
      return null;
    }

    const version = await this.publicHomepageReadRepository.findHomepageVersion(
      schema,
      homepage.publishedVersionId,
    );

    if (!version) {
      return null;
    }

    const contentRecord =
      typeof version.content === 'object' && version.content !== null ? version.content : {};
    const themeRecord =
      typeof version.theme === 'object' && version.theme !== null ? version.theme : {};

    this.logger.debug(
      `[getPublishedHomepageForTalent] Version content keys: ${Object.keys(contentRecord).join(', ')}`,
    );
    this.logger.debug(
      `[getPublishedHomepageForTalent] Version content.components length: ${getHomepageComponentCount(version.content) ?? 'N/A'}`,
    );
    this.logger.debug(
      `[getPublishedHomepageForTalent] Version theme keys: ${Object.keys(themeRecord).join(', ')}`,
    );

    return buildPublicHomepageData({
      talent,
      homepage,
      version,
    });
  }
}
