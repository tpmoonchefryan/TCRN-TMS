// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, getTenantSchemaName, setTenantSchema, createTenantSchema, withTenantContext, Prisma, PrismaClient } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

type Tenant = Awaited<ReturnType<PrismaClient['tenant']['findFirst']>>;

/**
 * Tenant context stored in AsyncLocalStorage or request scope
 */
export interface TenantContext {
  tenantId: string;
  tenantCode: string;
  schemaName: string;
  tier: string;
}

/**
 * Tenant Service
 * Manages multi-tenant schema operations
 */
@Injectable()
export class TenantService {
  /**
   * Get tenant by code (case-insensitive)
   */
  async getTenantByCode(code: string) {
    // First try exact match
    const tenant = await prisma.tenant.findUnique({
      where: { code },
    });
    if (tenant) return tenant;

    // Try case-insensitive match
    return prisma.tenant.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
    });
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
    });
  }

  /**
   * Get tenant by schema name
   */
  async getTenantBySchemaName(schemaName: string) {
    return prisma.tenant.findUnique({
      where: { schemaName },
    });
  }

  /**
   * Create a new tenant with its own schema
   */
  async createTenant(data: {
    code: string;
    name: string;
    tier?: 'ac' | 'standard';
    settings?: Record<string, unknown>;
  }): Promise<Tenant> {
    // Create tenant record in public schema
    const tenant = await prisma.tenant.create({
      data: {
        code: data.code,
        name: data.name,
        schemaName: '', // Will be updated after schema creation
        tier: data.tier || 'standard',
        settings: (data.settings || {}) as Prisma.InputJsonValue,
      },
    });

    // Create tenant schema
    const schemaName = await createTenantSchema(tenant.id);

    // Update tenant with schema name
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { schemaName },
    });

    return updatedTenant;
  }

  /**
   * Activate/deactivate tenant
   */
  async setTenantActive(tenantId: string, isActive: boolean): Promise<Tenant> {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive },
    });
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string,
    settings: Record<string, unknown>
  ): Promise<Tenant> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    const currentSettings = (tenant.settings as Record<string, unknown>) || {};
    const mergedSettings = { ...currentSettings, ...settings };

    return prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: mergedSettings as Prisma.InputJsonValue },
    });
  }

  /**
   * List all active tenants
   */
  async listActiveTenants(): Promise<Tenant[]> {
    return prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Set search path to tenant schema
   */
  async setTenantContext(schemaName: string): Promise<void> {
    await setTenantSchema(schemaName);
  }

  /**
   * Execute function within tenant context
   */
  async withTenant<T>(
    schemaName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return withTenantContext(schemaName, fn);
  }

  /**
   * Get schema name from tenant ID
   */
  getSchemaNameFromId(tenantId: string): string {
    return getTenantSchemaName(tenantId);
  }

  /**
   * Validate tenant access
   */
  async validateTenantAccess(
    tenantId: string,
    requestedTenantId: string
  ): Promise<boolean> {
    // Users can only access their own tenant
    if (tenantId !== requestedTenantId) {
      return false;
    }

    // Check if tenant is active
    const tenant = await this.getTenantById(tenantId);
    return tenant?.isActive === true;
  }
}
