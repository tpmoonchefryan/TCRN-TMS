// SPDX-License-Identifier: Apache-2.0
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { ErrorCodes } from '@tcrn/shared';

import { ModuleCapabilityService } from '../../modules/tenant';
import { CAPABILITIES_KEY } from '../decorators/require-capabilities.decorator';

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleCapabilityService: ModuleCapabilityService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities =
      this.reflector.getAllAndOverride<string[]>(CAPABILITIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredCapabilities.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as { user?: { tenantId?: string } }).user;

    if (!user?.tenantId) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Authenticated tenant context is required for capability-gated modules.',
      });
    }

    const snapshot = await this.moduleCapabilityService.getCurrentTenantEffectiveCapabilities(
      user.tenantId
    );
    const enabled = new Set<string>(snapshot.effective.enabledCapabilityCodes);
    const missing = requiredCapabilities.filter((capabilityCode) => !enabled.has(capabilityCode));

    if (missing.length > 0) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_CAPABILITY_DISABLED,
        message: 'Module is not enabled for this tenant.',
        details: {
          missingCapabilityCodes: missing,
        },
      });
    }

    return true;
  }
}
