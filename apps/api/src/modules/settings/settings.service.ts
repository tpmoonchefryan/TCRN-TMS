// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

/**
 * Scope Settings Response
 */
export interface ScopeSettings {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  settings: Record<string, unknown>;
  overrides: string[];
  inheritedFrom: Record<string, string>;
  version: number;
}

/**
 * Default Settings
 * These are the base settings that all scopes inherit if not overridden
 */
const DEFAULT_SETTINGS: Record<string, unknown> = {
  defaultLanguage: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  currency: 'USD',
  customerImportEnabled: true,
  maxImportRows: 50000,
  totpRequiredForAll: false,
  allowCustomHomepage: true,
  allowMarshmallow: true,
  passwordPolicy: {
    minLength: 12,
    requireSpecial: true,
    maxAgeDays: 90,
  },
};

/**
 * Settings Service
 * Manages hierarchical settings with inheritance
 */
@Injectable()
export class SettingsService {
  /**
   * Get effective settings for a scope (with inheritance resolved)
   */
  async getEffectiveSettings(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null
  ): Promise<ScopeSettings> {
    // Build inheritance chain from bottom to top
    const chain = await this.buildInheritanceChain(tenantSchema, scopeType, scopeId);
    
    // Merge settings from top to bottom (tenant -> subsidiary -> talent)
    const mergedSettings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    const inheritedFrom: Record<string, string> = {};
    const overrides: string[] = [];
    
    // Initialize all fields as inherited from 'default'
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      inheritedFrom[key] = 'default';
    }
    
    // Get current scope's own settings
    let currentVersion = 1;
    let currentSettings: Record<string, unknown> = {};
    
    for (const scope of chain) {
      const scopeSettings = await this.getScopeOwnSettings(tenantSchema, scope.type, scope.id);
      
      if (scopeSettings) {
        // Merge scope settings into merged settings
        for (const [key, value] of Object.entries(scopeSettings.settings)) {
          if (value !== undefined && value !== null) {
            mergedSettings[key] = value;
            
            // Track where this setting came from
            if (scope.type === scopeType && scope.id === scopeId) {
              // Current scope - it's an override
              overrides.push(key);
            } else {
              // Parent scope - inherited
              inheritedFrom[key] = this.getScopeName(scope.type, scope.id);
            }
          }
        }
        
        // Track version for current scope
        if (scope.type === scopeType && scope.id === scopeId) {
          currentVersion = scopeSettings.version;
          currentSettings = scopeSettings.settings;
        }
      }
    }
    
    // Remove overridden fields from inheritedFrom
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

