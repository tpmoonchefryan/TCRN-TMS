// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import { isMissingDatabaseRelationError } from '../../../platform/persistence/database-error.util';
import {
  buildFixedCustomDomainPaths,
  buildTalentEffectiveCustomDomains,
  buildVerificationTxtRecord,
  type CustomDomainOwnerType,
  type CustomDomainSslMode,
  isValidCustomDomainHostname,
  normalizeCustomDomain,
  type TalentCustomDomainBindingCatalogItem,
  type TalentCustomDomainBindingListOptions,
  type TalentCustomDomainBindingListResult,
  type TalentCustomDomainBindingMutationInput,
  type TalentCustomDomainBindingMutationResult,
  type TalentCustomDomainBindingRecord,
  type TalentCustomDomainConfig,
  type TalentCustomDomainPaths,
  type TalentCustomDomainSelectionResult,
  type TalentCustomDomainSetResult,
  type TalentCustomDomainVerificationResult,
  type TalentLegacyCustomDomainConfig,
} from '../domain/talent-custom-domain.policy';
import { TalentCustomDomainRepository } from '../infrastructure/talent-custom-domain.repository';

@Injectable()
export class TalentCustomDomainService {
  private readonly logger = new Logger(TalentCustomDomainService.name);

  constructor(
    private readonly talentCustomDomainRepository: TalentCustomDomainRepository,
  ) {}

  private isMissingCustomDomainRegistryRelation(error: unknown): boolean {
    return isMissingDatabaseRelationError(error, [
      'public.custom_domain_binding',
      'custom_domain_binding',
      'public.custom_domain_talent_selection',
      'custom_domain_talent_selection',
    ]);
  }

  private isMissingCustomDomainSelectionRelation(error: unknown): boolean {
    return isMissingDatabaseRelationError(error, [
      'public.custom_domain_talent_selection',
      'custom_domain_talent_selection',
    ]);
  }

