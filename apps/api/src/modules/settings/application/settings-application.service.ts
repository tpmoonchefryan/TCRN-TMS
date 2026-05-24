// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  createArtistLifecycleFlowSchema,
  ErrorCodes,
  normalizeSupportedUiLocale,
  type ArtistLifecycleFlow,
} from '@tcrn/shared';

import {
  EMAIL_SENDER_PREFERENCES_SETTINGS_KEY,
  EMAIL_SENDING_DOMAINS_SETTINGS_KEY,
} from '../../email/domain/tenant-sending-domain.policy';
import {
  ARTIST_LIFECYCLE_FLOW_SETTINGS_KEY,
  buildTenantTurnstileSettingsResponse,
  canUpdateSettingsKeyThroughGeneralSettings,
  createDefaultInheritedFrom,
  DEFAULT_SETTINGS,
  getScopeName,
  hasStoredTenantTurnstileSettings,
  isTenantOnlySettingsKey,
  normalizeStoredArtistLifecycleFlow,
  normalizeNullableSettingString,
  readStoredTenantTurnstileSettings,
  type ArtistLifecycleFlowSettingsResponse,
  type ScopeOwnSettingsRecord,
  type ScopeSettings,
  type SettingsScopeRef,
  type SettingsScopeType,
  TENANT_TURNSTILE_SETTINGS_KEY,
  type TenantTurnstileRuntimeConfig,
  type TenantTurnstileSettingsResponse,
  type UpdateTenantTurnstileSettingsInput,
} from '../domain/settings.policy';
import { SettingsRepository } from '../infrastructure/settings.repository';
import { SettingsSecretCryptoService } from '../infrastructure/settings-secret-crypto.service';

const GENERAL_SETTINGS_HIDDEN_KEYS = [
  EMAIL_SENDING_DOMAINS_SETTINGS_KEY,
  EMAIL_SENDER_PREFERENCES_SETTINGS_KEY,
  ARTIST_LIFECYCLE_FLOW_SETTINGS_KEY,
  TENANT_TURNSTILE_SETTINGS_KEY,
] as const;

const GENERAL_SETTINGS_RETIRED_KEYS = [
  'allowCustomHomepage',
] as const;

