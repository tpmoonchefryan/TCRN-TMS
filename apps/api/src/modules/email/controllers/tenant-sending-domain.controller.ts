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

const createSuccessEnvelopeSchema = (dataSchema: Record<string, unknown>, exampleData: Record<string, unknown>) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: exampleData,
  },
});

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code,
      message,
    },
  },
});

const TENANT_SENDING_DOMAIN_DNS_RECORD_SCHEMA = {
  type: 'object',
  properties: {
    host: { type: 'string', example: '_tcrn-email.mail.alpha.example.com' },
    type: { type: 'string', example: 'TXT' },
    value: { type: 'string', example: 'tcrn-verification=abc123' },
  },
  required: ['host', 'type', 'value'],
} as const;

const MANAGED_TENANT_SENDING_DOMAIN_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'domain-1' },
    domain: { type: 'string', example: 'mail.alpha.example.com' },
    status: { type: 'string', enum: ['pending_dns', 'verified', 'disabled'], example: 'verified' },
    dnsRecords: {
      type: 'array',
      items: TENANT_SENDING_DOMAIN_DNS_RECORD_SCHEMA,
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-05-08T00:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-05-08T00:00:00.000Z' },
  },
  required: ['id', 'domain', 'status', 'dnsRecords', 'createdAt', 'updatedAt'],
} as const;

const MANAGED_TENANT_SENDING_DOMAINS_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      tenantId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      domains: {
        type: 'array',
        items: MANAGED_TENANT_SENDING_DOMAIN_ITEM_SCHEMA,
      },
      defaultDomainId: { type: 'string', nullable: true, example: 'domain-1' },
    },
    required: ['tenantId', 'domains', 'defaultDomainId'],
  },
  {
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    domains: [
      {
        id: 'domain-1',
        domain: 'mail.alpha.example.com',
        status: 'verified',
        dnsRecords: [
          {
            host: '_tcrn-email.mail.alpha.example.com',
            type: 'TXT',
            value: 'tcrn-verification=abc123',
          },
        ],
        createdAt: '2026-05-08T00:00:00.000Z',
        updatedAt: '2026-05-08T00:00:00.000Z',
      },
    ],
    defaultDomainId: 'domain-1',
  },
);

const TENANT_SENDER_DOMAIN_OPTION_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'domain-1' },
    domain: { type: 'string', example: 'mail.alpha.example.com' },
    status: { type: 'string', enum: ['pending_dns', 'verified', 'disabled'], example: 'verified' },
    selectable: { type: 'boolean', example: true },
  },
  required: ['id', 'domain', 'status', 'selectable'],
} as const;

const TENANT_SENDER_DOMAINS_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      domains: {
        type: 'array',
        items: TENANT_SENDER_DOMAIN_OPTION_SCHEMA,
      },
      defaultDomainId: { type: 'string', nullable: true, example: 'domain-1' },
      fromName: { type: 'string', nullable: true, example: 'Acme Support' },
      replyTo: { type: 'string', nullable: true, example: 'support@acme.example.com' },
    },
    required: ['domains', 'defaultDomainId', 'fromName', 'replyTo'],
  },
  {
    domains: [
      {
        id: 'domain-1',
        domain: 'mail.alpha.example.com',
        status: 'verified',
        selectable: true,
      },
    ],
    defaultDomainId: 'domain-1',
    fromName: 'Acme Support',
    replyTo: 'support@acme.example.com',
  },
);

const AC_TENANT_ONLY_SCHEMA = createErrorEnvelopeSchema(
  'AC_TENANT_ONLY',
  'Tenant sending-domain provisioning is only available for AC tenant administrators',
);

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
  @ApiResponse({
    status: 200,
    description: 'Returns sending domains and DNS records for the tenant',
    schema: MANAGED_TENANT_SENDING_DOMAINS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can manage tenant sending domains',
    schema: AC_TENANT_ONLY_SCHEMA,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Returns updated sending domains and DNS records',
    schema: MANAGED_TENANT_SENDING_DOMAINS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can manage tenant sending domains',
    schema: AC_TENANT_ONLY_SCHEMA,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Returns assigned sender domains and non-secret sender preferences',
    schema: TENANT_SENDER_DOMAINS_SUCCESS_SCHEMA,
  })
  async getTenantSenderDomains(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.tenantSendingDomainService.getTenantSenderSelection(user.tenantSchema));
  }

  @Patch('sender-domains')
  @ApiOperation({ summary: 'Save tenant sender-domain preferences' })
  @ApiResponse({
    status: 200,
    description: 'Returns updated non-secret sender-domain preferences',
    schema: TENANT_SENDER_DOMAINS_SUCCESS_SCHEMA,
  })
  async saveTenantSenderDomains(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveTenantSenderDomainsDto,
  ) {
    return success(await this.tenantSendingDomainService.saveTenantSenderSelection(user.tenantSchema, dto));
  }
}
