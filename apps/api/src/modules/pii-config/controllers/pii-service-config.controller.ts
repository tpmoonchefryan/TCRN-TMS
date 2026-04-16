// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';
import { Request } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
    CreatePiiServiceConfigDto,
    PaginationQueryDto,
    UpdatePiiServiceConfigDto,
} from '../dto/pii-config.dto';
import { PiiServiceConfigService } from '../services/pii-service-config.service';

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
    error: { code, message },
  },
});

const PII_SERVICE_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const PII_SERVICE_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied',
);

const PII_SERVICE_CONFIG_RETIRED_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_CONFLICT,
  'PII service config management has been retired from TMS. Use TCRN_PII_PLATFORM integration adapters instead.',
);

@ApiTags('System - PII')
@ApiBearerAuth()
@Controller('pii-service-configs')
export class PiiServiceConfigController {
  constructor(private readonly _piiServiceConfigService: PiiServiceConfigService) {}

  /**
   * List PII service configs
   */
  @Get()
  @RequirePermissions({ resource: 'config.pii_service', action: 'read' })
  @ApiOperation({ summary: 'Retired: list PII service configs' })
  @ApiResponse({ status: 401, description: 'Authentication is required to list PII service configs', schema: PII_SERVICE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list PII service configs', schema: PII_SERVICE_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 409, description: 'PII service-config management has been retired', schema: PII_SERVICE_CONFIG_RETIRED_SCHEMA })
  async list(
    @Query() _query: PaginationQueryDto,
    @CurrentUser() _user: { id: string; username: string; tenantSchema?: string },
    @Req() _req: Request,
  ) {
    this.throwRetired();
  }

  /**
   * Get PII service config by ID
   */
  @Get(':id')
  @RequirePermissions({ resource: 'config.pii_service', action: 'read' })
  @ApiOperation({ summary: 'Retired: get PII service config' })
  @ApiParam({
    name: 'id',
    description: 'PII service-config identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 401, description: 'Authentication is required to read PII service configs', schema: PII_SERVICE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read PII service configs', schema: PII_SERVICE_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 409, description: 'PII service-config management has been retired', schema: PII_SERVICE_CONFIG_RETIRED_SCHEMA })
  async getById(
    @Param('id', ParseUUIDPipe) _id: string,
    @CurrentUser() _user: { id: string; username: string; tenantSchema?: string },
    @Req() _req: Request,
  ) {
    this.throwRetired();
  }

  /**
   * Create PII service config
   */
  @Post()
  @RequirePermissions({ resource: 'config.pii_service', action: 'create' })
  @ApiOperation({ summary: 'Retired: create PII service config' })
  @ApiResponse({ status: 401, description: 'Authentication is required to create PII service configs', schema: PII_SERVICE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create PII service configs', schema: PII_SERVICE_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 409, description: 'PII service-config management has been retired', schema: PII_SERVICE_CONFIG_RETIRED_SCHEMA })
  async create(
    @Body() _dto: CreatePiiServiceConfigDto,
    @CurrentUser() _user: { id: string; username: string; tenantSchema?: string },
    @Req() _req: Request,
  ) {
    this.throwRetired();
  }

  /**
   * Update PII service config
   */
  @Patch(':id')
  @RequirePermissions({ resource: 'config.pii_service', action: 'update' })
  @ApiOperation({ summary: 'Retired: update PII service config' })
  @ApiParam({
    name: 'id',
    description: 'PII service-config identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 401, description: 'Authentication is required to update PII service configs', schema: PII_SERVICE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update PII service configs', schema: PII_SERVICE_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 409, description: 'PII service-config management has been retired', schema: PII_SERVICE_CONFIG_RETIRED_SCHEMA })
  async update(
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() _dto: UpdatePiiServiceConfigDto,
    @CurrentUser() _user: { id: string; username: string; tenantSchema?: string },
    @Req() _req: Request,
  ) {
    this.throwRetired();
  }

  /**
   * Test PII service connection
   */
  @Post(':id/test')
  @RequirePermissions({ resource: 'config.pii_service', action: 'read' })
  @ApiOperation({ summary: 'Retired: test PII service connection' })
  @ApiParam({
    name: 'id',
    description: 'PII service-config identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 401, description: 'Authentication is required to test PII service configs', schema: PII_SERVICE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to test PII service configs', schema: PII_SERVICE_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 409, description: 'PII service-config management has been retired', schema: PII_SERVICE_CONFIG_RETIRED_SCHEMA })
  async testConnection(
    @Param('id', ParseUUIDPipe) _id: string,
    @CurrentUser() _user: { id: string; username: string; tenantSchema?: string },
    @Req() _req: Request,
  ) {
    this.throwRetired();
  }

  private throwRetired(): never {
    throw new ConflictException({
      code: ErrorCodes.RES_CONFLICT,
      message:
        'PII service config management has been retired from TMS. Use TCRN_PII_PLATFORM integration adapters instead.',
    });
  }
}
