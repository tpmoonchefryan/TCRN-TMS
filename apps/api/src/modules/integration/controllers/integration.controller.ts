// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
  AdapterListQueryDto,
  CreateAdapterDto,
  CreateWebhookDto,
  OwnerType,
  UpdateAdapterConfigsDto,
  UpdateAdapterDto,
  UpdateWebhookDto,
} from '../dto/integration.dto';
import { AdapterService } from '../services/adapter.service';
import { AdapterResolutionService } from '../services/adapter-resolution.service';
import { ApiKeyService } from '../services/api-key.service';
import { WebhookService } from '../services/webhook.service';

function parseBooleanQueryValue(
  value: string | string[] | undefined,
  fallback: boolean,
): boolean {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return fallback;
}

@ApiTags('Ops - Integration')
@ApiBearerAuth()
@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly adapterService: AdapterService,
    private readonly adapterResolutionService: AdapterResolutionService,
    private readonly webhookService: WebhookService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Get('adapters')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'List tenant-owned adapters' })
  async listTenantAdapters(
    @Query() query: AdapterListQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.findMany(
      { ownerType: OwnerType.TENANT, ownerId: null },
      {
        ...query,
        includeInherited: parseBooleanQueryValue(
          req.query.includeInherited as string | string[] | undefined,
          query.includeInherited ?? true,
        ),
        includeDisabled: parseBooleanQueryValue(
          req.query.includeDisabled as string | string[] | undefined,
          query.includeDisabled ?? false,
        ),
      },
      this.buildContext(user, req),
    );
  }

  @Post('adapters')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Create a tenant-owned adapter' })
  async createTenantAdapter(
    @Body() dto: CreateAdapterDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    return this.adapterService.create(
      dto,
      this.buildContext(user, req),
      { ownerType: OwnerType.TENANT, ownerId: null },
    );
  }

  @Get('adapters/effective/:platformCode')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'Resolve the effective tenant adapter for a platform code' })
  async resolveTenantEffectiveAdapter(
    @Param('platformCode') platformCode: string,
    @Query('adapterType') adapterType: string | undefined,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterResolutionService.resolveEffectiveAdapter(
      {
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformCode,
        adapterType,
      },
      this.buildContext(user, req),
    );
  }

  @Get('adapters/:adapterId')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'Get adapter details' })
  async getAdapter(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.findById(adapterId, this.buildContext(user, req));
  }

  @Patch('adapters/:adapterId')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Update adapter' })
  async updateAdapter(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @Body() dto: UpdateAdapterDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.update(adapterId, dto, this.buildContext(user, req));
  }

  @Post('adapters/:adapterId/deactivate')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Deactivate adapter' })
  async deactivateAdapter(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.deactivate(adapterId, this.buildContext(user, req));
  }

  @Post('adapters/:adapterId/reactivate')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Reactivate adapter' })
  async reactivateAdapter(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.reactivate(adapterId, this.buildContext(user, req));
  }

  @Patch('adapters/:adapterId/configs')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Update adapter configs' })
  async updateAdapterConfigs(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @Body() dto: UpdateAdapterConfigsDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.updateConfigs(adapterId, dto, this.buildContext(user, req));
  }

  @Post('adapters/:adapterId/configs/:configKey/reveal')
  @RequirePermissions({ resource: 'integration.adapter', action: 'admin' })
  @ApiOperation({ summary: 'Reveal secret config value' })
  async revealConfig(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @Param('configKey') configKey: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.revealConfig(adapterId, configKey, this.buildContext(user, req));
  }

  @Get('webhooks')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'List webhooks' })
  async listWebhooks(
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.webhookService.findMany(this.buildContext(user, req));
  }

  @Post('webhooks')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Create webhook' })
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    return this.webhookService.create(dto, this.buildContext(user, req));
  }

  @Get('webhooks/events')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'List webhook events' })
  async getWebhookEvents() {
    return this.webhookService.getEvents();
  }

  @Get('webhooks/:webhookId')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'Get webhook details' })
  async getWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.webhookService.findById(webhookId, this.buildContext(user, req));
  }

  @Patch('webhooks/:webhookId')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Update webhook' })
  async updateWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    return this.webhookService.update(webhookId, dto, this.buildContext(user, req));
  }

  @Delete('webhooks/:webhookId')
  @RequirePermissions({ resource: 'integration.webhook', action: 'delete' })
  @ApiOperation({ summary: 'Delete webhook' })
  async deleteWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    return this.webhookService.delete(webhookId, this.buildContext(user, req));
  }

  @Post('webhooks/:webhookId/deactivate')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Deactivate webhook' })
  async deactivateWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    return this.webhookService.deactivate(webhookId, this.buildContext(user, req));
  }

  @Post('webhooks/:webhookId/reactivate')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Reactivate webhook' })
  async reactivateWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    return this.webhookService.reactivate(webhookId, this.buildContext(user, req));
  }

  @Post('consumers/:consumerId/regenerate-key')
  @RequirePermissions({ resource: 'integration.consumer', action: 'admin' })
  @ApiOperation({ summary: 'Regenerate consumer API key' })
  async regenerateConsumerKey(
    @Param('consumerId', ParseUUIDPipe) consumerId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    return this.apiKeyService.regenerateKey(consumerId, this.buildContext(user, req));
  }

  private buildContext(
    user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    req: Request,
  ): RequestContext {
    const requestUser = req as Request & {
      user?: { tenantId?: string; tenantSchema?: string };
    };

    return {
      userId: user.id,
      userName: user.username,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
      tenantId: user.tenantId ?? requestUser.user?.tenantId,
      tenantSchema: user.tenantSchema ?? requestUser.user?.tenantSchema,
    };
  }
}
