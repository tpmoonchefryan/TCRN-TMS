// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { TenantContext, TenantService } from './tenant.service';

// Extend Express Request to include tenant context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

/**
 * Tenant Middleware
 * Sets tenant context based on JWT claims or header
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Skip for health check and public endpoints
    if (this.isPublicEndpoint(req.path)) {
      // console.log(`[TenantMiddleware] Skipping public endpoint: ${req.path}`);
      return next();
    }

    try {
      // Try to get tenant from JWT claims (set by auth middleware)
      const jwtTenantId = (req as unknown as { user?: { tenantId?: string } }).user?.tenantId;
      
      // Or from X-Tenant-ID header (for API consumers)
      const headerTenantId = req.headers['x-tenant-id'] as string;
      
      const tenantId = jwtTenantId || headerTenantId;

      if (!tenantId) {
        // No tenant context required for some endpoints
        return next();
      }

      // Get tenant details
      // Check if input is UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
      
      let tenant;
      if (isUuid) {
        tenant = await this.tenantService.getTenantById(tenantId);
      } else {
        tenant = await this.tenantService.getTenantByCode(tenantId);
      }

      if (!tenant) {
        throw new UnauthorizedException('Invalid tenant');
      }

      if (!tenant.isActive) {
        throw new UnauthorizedException('Tenant is disabled');
      }

      // Set tenant context on request
      req.tenantContext = {
        tenantId: tenant.id,
        tenantCode: tenant.code,
        schemaName: tenant.schemaName,
        tier: tenant.tier,
      };

      // Set database search path to tenant schema
      await this.tenantService.setTenantContext(tenant.schemaName);

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Tenant middleware error', error);
      throw new UnauthorizedException('Failed to resolve tenant context');
    }
  }

  private isPublicEndpoint(path: string): boolean {
    const publicPaths = [
      '/health',
      '/api/v1/health',
      '/api/docs',
      '/api/v1/auth/login',
    ];

    return publicPaths.some((p) => path.startsWith(p));
  }
}