  private createCustomDomainStorageUnavailableException(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      code: ErrorCodes.SYS_CUSTOM_DOMAIN_REGISTRY_UNAVAILABLE,
      message: 'Custom-domain routing is temporarily unavailable. Try again later or contact an administrator.',
    });
  }

  private async ensureCustomDomainRegistryReady(): Promise<void> {
    const readiness = await this.talentCustomDomainRepository.getCustomDomainRegistryReadiness();

    if (!readiness.ready) {
      this.logger.warn(
        `Custom-domain registry is not ready for management operations: binding=${readiness.customDomainBinding}, selection=${readiness.customDomainTalentSelection}`,
      );
      throw this.createCustomDomainStorageUnavailableException();
    }
  }

  private async listCustomDomainBindingsForTalentOrEmpty(
    tenantSchema: string,
    legacyConfig: TalentLegacyCustomDomainConfig,
  ): Promise<TalentCustomDomainBindingRecord[]> {
    try {
      return await this.talentCustomDomainRepository.listCustomDomainBindingsForTalent(
        tenantSchema,
        legacyConfig,
      );
    } catch (error) {
      if (this.isMissingCustomDomainRegistryRelation(error)) {
        this.logger.warn(
          `Custom-domain binding registry is unavailable for tenant schema "${tenantSchema}"; returning legacy-only custom-domain config.`,
        );
        return [];
      }

      throw error;
    }
  }

  private async listSelectedInheritedDomainIdsOrEmpty(
    tenantSchema: string,
    talentId: string,
  ): Promise<string[]> {
    try {
      return await this.talentCustomDomainRepository.listSelectedInheritedDomainIds(
        tenantSchema,
        talentId,
      );
    } catch (error) {
      if (this.isMissingCustomDomainSelectionRelation(error)) {
        this.logger.warn(
          `Custom-domain inherited selection registry is unavailable for talent "${talentId}" in tenant schema "${tenantSchema}"; returning no inherited selections.`,
        );
        return [];
      }

      throw error;
    }
  }

  private async findCustomDomainBindingByHostnameOrNull(
    hostname: string,
    excludeDomainId: string | null = null,
  ): Promise<TalentCustomDomainBindingRecord | null> {
    try {
      return await this.talentCustomDomainRepository.findCustomDomainBindingByHostname(
        hostname,
        excludeDomainId,
      );
    } catch (error) {
      if (this.isMissingCustomDomainRegistryRelation(error)) {
        throw this.createCustomDomainStorageUnavailableException();
      }

      throw error;
    }
  }

  private buildCatalogItem(
    record: TalentCustomDomainBindingRecord,
    scopeType: CustomDomainOwnerType,
    scopeId: string | null,
    selectedInheritedDomainIds: Set<string>,
  ): TalentCustomDomainBindingCatalogItem {
    const inherited = scopeType === 'tenant'
      ? false
      : record.ownerType !== scopeType || record.ownerId !== scopeId;
    const routeMode = record.ownerType === 'talent'
      ? 'dedicated_talent'
      : 'scoped_talent_path';

    return {
      ...record,
      inherited,
      selected: inherited ? selectedInheritedDomainIds.has(record.id) : true,
      routeMode,
    };
  }


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
      this.findCustomDomainBindingByHostnameOrNull(hostname, excludeDomainId),
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
      this.listCustomDomainBindingsForTalentOrEmpty(
        tenantSchema,
        legacyConfig,
      ),
      this.listSelectedInheritedDomainIdsOrEmpty(
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

  async listCustomDomainBindings(
    tenantSchema: string,
    input: TalentCustomDomainBindingListOptions,
  ): Promise<TalentCustomDomainBindingListResult> {
    if (input.scopeType === 'tenant' && input.scopeId !== null) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Tenant custom-domain scope must not include scopeId',
      });
    }

    if (input.scopeType !== 'tenant' && !input.scopeId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Subsidiary and talent custom-domain scopes require scopeId',
      });
    }

    await this.ensureCustomDomainRegistryReady();
    await this.ensureBindingOwnerExists(
      tenantSchema,
      input.scopeType,
      input.scopeId,
    );

    let records: TalentCustomDomainBindingRecord[];
    try {
      records = await this.talentCustomDomainRepository.listCustomDomainBindingsForScope(
        tenantSchema,
        input,
      );
    } catch (error) {
      if (this.isMissingCustomDomainRegistryRelation(error)) {
        throw this.createCustomDomainStorageUnavailableException();
      }

      throw error;
    }

    let selectedInheritedDomainIds = new Set<string>();
    if (input.scopeType === 'talent' && input.scopeId) {
      selectedInheritedDomainIds = new Set(
        await this.listSelectedInheritedDomainIdsOrEmpty(
          tenantSchema,
          input.scopeId,
        ),
      );
    }

    return {
      domains: records.map((record) =>
        this.buildCatalogItem(
          record,
          input.scopeType,
          input.scopeId,
          selectedInheritedDomainIds,
        ),
      ),
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

    await this.ensureCustomDomainRegistryReady();
    const normalizedDomain = normalizeCustomDomain(customDomain);
    const [existingTalentId, existingBinding] = await Promise.all([
      this.talentCustomDomainRepository.findTalentIdByCustomDomain(
        tenantSchema,
        normalizedDomain,
        talentId,
      ),
      this.findCustomDomainBindingByHostnameOrNull(normalizedDomain),
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
    await this.ensureCustomDomainRegistryReady();
    await this.ensureBindingOwnerExists(
      tenantSchema,
      normalizedInput.ownerType,
      normalizedInput.ownerId,
    );
    await this.ensureHostnameAvailable(normalizedInput.hostname, null);

    const token = await this.generateVerificationToken();
    let domain: TalentCustomDomainBindingRecord | null;
    try {
      domain = await this.talentCustomDomainRepository.createCustomDomainBinding(
        tenantSchema,
        normalizedInput,
        token,
      );
    } catch (error) {
      if (this.isMissingCustomDomainRegistryRelation(error)) {
        throw this.createCustomDomainStorageUnavailableException();
      }

      throw error;
    }

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
    await this.ensureCustomDomainRegistryReady();

    let current: TalentCustomDomainBindingRecord | null;
    try {
      current = await this.talentCustomDomainRepository.findCustomDomainBindingById(
        tenantSchema,
        domainId,
      );
    } catch (error) {
      if (this.isMissingCustomDomainRegistryRelation(error)) {
        throw this.createCustomDomainStorageUnavailableException();
      }

      throw error;
    }

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
    let domain: TalentCustomDomainBindingRecord | null;
    try {
      domain = await this.talentCustomDomainRepository.updateCustomDomainBinding(
        tenantSchema,
        domainId,
        normalizedInput,
        token,
      );
    } catch (error) {
      if (this.isMissingCustomDomainRegistryRelation(error)) {
        throw this.createCustomDomainStorageUnavailableException();
      }

      throw error;
    }

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
    await this.ensureCustomDomainRegistryReady();

    let binding: TalentCustomDomainBindingRecord | null;
    try {
      binding = await this.talentCustomDomainRepository.findCustomDomainBindingById(
        tenantSchema,
        domainId,
      );
    } catch (error) {
      if (this.isMissingCustomDomainRegistryRelation(error)) {
        throw this.createCustomDomainStorageUnavailableException();
      }

      throw error;
    }

    if (!binding) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Custom-domain binding not found',
      });
    }

    const result = await this.verifyBindingDnsRecord(binding);

    if (result.verified) {
      try {
        await this.talentCustomDomainRepository.markCustomDomainBindingVerified(
          tenantSchema,
          domainId,
        );
      } catch (error) {
        if (this.isMissingCustomDomainRegistryRelation(error)) {
          throw this.createCustomDomainStorageUnavailableException();
        }

        throw error;
      }
    }

    return result;
  }

  async setSelectedInheritedDomainIds(
    talentId: string,
    tenantSchema: string,
    domainIds: string[],
  ): Promise<TalentCustomDomainSelectionResult> {
    await this.ensureCustomDomainRegistryReady();

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

    try {
      await this.talentCustomDomainRepository.replaceSelectedInheritedDomainIds(
        tenantSchema,
        talentId,
        uniqueDomainIds,
      );
    } catch (error) {
      if (this.isMissingCustomDomainSelectionRelation(error)) {
        throw this.createCustomDomainStorageUnavailableException();
      }

      throw error;
    }

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
