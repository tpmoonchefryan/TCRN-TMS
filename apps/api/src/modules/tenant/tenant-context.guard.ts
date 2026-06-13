// SPDX-License-Identifier: Apache-2.0
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { ErrorCodes } from '@tcrn/shared';

import { TenantService } from './tenant.service';

/**
 * Tenant Context Guard
 * Ensures the user's tenant is active and sets up the schema context
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as { user?: { tenantId?: string; tenantSchema?: string } })
      .user;

    if (!user?.tenantId) {
      // No tenant context (might be public endpoint)
      return true;
    }

    // Verify tenant is active
    const tenant = await this.tenantService.getTenantById(user.tenantId);

    if (!tenant) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    if (!tenant.isActive) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_DISABLED,
        message: 'Tenant is disabled',
      });
    }

    this.assertCompatibleRequestedTenant(request, tenant);

    // Set tenant schema context
    await this.tenantService.setTenantContext(tenant.schemaName);

    // Update request with tenant context
    request.tenantContext = {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      schemaName: tenant.schemaName,
      tier: tenant.tier,
    };

    return true;
  }

  private assertCompatibleRequestedTenant(
    request: Request,
    tenant: { id: string; code: string; schemaName: string }
  ): void {
    const requestedTenant = this.readSingleHeader(request.headers['x-tenant-id']);
    const middlewareTenantContext = request.tenantContext;

    const allowedTenantIdentifiers = new Set(
      [tenant.id, tenant.code, tenant.schemaName].map((value) => value.toLowerCase())
    );

    if (requestedTenant && !allowedTenantIdentifiers.has(requestedTenant.toLowerCase())) {
      this.throwTenantMismatch();
    }

    if (
      middlewareTenantContext &&
      (middlewareTenantContext.tenantId !== tenant.id ||
        middlewareTenantContext.schemaName !== tenant.schemaName)
    ) {
      this.throwTenantMismatch();
    }
  }

  private readSingleHeader(value: string | string[] | undefined): string | null {
    const raw = Array.isArray(value) ? value[0] : value;
    const normalized = raw?.trim();
    return normalized || null;
  }

  private throwTenantMismatch(): never {
    throw new ForbiddenException({
      code: ErrorCodes.PERM_ACCESS_DENIED,
      message: 'Requested tenant context does not match the authenticated tenant',
    });
  }
}
