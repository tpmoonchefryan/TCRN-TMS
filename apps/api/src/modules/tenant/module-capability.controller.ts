// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermissions, CurrentUser, type AuthenticatedUser } from '../../common/decorators';
import { success } from '../../common/response.util';
import { ModuleCapabilityService } from './module-capability.service';

@ApiTags('Org - Module Capabilities')
@Controller('module-capabilities')
@ApiBearerAuth()
export class ModuleCapabilityController {
  constructor(private readonly moduleCapabilityService: ModuleCapabilityService) {}

  @Get('effective')
  @ApiOperation({ summary: 'Read current tenant effective module capability snapshot' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current authenticated tenant effective capability snapshot',
  })
  async getCurrentTenantEffectiveCapabilities(@CurrentUser() user: AuthenticatedUser) {
    return success(
      await this.moduleCapabilityService.getCurrentTenantEffectiveCapabilities(user.tenantId)
    );
  }

  @Get('registry')
  @RequirePermissions({ resource: 'tenant.manage', action: 'read' })
  @ApiOperation({ summary: 'Read module and capability registry (AC only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the read-only module/capability registry contract',
  })
  async getRegistry(@CurrentUser() user: AuthenticatedUser) {
    await this.moduleCapabilityService.verifyAcAccess(user);

    return success(this.moduleCapabilityService.getRegistry());
  }
}
