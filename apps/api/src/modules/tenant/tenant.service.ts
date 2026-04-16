// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { createTenantSchema, getTenantSchemaName, Prisma, prisma, PrismaClient,setTenantSchema, withTenantContext } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

import { TenantReadService } from './application/tenant-read.service';
import { TenantReadRepository } from './infrastructure/tenant-read.repository';

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
  constructor(
    private readonly tenantReadService: TenantReadService = new TenantReadService(
      new TenantReadRepository(),
    ),
  ) {}

  /**
   * Get tenant by code (case-insensitive)
   */
  async getTenantByCode(code: string) {
    return this.tenantReadService.getTenantByCode(code);
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string) {
    return this.tenantReadService.getTenantById(id);
  }

  /**
   * Get tenant by schema name
   */
  async getTenantBySchemaName(schemaName: string) {
    return this.tenantReadService.getTenantBySchemaName(schemaName);
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
    const tenant = await prisma.tenant.create({
      data: {
        code: data.code,
        name: data.name,
        schemaName: '', // Will be updated after schema creation
        tier: data.tier || 'standard',
        settings: (data.settings || {}) as Prisma.InputJsonValue,
      },
    });

    const fallbackSchemaName = getTenantSchemaName(tenant.id);

    try {
      const schemaName = await createTenantSchema(tenant.id);

      return await prisma.tenant.update({
        where: { id: tenant.id },
        data: { schemaName },
      });
    } catch (error) {
      try {
        await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${fallbackSchemaName}" CASCADE`);
      } catch {
        // Best-effort rollback; preserve original failure below.
      }

      try {
        await prisma.tenant.delete({
          where: { id: tenant.id },
        });
      } catch {
        // Best-effort rollback; preserve original failure below.
      }

      throw error;
    }
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
    return this.tenantReadService.listActiveTenants();
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
    return this.tenantReadService.validateTenantAccess(tenantId, requestedTenantId);
  }
}