@Injectable()
export class SettingsApplicationService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    @Optional() private readonly secretCrypto?: SettingsSecretCryptoService,
    @Optional() private readonly configService?: NestConfigService,
  ) {}

  async getEffectiveSettings(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
  ): Promise<ScopeSettings> {
    const chain = await this.buildInheritanceChain(tenantSchema, scopeType, scopeId);
    const mergedSettings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    const inheritedFrom = createDefaultInheritedFrom();
    const overrides: string[] = [];
    let currentVersion = 1;

    for (const scope of chain) {
      const scopeSettings = await this.getScopeOwnSettings(tenantSchema, scope.type, scope.id);

      if (!scopeSettings) {
        continue;
      }

      for (const [key, value] of Object.entries(scopeSettings.settings)) {
        if (value === undefined || value === null) {
          continue;
        }

        mergedSettings[key] = value;

        if (scope.type === scopeType && scope.id === scopeId) {
          overrides.push(key);
        } else {
          inheritedFrom[key] = getScopeName(scope.type);
        }
      }

      if (scope.type === scopeType && scope.id === scopeId) {
        currentVersion = scopeSettings.version;
      }
    }

    for (const key of overrides) {
      delete inheritedFrom[key];
    }

    for (const key of GENERAL_SETTINGS_HIDDEN_KEYS) {
      delete mergedSettings[key];
      delete inheritedFrom[key];
      const overrideIndex = overrides.indexOf(key);

      if (overrideIndex >= 0) {
        overrides.splice(overrideIndex, 1);
      }
    }

    for (const key of GENERAL_SETTINGS_RETIRED_KEYS) {
      delete mergedSettings[key];
      delete inheritedFrom[key];
      const overrideIndex = overrides.indexOf(key);

      if (overrideIndex >= 0) {
        overrides.splice(overrideIndex, 1);
      }
    }

    return {
      scopeType,
      scopeId,
      settings: mergedSettings,
      overrides,
      inheritedFrom,
      version: currentVersion,
    };
  }

  async updateSettings(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
    updates: Record<string, unknown>,
    version: number,
    userId: string,
  ): Promise<ScopeSettings> {
    await this.validateScopeExists(tenantSchema, scopeType, scopeId);

    const current = await this.getScopeOwnSettings(tenantSchema, scopeType, scopeId);

    if (current && current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: 'Settings have been modified by another user',
      });
    }

    this.assertGeneralSettingsUpdateAllowed(scopeType, updates);
    const normalizedUpdates = this.normalizeSettingsUpdates(updates);
    const newSettings = { ...(current?.settings ?? {}), ...normalizedUpdates };
    const newVersion = (current?.version ?? 0) + 1;

    await this.saveScopeSettings(tenantSchema, scopeType, scopeId, newSettings, newVersion, userId);

    return this.getEffectiveSettings(tenantSchema, scopeType, scopeId);
  }

  async getArtistLifecycleFlow(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
  ): Promise<ArtistLifecycleFlowSettingsResponse> {
    await this.validateScopeExists(tenantSchema, scopeType, scopeId);

    const tenant = await this.settingsRepository.findTenantBySchema(tenantSchema);
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const stageCatalog = await this.settingsRepository.listArtistStageCatalog(
      tenantSchema,
    );
    const storedFlow = normalizeStoredArtistLifecycleFlow(
      tenant.settings?.[ARTIST_LIFECYCLE_FLOW_SETTINGS_KEY],
    );
    const parsed = createArtistLifecycleFlowSchema({
      stageCatalog,
    }).safeParse(storedFlow);

    return {
      scopeType,
      scopeId,
      flow: parsed.success ? parsed.data : storedFlow,
      inheritedFrom: 'tenant',
      validationIssues: parsed.success
        ? []
        : parsed.error.issues.map((issue) => ({
            message: issue.message,
            path: issue.path.map((segment) => String(segment)),
          })),
      version: 1,
      writable: scopeType === 'tenant',
    };
  }

  async updateArtistLifecycleFlow(
    tenantSchema: string,
    flow: ArtistLifecycleFlow,
  ): Promise<ArtistLifecycleFlowSettingsResponse> {
    const tenant = await this.settingsRepository.findTenantBySchema(tenantSchema);
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const stageCatalog = await this.settingsRepository.listArtistStageCatalog(
      tenantSchema,
    );
    let normalizedFlow: ArtistLifecycleFlow;

    try {
      normalizedFlow = createArtistLifecycleFlowSchema({
        stageCatalog,
      }).parse(flow);
    } catch (error) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Artist lifecycle flow is invalid',
        details: error instanceof Error ? { reason: error.message } : undefined,
      });
    }
    const nextSettings = {
      ...(tenant.settings ?? {}),
      [ARTIST_LIFECYCLE_FLOW_SETTINGS_KEY]: normalizedFlow,
    };

    await this.settingsRepository.updateTenantSettings(tenantSchema, nextSettings);

    return {
      scopeType: 'tenant',
      scopeId: null,
      flow: normalizedFlow,
      inheritedFrom: 'tenant',
      validationIssues: [],
      version: 1,
      writable: true,
    };
  }

  async getTenantTurnstileSettings(
    tenantSchema: string,
  ): Promise<TenantTurnstileSettingsResponse> {
    const resolved = await this.resolveTenantTurnstileRuntimeConfig(tenantSchema);

    return buildTenantTurnstileSettingsResponse({
      source: resolved.source,
      nodeEnv: this.configService?.get<string>('NODE_ENV'),
      tenantSiteKey: resolved.tenantSiteKey,
      effectiveSiteKey: resolved.siteKey,
      effectiveSecretKey: resolved.secretKey,
      tenantSecretKeyConfigured: resolved.tenantSecretKeyConfigured,
    });
  }

  async updateTenantTurnstileSettings(
    tenantSchema: string,
    input: UpdateTenantTurnstileSettingsInput,
  ): Promise<TenantTurnstileSettingsResponse> {
    const tenant = await this.settingsRepository.findTenantBySchema(tenantSchema);

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const currentSettings = tenant.settings ?? {};
    const currentTurnstile = readStoredTenantTurnstileSettings(currentSettings);
    const secretKeyMutation = input.secretKeyMutation ?? 'keep';
    const submittedSecretKey = normalizeNullableSettingString(input.secretKey);

    if (submittedSecretKey && secretKeyMutation !== 'replace') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Secret key value is only accepted when replacing the secret key',
      });
    }

    let nextSecretKeyEncrypted = currentTurnstile.secretKeyEncrypted;
    if (secretKeyMutation === 'replace') {
      if (!submittedSecretKey) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Secret key replacement requires a non-empty value',
        });
      }

      nextSecretKeyEncrypted = this.requireSecretCrypto().encrypt(submittedSecretKey);
    } else if (secretKeyMutation === 'clear') {
      nextSecretKeyEncrypted = null;
    }

    const nextTurnstile = {
      siteKey: Object.prototype.hasOwnProperty.call(input, 'siteKey')
        ? normalizeNullableSettingString(input.siteKey)
        : currentTurnstile.siteKey,
      secretKeyEncrypted: nextSecretKeyEncrypted,
      updatedAt: new Date().toISOString(),
    };

    const nextSettings = {
      ...currentSettings,
      [TENANT_TURNSTILE_SETTINGS_KEY]: nextTurnstile,
    };

    await this.settingsRepository.updateTenantSettings(tenantSchema, nextSettings);

    return this.getTenantTurnstileSettings(tenantSchema);
  }

  async resolveTenantTurnstileRuntimeConfig(
    tenantSchema: string,
  ): Promise<TenantTurnstileRuntimeConfig> {
    const tenant = await this.settingsRepository.findTenantBySchema(tenantSchema);
    const envSiteKey = normalizeNullableSettingString(this.configService?.get<string>('TURNSTILE_SITE_KEY'));
    const envSecretKey = normalizeNullableSettingString(this.configService?.get<string>('TURNSTILE_SECRET_KEY'));

    if (!tenant) {
      return {
        source: envSiteKey || envSecretKey ? 'environment' : 'none',
        siteKey: envSiteKey,
        secretKey: envSecretKey,
        tenantSiteKey: null,
        tenantSecretKeyConfigured: false,
      };
    }

    const stored = readStoredTenantTurnstileSettings(tenant.settings ?? {});

    if (hasStoredTenantTurnstileSettings(stored)) {
      const tenantSecretKey = stored.secretKeyEncrypted
        ? this.secretCrypto?.decryptStoredSecret(stored.secretKeyEncrypted) ?? null
        : null;

      return {
        source: 'tenant',
        siteKey: stored.siteKey,
        secretKey: tenantSecretKey,
        tenantSiteKey: stored.siteKey,
        tenantSecretKeyConfigured: Boolean(tenantSecretKey),
      };
    }

    return {
      source: envSiteKey || envSecretKey ? 'environment' : 'none',
      siteKey: envSiteKey,
      secretKey: envSecretKey,
      tenantSiteKey: null,
      tenantSecretKeyConfigured: false,
    };
  }

  private normalizeSettingsUpdates(updates: Record<string, unknown>): Record<string, unknown> {
    const normalizedUpdates = { ...updates };

    if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'defaultLanguage')) {
      const normalizedDefaultLanguage = typeof normalizedUpdates.defaultLanguage === 'string'
        ? normalizeSupportedUiLocale(normalizedUpdates.defaultLanguage)
        : null;

      if (!normalizedDefaultLanguage) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'defaultLanguage must be a supported UI locale',
        });
      }

      normalizedUpdates.defaultLanguage = normalizedDefaultLanguage;
    }

    return normalizedUpdates;
  }

  private assertGeneralSettingsUpdateAllowed(
    scopeType: SettingsScopeType,
    updates: Record<string, unknown>,
  ): void {
    for (const key of Object.keys(updates)) {
      if (!canUpdateSettingsKeyThroughGeneralSettings(key)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `${key} must be updated through its dedicated settings workflow`,
        });
      }

      if (scopeType !== 'tenant' && isTenantOnlySettingsKey(key)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `${key} is tenant-only and cannot be updated at ${scopeType} scope`,
        });
      }
    }
  }

  private requireSecretCrypto(): SettingsSecretCryptoService {
    if (this.secretCrypto) {
      return this.secretCrypto;
    }

    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Settings secret encryption service is unavailable',
    });
  }

  async resetToInherited(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
    field: string,
    userId: string,
  ): Promise<ScopeSettings> {
    if (scopeType === 'tenant') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Tenant settings cannot be reset to inherited',
      });
    }

    const current = await this.getScopeOwnSettings(tenantSchema, scopeType, scopeId);

    if (!current) {
      return this.getEffectiveSettings(tenantSchema, scopeType, scopeId);
    }

    const newSettings = { ...current.settings };
    delete newSettings[field];

    await this.saveScopeSettings(
      tenantSchema,
      scopeType,
      scopeId,
      newSettings,
      current.version + 1,
      userId,
    );

    return this.getEffectiveSettings(tenantSchema, scopeType, scopeId);
  }

  private async buildInheritanceChain(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
  ): Promise<SettingsScopeRef[]> {
    const chain: SettingsScopeRef[] = [{ type: 'tenant', id: null }];

    if (scopeType === 'tenant') {
      return chain;
    }

    if (scopeType === 'subsidiary') {
      const scopedId = this.requireScopeId(scopeType, scopeId);
      const subsidiaryChain = await this.getSubsidiaryChain(tenantSchema, scopedId);
      for (const subsidiaryId of subsidiaryChain) {
        chain.push({ type: 'subsidiary', id: subsidiaryId });
      }
      return chain;
    }

    const scopedId = this.requireScopeId(scopeType, scopeId);
    const talent = await this.settingsRepository.findTalentById(tenantSchema, scopedId);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (talent.subsidiaryId) {
      const subsidiaryChain = await this.getSubsidiaryChain(tenantSchema, talent.subsidiaryId);
      for (const subsidiaryId of subsidiaryChain) {
        chain.push({ type: 'subsidiary', id: subsidiaryId });
      }
    }

    chain.push({ type: 'talent', id: scopedId });
    return chain;
  }

  private async getSubsidiaryChain(
    tenantSchema: string,
    subsidiaryId: string,
  ): Promise<string[]> {
    const subsidiary = await this.settingsRepository.findSubsidiaryById(tenantSchema, subsidiaryId);

    if (!subsidiary) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }

    const codes = subsidiary.path.split('/').filter(Boolean);

    if (codes.length === 0) {
      return [subsidiaryId];
    }

    const subsidiaries = await this.settingsRepository.listSubsidiariesByCodes(tenantSchema, codes);
    return subsidiaries.map((record) => record.id);
  }

  private async getScopeOwnSettings(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
  ): Promise<ScopeOwnSettingsRecord | null> {
    if (scopeType === 'tenant') {
      const tenant = await this.settingsRepository.findTenantBySchema(tenantSchema);

      if (!tenant) {
        return null;
      }

      return {
        settings: tenant.settings ?? {},
        version: 1,
      };
    }

    if (scopeType === 'subsidiary') {
      const scopedId = this.requireScopeId(scopeType, scopeId);
      const subsidiary = await this.settingsRepository.findSubsidiaryById(tenantSchema, scopedId);

      if (!subsidiary) {
        return null;
      }

      return this.settingsRepository.findScopeSettingsRecord(tenantSchema, scopeType, scopedId);
    }

    const scopedId = this.requireScopeId(scopeType, scopeId);
    const talent = await this.settingsRepository.findTalentById(tenantSchema, scopedId);

    if (!talent) {
      return null;
    }

    return {
      settings: talent.settings ?? {},
      version: talent.version,
    };
  }

  private async saveScopeSettings(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
    settings: Record<string, unknown>,
    version: number,
    userId: string,
  ): Promise<void> {
    if (scopeType === 'tenant') {
      await this.settingsRepository.updateTenantSettings(tenantSchema, settings);
      return;
    }

    if (scopeType === 'talent') {
      const scopedId = this.requireScopeId(scopeType, scopeId);
      await this.settingsRepository.updateTalentSettings({
        tenantSchema,
        talentId: scopedId,
        settings,
        version,
        userId,
      });
      return;
    }

    await this.settingsRepository.upsertScopeSettings({
      tenantSchema,
      scopeType,
      scopeId,
      settings,
      version,
      userId,
    });
  }

  private async validateScopeExists(
    tenantSchema: string,
    scopeType: SettingsScopeType,
    scopeId: string | null,
  ): Promise<void> {
    if (scopeType === 'tenant') {
      const tenant = await this.settingsRepository.findTenantBySchema(tenantSchema);

      if (!tenant) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Tenant not found',
        });
      }

      return;
    }

    if (scopeType === 'subsidiary') {
      const scopedId = this.requireScopeId(scopeType, scopeId);
      const subsidiary = await this.settingsRepository.findSubsidiaryById(tenantSchema, scopedId);

      if (!subsidiary) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Subsidiary not found',
        });
      }

      return;
    }

    const scopedId = this.requireScopeId(scopeType, scopeId);
    const talent = await this.settingsRepository.findTalentById(tenantSchema, scopedId);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }
  }

  private requireScopeId(
    scopeType: Exclude<SettingsScopeType, 'tenant'>,
    scopeId: string | null,
  ): string {
    if (scopeId) {
      return scopeId;
    }

    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: `${scopeType} scope requires a scopeId`,
    });
  }
}

export type { ScopeSettings } from '../domain/settings.policy';