  /**
   * Update settings for a scope
   */
  async updateSettings(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null,
    updates: Record<string, unknown>,
    version: number,
    userId: string
  ): Promise<ScopeSettings> {
    // Validate scope exists
    await this.validateScopeExists(tenantSchema, scopeType, scopeId);
    
    // Get current settings
    const current = await this.getScopeOwnSettings(tenantSchema, scopeType, scopeId);
    
    // Check version for optimistic locking
    if (current && current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: 'Settings have been modified by another user',
      });
    }
    
    // Merge updates with existing settings
    const newSettings = { ...(current?.settings || {}), ...updates };
    const newVersion = (current?.version || 0) + 1;
    
    // Save settings based on scope type
    await this.saveScopeSettings(tenantSchema, scopeType, scopeId, newSettings, newVersion, userId);
    
    // Return updated effective settings
    return this.getEffectiveSettings(tenantSchema, scopeType, scopeId);
  }

  /**
   * Reset a field to inherited value
   */
  async resetToInherited(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null,
    field: string,
    userId: string
  ): Promise<ScopeSettings> {
    if (scopeType === 'tenant') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Tenant settings cannot be reset to inherited',
      });
    }
    
    // Get current settings
    const current = await this.getScopeOwnSettings(tenantSchema, scopeType, scopeId);
    if (!current) {
      // No settings to reset
      return this.getEffectiveSettings(tenantSchema, scopeType, scopeId);
    }
    
    // Remove the field from settings
    const newSettings = { ...current.settings };
    delete newSettings[field];
    
    // Save
    await this.saveScopeSettings(
      tenantSchema,
      scopeType,
      scopeId,
      newSettings,
      current.version + 1,
      userId
    );
    
    return this.getEffectiveSettings(tenantSchema, scopeType, scopeId);
  }

  /**
   * Build inheritance chain from tenant to current scope
   */
  private async buildInheritanceChain(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null
  ): Promise<Array<{ type: 'tenant' | 'subsidiary' | 'talent'; id: string | null }>> {
    const chain: Array<{ type: 'tenant' | 'subsidiary' | 'talent'; id: string | null }> = [];
    
    // Always start with tenant
    chain.push({ type: 'tenant', id: null });
    
    if (scopeType === 'tenant') {
      return chain;
    }
    
    if (scopeType === 'subsidiary') {
      // Get subsidiary parent chain
      const subsidiaryChain = await this.getSubsidiaryChain(tenantSchema, scopeId!);
      for (const subId of subsidiaryChain) {
        chain.push({ type: 'subsidiary', id: subId });
      }
      return chain;
    }
    
    if (scopeType === 'talent') {
      // Get talent and its parent subsidiary
      const talent = await prisma.$queryRawUnsafe<Array<{ subsidiary_id: string | null }>>(
        `SELECT subsidiary_id FROM "${tenantSchema}".talent WHERE id = $1::uuid`,
        scopeId
      );
      
      if (talent.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Talent not found',
        });
      }
      
      const subsidiaryId = talent[0].subsidiary_id;
      
      if (subsidiaryId) {
        // Get subsidiary chain
        const subsidiaryChain = await this.getSubsidiaryChain(tenantSchema, subsidiaryId);
        for (const subId of subsidiaryChain) {
          chain.push({ type: 'subsidiary', id: subId });
        }
      }
      
      // Add talent
      chain.push({ type: 'talent', id: scopeId });
    }
    
    return chain;
  }

  /**
   * Get subsidiary chain from root to current (ordered)
   */
  private async getSubsidiaryChain(
    tenantSchema: string,
    subsidiaryId: string
  ): Promise<string[]> {
    // Get subsidiary with path
    const subsidiary = await prisma.$queryRawUnsafe<Array<{ id: string; path: string }>>(
      `SELECT id, path FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid`,
      subsidiaryId
    );
    
    if (subsidiary.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }
    
    const path = subsidiary[0].path;
    
    // Parse path to get all parent codes
    const codes = path.split('/').filter(Boolean);
    
    if (codes.length === 0) {
      return [subsidiaryId];
    }
    
    // Get all subsidiaries in the path
    const placeholders = codes.map((_, i) => `$${i + 1}`).join(', ');
    const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM "${tenantSchema}".subsidiary WHERE code IN (${placeholders}) ORDER BY depth ASC`,
      ...codes
    );
    
    return subsidiaries.map(s => s.id);
  }

  /**
   * Get scope's own settings (not inherited)
   */
  private async getScopeOwnSettings(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null
  ): Promise<{ settings: Record<string, unknown>; version: number } | null> {
    if (scopeType === 'tenant') {
      // Tenant settings are stored in public.tenant
      const tenant = await prisma.$queryRawUnsafe<Array<{ settings: Record<string, unknown> }>>(
        `SELECT settings FROM public.tenant WHERE schema_name = $1`,
        tenantSchema
      );
      
      if (tenant.length === 0) {
        return null;
      }
      
      return {
        settings: tenant[0].settings || {},
        version: 1, // Tenant doesn't have version field for settings
      };
    }
    
    if (scopeType === 'subsidiary') {
      // Subsidiary settings are stored in subsidiary.settings (JSONB)
      // Note: In current schema, subsidiary doesn't have settings field
      // We'll use a query to check for scope_settings table or subsidiary settings
      const subsidiary = await prisma.$queryRawUnsafe<Array<{ id: string; version: number }>>(
        `SELECT id, version FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid`,
        scopeId
      );
      
      if (subsidiary.length === 0) {
        return null;
      }
      
      // Check if scope_settings table exists, if not return null
      // For now, we assume settings are stored in a scope_settings table
      const settings = await this.getFromScopeSettingsTable(tenantSchema, scopeType, scopeId);
      if (settings) {
        return settings;
      }
      
      return null;
    }
    
    if (scopeType === 'talent') {
      // Talent has settings JSONB field
      const talent = await prisma.$queryRawUnsafe<Array<{ settings: Record<string, unknown>; version: number }>>(
        `SELECT settings, version FROM "${tenantSchema}".talent WHERE id = $1::uuid`,
        scopeId
      );
      
      if (talent.length === 0) {
        return null;
      }
      
      return {
        settings: talent[0].settings || {},
        version: talent[0].version,
      };
    }
    
    return null;
  }

  /**
   * Get settings from scope_settings table
   */
  private async getFromScopeSettingsTable(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null
  ): Promise<{ settings: Record<string, unknown>; version: number } | null> {
    try {
      const query = scopeId
        ? `SELECT settings, version FROM "${tenantSchema}".scope_settings WHERE scope_type = $1 AND scope_id = $2::uuid`
        : `SELECT settings, version FROM "${tenantSchema}".scope_settings WHERE scope_type = $1 AND scope_id IS NULL`;
      
      const params = scopeId ? [scopeType, scopeId] : [scopeType];
      const result = await prisma.$queryRawUnsafe<Array<{ settings: Record<string, unknown>; version: number }>>(
        query,
        ...params
      );
      
      if (result.length === 0) {
        return null;
      }
      
      return {
        settings: result[0].settings || {},
        version: result[0].version,
      };
    } catch {
      // Table might not exist yet
      return null;
    }
  }

  /**
   * Save settings for a scope
   */
  private async saveScopeSettings(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null,
    settings: Record<string, unknown>,
    version: number,
    userId: string
  ): Promise<void> {
    const settingsJson = JSON.stringify(settings);
    
    if (scopeType === 'tenant') {
      await prisma.$executeRawUnsafe(
        `UPDATE public.tenant SET settings = $1::jsonb, updated_at = NOW() WHERE schema_name = $2`,
        settingsJson,
        tenantSchema
      );
      return;
    }
    
    if (scopeType === 'talent') {
      await prisma.$executeRawUnsafe(
        `UPDATE "${tenantSchema}".talent 
         SET settings = $1::jsonb, version = $2, updated_by = $3::uuid, updated_at = NOW() 
         WHERE id = $4::uuid`,
        settingsJson,
        version,
        userId,
        scopeId
      );
      return;
    }
    
    if (scopeType === 'subsidiary') {
      // Use scope_settings table for subsidiary
      await this.upsertScopeSettings(tenantSchema, scopeType, scopeId, settings, version, userId);
    }
  }

  /**
   * Upsert into scope_settings table
   */
  private async upsertScopeSettings(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null,
    settings: Record<string, unknown>,
    version: number,
    userId: string
  ): Promise<void> {
    const settingsJson = JSON.stringify(settings);
    
    // Try to ensure table exists
    await this.ensureScopeSettingsTable(tenantSchema);
    
    if (scopeId) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${tenantSchema}".scope_settings (scope_type, scope_id, settings, version, updated_by, updated_at)
         VALUES ($1, $2::uuid, $3::jsonb, $4, $5::uuid, NOW())
         ON CONFLICT (scope_type, scope_id) 
         DO UPDATE SET settings = $3::jsonb, version = $4, updated_by = $5::uuid, updated_at = NOW()`,
        scopeType,
        scopeId,
        settingsJson,
        version,
        userId
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${tenantSchema}".scope_settings (scope_type, scope_id, settings, version, updated_by, updated_at)
         VALUES ($1, NULL, $2::jsonb, $3, $4::uuid, NOW())
         ON CONFLICT (scope_type, scope_id) WHERE scope_id IS NULL
         DO UPDATE SET settings = $2::jsonb, version = $3, updated_by = $4::uuid, updated_at = NOW()`,
        scopeType,
        settingsJson,
        version,
        userId
      );
    }
  }

  /**
   * Ensure scope_settings table exists in tenant schema
   */
  private async ensureScopeSettingsTable(tenantSchema: string): Promise<void> {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${tenantSchema}".scope_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scope_type VARCHAR(20) NOT NULL,
        scope_id UUID,
        settings JSONB NOT NULL DEFAULT '{}',
        version INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID,
        updated_by UUID,
        UNIQUE(scope_type, scope_id)
      )
    `);
  }

  /**
   * Validate scope exists
   */
  private async validateScopeExists(
    tenantSchema: string,
    scopeType: 'tenant' | 'subsidiary' | 'talent',
    scopeId: string | null
  ): Promise<void> {
    if (scopeType === 'tenant') {
      const tenant = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM public.tenant WHERE schema_name = $1`,
        tenantSchema
      );
      if (tenant.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Tenant not found',
        });
      }
      return;
    }
    
    if (scopeType === 'subsidiary') {
      const subsidiary = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid`,
        scopeId
      );
      if (subsidiary.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Subsidiary not found',
        });
      }
      return;
    }
    
    if (scopeType === 'talent') {
      const talent = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "${tenantSchema}".talent WHERE id = $1::uuid`,
        scopeId
      );
      if (talent.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Talent not found',
        });
      }
    }
  }

  /**
   * Get human-readable scope name
   */
  private getScopeName(scopeType: 'tenant' | 'subsidiary' | 'talent', scopeId: string | null): string {
    if (scopeType === 'tenant') return 'Tenant';
    if (scopeType === 'subsidiary') return `Subsidiary`;
    if (scopeType === 'talent') return `Talent`;
    return 'Unknown';
  }
}
