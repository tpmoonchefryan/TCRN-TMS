// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import {
  INTEGRATION_ADAPTER_CREATE_DEFINITIONS,
  INTEGRATION_WEBHOOK_DEFINITIONS,
  type RequestContext,
} from '@tcrn/shared';

import { CurrentUser, RequireCapabilities, RequirePermissions } from '../../../common/decorators';
import {
  AdapterListQueryDto,
  CreateAdapterDto,
  CreateWebhookDto,
  OwnerType,
  UpdateAdapterConfigsDto,
  UpdateAdapterDto,
  UpdateWebhookDto,
  WebhookDeliveryAttemptQueryDto,
  WebhookDeliveryOperationDto,
} from '../dto/integration.dto';
import { AdapterResolutionService } from '../services/adapter-resolution.service';
import { AdapterService } from '../services/adapter.service';
import { ApiKeyService } from '../services/api-key.service';
import { WebhookService } from '../services/webhook.service';

function parseBooleanQueryValue(value: string | string[] | undefined, fallback: boolean): boolean {
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

type ApiResponseSchema = Extract<Parameters<typeof ApiResponse>[0], { schema: unknown }>['schema'];

const webhookEventCatalogResponseSchema: ApiResponseSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: [
      'event',
      'eventCode',
      'name',
      'label',
      'description',
      'descriptionText',
      'category',
      'definitionKey',
      'payloadVersion',
      'producer',
      'piiClass',
      'retention',
      'subscriptionEligible',
      'deprecated',
      'schemaRef',
      'redactionPolicy',
    ],
    properties: {
      event: { type: 'string', example: 'customer.created' },
      eventCode: { type: 'string', example: 'customer.created' },
      name: { type: 'string', example: 'Customer created' },
      label: { type: 'object', additionalProperties: { type: 'string' } },
      description: { type: 'string' },
      descriptionText: { type: 'object', additionalProperties: { type: 'string' } },
      category: { type: 'string', example: 'customer' },
      definitionKey: { type: 'string', example: 'customer_events' },
      payloadVersion: { type: 'string', example: 'v1' },
      producer: { type: 'string', example: 'tcrn' },
      piiClass: { type: 'string', enum: ['none', 'reference', 'limited_pii'] },
      retention: { type: 'string', example: 'delivery_log_redacted_30d' },
      subscriptionEligible: { type: 'boolean' },
      deprecated: { type: 'boolean' },
      schemaRef: { type: 'string', example: 'webhook.payload.customer.created.v1' },
      redactionPolicy: { type: 'string' },
    },
  },
};

