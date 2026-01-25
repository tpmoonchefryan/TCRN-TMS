// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';
import { Request } from 'express';


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
    const user = (request as unknown as { user?: { tenantId?: string; tenantSchema?: string } }).user;

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
}
