// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  buildFixedCustomDomainPaths,
  buildTalentEffectiveCustomDomains,
  buildVerificationTxtRecord,
  type CustomDomainOwnerType,
  type CustomDomainSslMode,
  isValidCustomDomainHostname,
  normalizeCustomDomain,
  type TalentCustomDomainBindingMutationInput,
  type TalentCustomDomainBindingMutationResult,
  type TalentCustomDomainBindingRecord,
  type TalentCustomDomainConfig,
  type TalentCustomDomainPaths,
  type TalentCustomDomainSelectionResult,
  type TalentCustomDomainSetResult,
  type TalentCustomDomainVerificationResult,
} from '../domain/talent-custom-domain.policy';
import { TalentCustomDomainRepository } from '../infrastructure/talent-custom-domain.repository';

@Injectable()
export class TalentCustomDomainService {
  constructor(
    private readonly talentCustomDomainRepository: TalentCustomDomainRepository,
  ) {}


  private async generateVerificationToken(): Promise<string> {
    const { randomBytes } = await import('crypto');
    return randomBytes(32).toString('hex');
  }

  private assertValidBindingInput(input: TalentCustomDomainBindingMutationInput): void {
    if (input.ownerType === 'tenant' && input.ownerId !== null) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Tenant-owned custom domains must not include ownerId',
      });
    }

    if (input.ownerType !== 'tenant' && !input.ownerId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Subsidiary- and talent-owned custom domains require ownerId',
      });
    }

    if (!isValidCustomDomainHostname(input.hostname)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Custom-domain hostname is invalid',
      });
    }
  }

  private async ensureBindingOwnerExists(
    tenantSchema: string,
    ownerType: CustomDomainOwnerType,
    ownerId: string | null,
  ): Promise<void> {
    const ownerExists = await this.talentCustomDomainRepository.customDomainOwnerExists(
      tenantSchema,
      ownerType,
      ownerId,
    );

    if (!ownerExists) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Custom-domain owner is outside the current tenant scope',
      });
    }
  }

  private async ensureHostnameAvailable(
    hostname: string,
    excludeDomainId: string | null,
  ): Promise<void> {
    const [bindingOwner, legacyOwner] = await Promise.all([
      this.talentCustomDomainRepository.findCustomDomainBindingByHostname(
        hostname,
        excludeDomainId,
      ),
      this.talentCustomDomainRepository.findLegacyCustomDomainOwner(hostname),
    ]);

    if (bindingOwner || legacyOwner) {
      throw new BadRequestException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Domain already in use',
      });
    }
  }

  private async verifyBindingDnsRecord(
    binding: TalentCustomDomainBindingRecord,
  ): Promise<TalentCustomDomainVerificationResult> {
    if (!binding.customDomainVerificationToken) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No verification token generated for this domain binding',
      });
    }

    try {
      const { promises: dns } = await import('dns');
      const records = await dns.resolveTxt(`_tcrn-verify.${binding.hostname}`);
      const flatRecords = records.flat();
      const expectedRecord = buildVerificationTxtRecord(
        binding.customDomainVerificationToken,
      );
      const found = flatRecords.some((record) => record === expectedRecord);

      if (found) {
        return { verified: true, message: 'Domain binding verified successfully' };
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

  async getCustomDomainConfig(
    talentId: string,
    tenantSchema: string,
  ): Promise<TalentCustomDomainConfig | null> {
    const legacyConfig =
      await this.talentCustomDomainRepository.getCustomDomainConfig(
        talentId,
        tenantSchema,
      );

    if (!legacyConfig) {
      return null;
    }

    const [bindingRecords, selectedInheritedDomainIds] = await Promise.all([
      this.talentCustomDomainRepository.listCustomDomainBindingsForTalent(
        tenantSchema,
        legacyConfig,
      ),
      this.talentCustomDomainRepository.listSelectedInheritedDomainIds(
        tenantSchema,
        legacyConfig.talentId,
      ),
    ]);
    const domains = buildTalentEffectiveCustomDomains({
      legacyConfig,
      bindingRecords,
      selectedInheritedDomainIds,
    });

    const fixedPaths = buildFixedCustomDomainPaths();

    return {
      customDomain: legacyConfig.customDomain,
      customDomainVerified: legacyConfig.customDomainVerified,
      customDomainVerificationToken:
        legacyConfig.customDomainVerificationToken,
      customDomainSslMode: legacyConfig.customDomainSslMode,
      ...fixedPaths,
      domains,
      inheritedDomains: domains.filter((domain) => domain.inherited),
      selectedInheritedDomainIds,
    };
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
    const [existingTalentId, existingBinding] = await Promise.all([
      this.talentCustomDomainRepository.findTalentIdByCustomDomain(
        tenantSchema,
        normalizedDomain,
        talentId,
      ),
      this.talentCustomDomainRepository.findCustomDomainBindingByHostname(
        normalizedDomain,
      ),
    ]);

    if (existingTalentId || existingBinding) {
      throw new BadRequestException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Domain already in use',
      });
    }

    const token = await this.generateVerificationToken();
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


  async createCustomDomainBinding(
    tenantSchema: string,
    input: {
      ownerType: CustomDomainOwnerType;
      ownerId?: string | null;
      hostname: string;
      customDomainSslMode?: CustomDomainSslMode;
      isActive?: boolean;
    },
  ): Promise<TalentCustomDomainBindingMutationResult> {
    const normalizedInput: TalentCustomDomainBindingMutationInput = {
      ownerType: input.ownerType,
      ownerId: input.ownerType === 'tenant' ? null : input.ownerId ?? null,
      hostname: normalizeCustomDomain(input.hostname),
      customDomainSslMode: input.customDomainSslMode ?? 'auto',
      isActive: input.isActive ?? true,
    };

    this.assertValidBindingInput(normalizedInput);
    await this.ensureBindingOwnerExists(
      tenantSchema,
      normalizedInput.ownerType,
      normalizedInput.ownerId,
    );
    await this.ensureHostnameAvailable(normalizedInput.hostname, null);

    const token = await this.generateVerificationToken();
    const domain = await this.talentCustomDomainRepository.createCustomDomainBinding(
      tenantSchema,
      normalizedInput,
      token,
    );

    if (!domain) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    return {
      domain,
      token,
      txtRecord: buildVerificationTxtRecord(token),
    };
  }

  async updateCustomDomainBinding(
    tenantSchema: string,
    domainId: string,
    input: {
      ownerType: CustomDomainOwnerType;
      ownerId?: string | null;
      hostname: string;
      customDomainSslMode?: CustomDomainSslMode;
      isActive?: boolean;
    },
  ): Promise<TalentCustomDomainBindingMutationResult> {
    const current = await this.talentCustomDomainRepository.findCustomDomainBindingById(
      tenantSchema,
      domainId,
    );

    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Custom-domain binding not found',
      });
    }

    const normalizedInput: TalentCustomDomainBindingMutationInput = {
      ownerType: input.ownerType,
      ownerId: input.ownerType === 'tenant' ? null : input.ownerId ?? null,
      hostname: normalizeCustomDomain(input.hostname),
      customDomainSslMode: input.customDomainSslMode ?? current.customDomainSslMode,
      isActive: input.isActive ?? current.isActive,
    };
    const hostnameChanged = normalizedInput.hostname !== current.hostname;

    this.assertValidBindingInput(normalizedInput);
    await this.ensureBindingOwnerExists(
      tenantSchema,
      normalizedInput.ownerType,
      normalizedInput.ownerId,
    );
    if (hostnameChanged) {
      await this.ensureHostnameAvailable(normalizedInput.hostname, domainId);
    }

    const token = hostnameChanged ? await this.generateVerificationToken() : null;
    const domain = await this.talentCustomDomainRepository.updateCustomDomainBinding(
      tenantSchema,
      domainId,
      normalizedInput,
      token,
    );

    if (!domain) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Custom-domain binding not found',
      });
    }

    return {
      domain,
      token,
      txtRecord: token ? buildVerificationTxtRecord(token) : null,
    };
  }

  async verifyCustomDomainBinding(
    tenantSchema: string,
    domainId: string,
  ): Promise<TalentCustomDomainVerificationResult> {
    const binding = await this.talentCustomDomainRepository.findCustomDomainBindingById(
      tenantSchema,
      domainId,
    );

    if (!binding) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Custom-domain binding not found',
      });
    }

    const result = await this.verifyBindingDnsRecord(binding);

    if (result.verified) {
      await this.talentCustomDomainRepository.markCustomDomainBindingVerified(
        tenantSchema,
        domainId,
      );
    }

    return result;
  }

  async setSelectedInheritedDomainIds(
    talentId: string,
    tenantSchema: string,
    domainIds: string[],
  ): Promise<TalentCustomDomainSelectionResult> {
    const config = await this.getCustomDomainConfig(talentId, tenantSchema);

    if (!config) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const uniqueDomainIds = Array.from(new Set(domainIds));
    const inheritedById = new Map(config.inheritedDomains.map((domain) => [domain.id, domain]));

    for (const domainId of uniqueDomainIds) {
      const domain = inheritedById.get(domainId);

      if (!domain) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Selected inherited domain is not available for this talent',
        });
      }

      if (!domain.customDomainVerified || !domain.isActive) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Only verified active inherited domains can be selected',
        });
      }
    }

    await this.talentCustomDomainRepository.replaceSelectedInheritedDomainIds(
      tenantSchema,
      talentId,
      uniqueDomainIds,
    );

    const updated = await this.getCustomDomainConfig(talentId, tenantSchema);

    if (!updated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    return updated;
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
