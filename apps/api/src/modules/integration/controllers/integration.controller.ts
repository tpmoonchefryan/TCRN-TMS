// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { RequirePermissions, CurrentUser } from '../../../common/decorators';
import {
  AdapterListQueryDto,
  CreateAdapterDto,
  UpdateAdapterDto,
  UpdateAdapterConfigsDto,
  DisableAdapterDto,
  CreateWebhookDto,
  UpdateWebhookDto,
} from '../dto/integration.dto';
import { AdapterService } from '../services/adapter.service';
import { ApiKeyService } from '../services/api-key.service';
import { WebhookService } from '../services/webhook.service';

@ApiTags('Integration')
@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly adapterService: AdapterService,
    private readonly webhookService: WebhookService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  // =========================================================================
  // Adapters
  // =========================================================================

  @Get('adapters')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'List adapters' })
  async listAdapters(@Query() query: AdapterListQueryDto) {
    return this.adapterService.findMany(query);
  }

  @Post('adapters')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Create adapter' })
  async createAdapter(
    @Body() dto: CreateAdapterDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.adapterService.create(dto, context);
  }

  @Get('adapters/:id')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'Get adapter details' })
  async getAdapter(@Param('id', ParseUUIDPipe) id: string) {
    return this.adapterService.findById(id);
  }

  @Patch('adapters/:id')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Update adapter' })
  async updateAdapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdapterDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.adapterService.update(id, dto, context);
  }

  @Post('adapters/:id/deactivate')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Deactivate adapter' })
  async deactivateAdapter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.adapterService.deactivate(id, context);
  }

  @Post('adapters/:id/reactivate')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Reactivate adapter' })
  async reactivateAdapter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.adapterService.reactivate(id, context);
  }

  @Post('adapters/:id/disable')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Disable inherited adapter at current scope' })
  async disableAdapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisableAdapterDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.adapterService.disableInherited(id, dto, context);
  }

  @Post('adapters/:id/enable')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Enable previously disabled inherited adapter' })
  async enableAdapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisableAdapterDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.adapterService.enableInherited(id, dto, context);
  }

  // =========================================================================
  // Adapter Configs
  // =========================================================================

  @Put('adapters/:id/configs')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Update adapter configs' })
  async updateAdapterConfigs(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdapterConfigsDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.adapterService.updateConfigs(id, dto, context);
  }

  @Post('adapters/:id/configs/:configKey/reveal')
  @RequirePermissions({ resource: 'integration.adapter', action: 'admin' })
  @ApiOperation({ summary: 'Reveal secret config value' })
  async revealConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('configKey') configKey: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.adapterService.revealConfig(id, configKey, context);
  }

  // =========================================================================
  // Webhooks
  // =========================================================================

  @Get('webhooks')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'List webhooks' })
  async listWebhooks() {
    return this.webhookService.findMany();
  }

  @Post('webhooks')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Create webhook' })
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.webhookService.create(dto, context);
  }

  @Get('webhooks/events')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'List webhook events' })
  async getWebhookEvents() {
    return this.webhookService.getEvents();
  }

  @Get('webhooks/:id')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'Get webhook details' })
  async getWebhook(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhookService.findById(id);
  }

  @Patch('webhooks/:id')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Update webhook' })
  async updateWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.webhookService.update(id, dto, context);
  }

  @Delete('webhooks/:id')
  @RequirePermissions({ resource: 'integration.webhook', action: 'delete' })
  @ApiOperation({ summary: 'Delete webhook' })
  async deleteWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.webhookService.delete(id, context);
  }

  @Post('webhooks/:id/deactivate')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Deactivate webhook' })
  async deactivateWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.webhookService.deactivate(id, context);
  }

  @Post('webhooks/:id/reactivate')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Reactivate webhook' })
  async reactivateWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.webhookService.reactivate(id, context);
  }

  // =========================================================================
  // Consumer API Keys
  // =========================================================================

  @Post('consumers/:id/regenerate-key')
  @RequirePermissions({ resource: 'integration.consumer', action: 'admin' })
  @ApiOperation({ summary: 'Regenerate consumer API key' })
  async regenerateConsumerKey(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.apiKeyService.regenerateKey(id, context);
  }

  private buildContext(
    user: { id: string; username: string },
    req: Request,
  ): RequestContext {
    return {
      userId: user.id,
      userName: user.username,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }
}
