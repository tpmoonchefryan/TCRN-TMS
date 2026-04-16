// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  createDefaultInheritedFrom,
  DEFAULT_SETTINGS,
  getScopeName,
  type ScopeOwnSettingsRecord,
  type ScopeSettings,
  type SettingsScopeRef,
  type SettingsScopeType,
} from '../domain/settings.policy';
import { SettingsRepository } from '../infrastructure/settings.repository';

@Injectable()
export class SettingsApplicationService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

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

    const newSettings = { ...(current?.settings ?? {}), ...updates };
    const newVersion = (current?.version ?? 0) + 1;

    await this.saveScopeSettings(tenantSchema, scopeType, scopeId, newSettings, newVersion, userId);

    return this.getEffectiveSettings(tenantSchema, scopeType, scopeId);
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