const webhookDeliveryAttemptResponseSchema: ApiResponseSchema = {
  type: 'object',
  required: [
    'id',
    'outboxId',
    'webhookId',
    'eventCode',
    'payloadVersion',
    'idempotencyKey',
    'payloadHash',
    'attemptNumber',
    'status',
    'dispatchMode',
    'endpointUrl',
    'requestHeaders',
    'requestBodySummary',
    'responseStatus',
    'responseBodySummary',
    'errorCode',
    'errorMessage',
    'latencyMs',
    'nextRetryAt',
    'deliveredAt',
    'replayReason',
    'traceId',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    outboxId: { type: 'string', format: 'uuid' },
    webhookId: { type: 'string', format: 'uuid', nullable: true },
    eventCode: { type: 'string', example: 'customer.created' },
    payloadVersion: { type: 'string', example: 'v1' },
    idempotencyKey: { type: 'string' },
    payloadHash: { type: 'string' },
    attemptNumber: { type: 'integer', minimum: 1 },
    status: {
      type: 'string',
      enum: [
        'dry_run',
        'pending',
        'delivered',
        'failed',
        'retry_scheduled',
        'dead_lettered',
        'replayed',
        'blocked',
      ],
    },
    dispatchMode: {
      type: 'string',
      enum: ['disabled', 'local_stub', 'local_dispatch', 'provider_dispatch'],
    },
    endpointUrl: { type: 'string', format: 'uri' },
    requestHeaders: { type: 'object', additionalProperties: true },
    requestBodySummary: { type: 'object', additionalProperties: true },
    responseStatus: { type: 'integer', nullable: true },
    responseBodySummary: { type: 'object', additionalProperties: true },
    errorCode: { type: 'string', nullable: true },
    errorMessage: { type: 'string', nullable: true },
    latencyMs: { type: 'integer', nullable: true },
    nextRetryAt: { type: 'string', format: 'date-time', nullable: true },
    deliveredAt: { type: 'string', format: 'date-time', nullable: true },
    replayReason: { type: 'string', nullable: true },
    traceId: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const webhookDeliveryAttemptPageResponseSchema: ApiResponseSchema = {
  type: 'object',
  required: ['items', 'page', 'pageSize', 'total'],
  properties: {
    items: {
      type: 'array',
      items: webhookDeliveryAttemptResponseSchema,
    },
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1 },
    total: { type: 'integer', minimum: 0 },
  },
};

const webhookDeliveryOperationResponseSchema: ApiResponseSchema = {
  type: 'object',
  required: [
    'accepted',
    'duplicate',
    'dryRun',
    'dispatchMode',
    'status',
    'webhookId',
    'outboxId',
    'attemptId',
    'eventCode',
    'payloadVersion',
    'idempotencyKey',
    'traceId',
    'redacted',
  ],
  properties: {
    accepted: { type: 'boolean' },
    duplicate: { type: 'boolean' },
    dryRun: { type: 'boolean' },
    dispatchMode: {
      type: 'string',
      enum: ['disabled', 'local_stub', 'local_dispatch', 'provider_dispatch'],
    },
    status: {
      type: 'string',
      enum: [
        'duplicate',
        'dry_run',
        'pending',
        'delivered',
        'failed',
        'retry_scheduled',
        'dead_lettered',
        'replayed',
        'blocked',
      ],
    },
    webhookId: { type: 'string', format: 'uuid' },
    outboxId: { type: 'string', format: 'uuid' },
    attemptId: { type: 'string', format: 'uuid', nullable: true },
    eventCode: { type: 'string', example: 'customer.created' },
    payloadVersion: { type: 'string', example: 'v1' },
    idempotencyKey: { type: 'string' },
    traceId: { type: 'string', nullable: true },
    redacted: { type: 'boolean', enum: [true] },
  },
};

const webhookDeliveryConflictResponseSchema: ApiResponseSchema = {
  type: 'object',
  required: ['code', 'message'],
  properties: {
    code: { type: 'string', example: 'RES_CONFLICT' },
    message: { type: 'string' },
  },
};

@ApiTags('Ops - Integration')
@ApiBearerAuth()
@RequireCapabilities('integration.webhooks')
@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly adapterService: AdapterService,
    private readonly adapterResolutionService: AdapterResolutionService,
    private readonly webhookService: WebhookService,
    private readonly apiKeyService: ApiKeyService
  ) {}

  @Get('adapter-definitions')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'List supported adapter definitions' })
  getAdapterDefinitions() {
    return INTEGRATION_ADAPTER_CREATE_DEFINITIONS;
  }

  @Get('webhook-definitions')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'List supported webhook definitions' })
  getWebhookDefinitions() {
    return INTEGRATION_WEBHOOK_DEFINITIONS;
  }

  @Get('adapters')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'List tenant-owned adapters' })
  async listTenantAdapters(
    @Query() query: AdapterListQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
  ) {
    return this.adapterService.findMany(
      { ownerType: OwnerType.TENANT, ownerId: null },
      {
        ...query,
        includeInherited: parseBooleanQueryValue(
          req.query.includeInherited as string | string[] | undefined,
          query.includeInherited ?? true
        ),
        includeDisabled: parseBooleanQueryValue(
          req.query.includeDisabled as string | string[] | undefined,
          query.includeDisabled ?? false
        ),
      },
      this.buildContext(user, req)
    );
  }

  @Post('adapters')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Create a tenant-owned adapter' })
  async createTenantAdapter(
    @Body() dto: CreateAdapterDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request
  ) {
    return this.adapterService.create(dto, this.buildContext(user, req), {
      ownerType: OwnerType.TENANT,
      ownerId: null,
    });
  }

  @Get('adapters/effective/:platformCode')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'Resolve the effective tenant adapter for a platform code' })
  async resolveTenantEffectiveAdapter(
    @Param('platformCode') platformCode: string,
    @Query('adapterType') adapterType: string | undefined,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
  ) {
    return this.adapterResolutionService.resolveEffectiveAdapter(
      {
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformCode,
        adapterType,
      },
      this.buildContext(user, req)
    );
  }

  @Get('adapters/:adapterId')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'Get adapter details' })
  async getAdapter(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
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
    @Req() req: Request
  ) {
    return this.adapterService.update(adapterId, dto, this.buildContext(user, req));
  }

  @Post('adapters/:adapterId/deactivate')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Deactivate adapter' })
  async deactivateAdapter(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
  ) {
    return this.adapterService.deactivate(adapterId, this.buildContext(user, req));
  }

  @Post('adapters/:adapterId/reactivate')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Reactivate adapter' })
  async reactivateAdapter(
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
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
    @Req() req: Request
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
    @Req() req: Request
  ) {
    return this.adapterService.revealConfig(adapterId, configKey, this.buildContext(user, req));
  }

  @Get('webhooks')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'List webhooks' })
  async listWebhooks(
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
  ) {
    return this.webhookService.findMany(this.buildContext(user, req));
  }

  @Post('webhooks')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Create webhook' })
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request
  ) {
    return this.webhookService.create(dto, this.buildContext(user, req));
  }

  @Get('webhooks/events')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'List TCRN-owned webhook event catalog' })
  @ApiResponse({
    status: 200,
    description: 'TCRN-owned webhook event catalog',
    schema: webhookEventCatalogResponseSchema,
  })
  async getWebhookEvents() {
    return this.webhookService.getEvents();
  }

  @Get('webhooks/:webhookId/delivery-attempts')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'List webhook delivery attempts' })
  @ApiResponse({
    status: 200,
    description: 'Redacted webhook delivery attempt page',
    schema: webhookDeliveryAttemptPageResponseSchema,
  })
  async listWebhookDeliveryAttempts(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @Query() query: WebhookDeliveryAttemptQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
  ) {
    return this.webhookService.listDeliveryAttempts(webhookId, query, this.buildContext(user, req));
  }

  @Get('webhooks/:webhookId/delivery-attempts/:attemptId')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'Get webhook delivery attempt detail' })
  @ApiResponse({
    status: 200,
    description: 'Redacted webhook delivery attempt detail',
    schema: webhookDeliveryAttemptResponseSchema,
  })
  async getWebhookDeliveryAttempt(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
  ) {
    return this.webhookService.getDeliveryAttempt(
      attemptId,
      webhookId,
      this.buildContext(user, req)
    );
  }

  @Post('webhooks/:webhookId/test-delivery')
  @HttpCode(202)
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Create a webhook test delivery attempt' })
  @ApiBody({ type: WebhookDeliveryOperationDto })
  @ApiResponse({
    status: 202,
    description: 'Dry-run webhook delivery attempt accepted',
    schema: webhookDeliveryOperationResponseSchema,
  })
  @ApiResponse({
    status: 409,
    description: 'Idempotency key is already used for a different webhook delivery operation',
    schema: webhookDeliveryConflictResponseSchema,
  })
  async createWebhookTestDelivery(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @Body() dto: WebhookDeliveryOperationDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
  ) {
    return this.webhookService.createTestDelivery(webhookId, dto, this.buildContext(user, req));
  }

  @Post('webhooks/:webhookId/delivery-attempts/:attemptId/replay')
  @HttpCode(202)
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Replay a webhook delivery attempt' })
  @ApiBody({ type: WebhookDeliveryOperationDto })
  @ApiResponse({
    status: 202,
    description: 'Webhook delivery replay accepted',
    schema: webhookDeliveryOperationResponseSchema,
  })
  @ApiResponse({
    status: 409,
    description: 'Idempotency key is already used for a different webhook delivery operation',
    schema: webhookDeliveryConflictResponseSchema,
  })
  async replayWebhookDeliveryAttempt(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: WebhookDeliveryOperationDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
  ) {
    return this.webhookService.replayDeliveryAttempt(
      webhookId,
      attemptId,
      dto,
      this.buildContext(user, req)
    );
  }

  @Get('webhooks/:webhookId')
  @RequirePermissions({ resource: 'integration.webhook', action: 'read' })
  @ApiOperation({ summary: 'Get webhook details' })
  async getWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request
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
    @Req() req: Request
  ) {
    return this.webhookService.update(webhookId, dto, this.buildContext(user, req));
  }

  @Delete('webhooks/:webhookId')
  @RequirePermissions({ resource: 'integration.webhook', action: 'delete' })
  @ApiOperation({ summary: 'Delete webhook' })
  async deleteWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request
  ) {
    return this.webhookService.delete(webhookId, this.buildContext(user, req));
  }

  @Post('webhooks/:webhookId/deactivate')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Deactivate webhook' })
  async deactivateWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request
  ) {
    return this.webhookService.deactivate(webhookId, this.buildContext(user, req));
  }

  @Post('webhooks/:webhookId/reactivate')
  @RequirePermissions({ resource: 'integration.webhook', action: 'write' })
  @ApiOperation({ summary: 'Reactivate webhook' })
  async reactivateWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request
  ) {
    return this.webhookService.reactivate(webhookId, this.buildContext(user, req));
  }

  @Post('consumers/:consumerId/regenerate-key')
  @RequirePermissions({ resource: 'integration.consumer', action: 'admin' })
  @ApiOperation({ summary: 'Regenerate consumer API key' })
  async regenerateConsumerKey(
    @Param('consumerId', ParseUUIDPipe) consumerId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request
  ) {
    return this.apiKeyService.regenerateKey(consumerId, this.buildContext(user, req));
  }

  private buildContext(
    user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    req: Request
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
