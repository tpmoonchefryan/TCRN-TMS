// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  buildFixedCustomDomainPaths,
  buildVerificationTxtRecord,
  normalizeCustomDomain,
  type TalentCustomDomainConfig,
  type TalentCustomDomainPaths,
  type TalentCustomDomainSetResult,
  type TalentCustomDomainVerificationResult,
} from '../domain/talent-custom-domain.policy';
import { TalentCustomDomainRepository } from '../infrastructure/talent-custom-domain.repository';

@Injectable()
export class TalentCustomDomainService {
  constructor(
    private readonly talentCustomDomainRepository: TalentCustomDomainRepository,
  ) {}

  getCustomDomainConfig(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentCustomDomainConfig | null> {
    return this.talentCustomDomainRepository.getCustomDomainConfig(
      talentId,
      tenantSchema,
    ).then((config) =>
      config
        ? {
            ...config,
            ...buildFixedCustomDomainPaths(),
          }
        : null,
    );
  }

  async setCustomDomain(
    talentId: string,
    tenantSchema: string,
    customDomain: string | null,
  ): Promise<TalentCustomDomainSetResult> {
    if (!customDomain) {
      const removed = await this.talentCustomDomainRepository.clearCustomDomain(
        talentId,
        tenantSchema,
      );
      if (!removed) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Talent not found',
        });
      }

      return { customDomain: null, token: null, txtRecord: null };
    }

    const normalizedDomain = normalizeCustomDomain(customDomain);
    const existingTalentId =
      await this.talentCustomDomainRepository.findTalentIdByCustomDomain(
        tenantSchema,
        normalizedDomain,
        talentId,
      );

    if (existingTalentId) {
      throw new BadRequestException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Domain already in use by another talent',
      });
    }

    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const txtRecord = buildVerificationTxtRecord(token);
    const updated = await this.talentCustomDomainRepository.setCustomDomain(
      talentId,
      tenantSchema,
      normalizedDomain,
      token,
    );

    if (!updated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    return { customDomain: normalizedDomain, token, txtRecord };
  }

  async verifyCustomDomain(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentCustomDomainVerificationResult> {
    const config = await this.getCustomDomainConfig(talentId, tenantSchema);

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (!config.customDomain) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No custom domain set',
      });
    }

    if (!config.customDomainVerificationToken) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message:
          'No verification token generated. Please set the custom domain first.',
      });
    }

    try {
      const { promises: dns } = await import('dns');
      const records = await dns.resolveTxt(`_tcrn-verify.${config.customDomain}`);
      const flatRecords = records.flat();
      const expectedRecord = buildVerificationTxtRecord(
        config.customDomainVerificationToken,
      );
      const found = flatRecords.some((record) => record === expectedRecord);

      if (found) {
        await this.talentCustomDomainRepository.markCustomDomainVerified(
          talentId,
          tenantSchema,
        );

        return { verified: true, message: 'Domain verified successfully' };
      }

      return {
        verified: false,
        message: `TXT record not found. Expected: ${expectedRecord}`,
      };
    } catch {
      return {
        verified: false,
        message:
          'DNS lookup failed. Please ensure the TXT record is properly configured.',
      };
    }
  }

  async updateServicePaths(
    talentId: string,
    tenantSchema: string,
    _paths: {
      homepageCustomPath?: string;
      marshmallowCustomPath?: string;
    },
  ): Promise<TalentCustomDomainPaths> {
    const config = await this.talentCustomDomainRepository.getCustomDomainConfig(
      talentId,
      tenantSchema,
    );

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    return buildFixedCustomDomainPaths();
  }

  async updateSslMode(
    talentId: string,
    tenantSchema: string,
    sslMode: 'auto' | 'self_hosted' | 'cloudflare',
  ): Promise<{ customDomainSslMode: string }> {
    const result = await this.talentCustomDomainRepository.updateSslMode(
      talentId,
      tenantSchema,
      sslMode,
    );

    if (!result) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    return result;
  }
}
