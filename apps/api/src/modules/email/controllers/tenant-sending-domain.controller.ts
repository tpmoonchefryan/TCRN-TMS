// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards';
import { success } from '../../../common/response.util';
import { TenantSendingDomainService } from '../application/tenant-sending-domain.service';
import {
  SaveManagedTenantSendingDomainsDto,
  SaveTenantSenderDomainsDto,
} from '../dto/tenant-sending-domain.dto';

@ApiTags('Ops - Email Sending Domains')
@Controller('email')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TenantSendingDomainController {
  constructor(private readonly tenantSendingDomainService: TenantSendingDomainService) {}

  private checkAcTenantAccess(user: AuthenticatedUser): void {
    if (user.tenantSchema !== 'tenant_ac') {
      throw new ForbiddenException({
        code: 'AC_TENANT_ONLY',
        message: 'Tenant sending-domain provisioning is only available for AC tenant administrators',
      });
    }
  }

  @Get('tenants/:tenantId/sending-domains')
  @ApiOperation({ summary: 'Get AC-managed sending domains for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Managed tenant id' })
  @ApiResponse({ status: 200, description: 'Returns sending domains and DNS records for the tenant' })
  @ApiResponse({ status: 403, description: 'Only AC tenant administrators can manage tenant sending domains' })
  async getManagedTenantSendingDomains(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    this.checkAcTenantAccess(user);
    return success(await this.tenantSendingDomainService.getManagedTenantSendingDomains(tenantId));
  }

  @Patch('tenants/:tenantId/sending-domains')
  @ApiOperation({ summary: 'Save AC-managed sending domains for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Managed tenant id' })
  @ApiResponse({ status: 200, description: 'Returns updated sending domains and DNS records' })
  @ApiResponse({ status: 403, description: 'Only AC tenant administrators can manage tenant sending domains' })
  async saveManagedTenantSendingDomains(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: SaveManagedTenantSendingDomainsDto,
  ) {
    this.checkAcTenantAccess(user);
    return success(await this.tenantSendingDomainService.saveManagedTenantSendingDomains(tenantId, dto));
  }

  @Get('sender-domains')
  @ApiOperation({ summary: 'Get tenant sender-domain options' })
  @ApiResponse({ status: 200, description: 'Returns assigned sender domains and non-secret sender preferences' })
  async getTenantSenderDomains(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.tenantSendingDomainService.getTenantSenderSelection(user.tenantSchema));
  }

  @Patch('sender-domains')
  @ApiOperation({ summary: 'Save tenant sender-domain preferences' })
  @ApiResponse({ status: 200, description: 'Returns updated non-secret sender-domain preferences' })
  async saveTenantSenderDomains(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveTenantSenderDomainsDto,
  ) {
    return success(await this.tenantSendingDomainService.saveTenantSenderSelection(user.tenantSchema, dto));
  }
}
