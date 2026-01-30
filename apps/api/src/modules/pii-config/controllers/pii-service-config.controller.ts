// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
    CreatePiiServiceConfigDto,
    PaginationQueryDto,
    UpdatePiiServiceConfigDto,
} from '../dto/pii-config.dto';
import { PiiServiceConfigService } from '../services/pii-service-config.service';

@ApiTags('System - PII')
@Controller('pii-service-configs')
export class PiiServiceConfigController {
  constructor(
    private readonly piiServiceConfigService: PiiServiceConfigService,
  ) {}

  /**
   * List PII service configs
   */
  @Get()
  @RequirePermissions({ resource: 'config.pii_service', action: 'read' })
  @ApiOperation({ summary: 'List PII service configs' })
  @ApiResponse({ status: 200, description: 'Returns PII service config list' })
  async list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.piiServiceConfigService.findMany(query, context);
  }

  /**
   * Get PII service config by ID
   */
  @Get(':id')
  @RequirePermissions({ resource: 'config.pii_service', action: 'read' })
  @ApiOperation({ summary: 'Get PII service config' })
  @ApiResponse({ status: 200, description: 'Returns PII service config' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.piiServiceConfigService.findById(id, context);
  }

  /**
   * Create PII service config
   */
  @Post()
  @RequirePermissions({ resource: 'config.pii_service', action: 'create' })
  @ApiOperation({ summary: 'Create PII service config' })
  @ApiResponse({ status: 201, description: 'Config created' })
  async create(
    @Body() dto: CreatePiiServiceConfigDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.piiServiceConfigService.create(dto, context);
  }

  /**
   * Update PII service config
   */
  @Patch(':id')
  @RequirePermissions({ resource: 'config.pii_service', action: 'update' })
  @ApiOperation({ summary: 'Update PII service config' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePiiServiceConfigDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.piiServiceConfigService.update(id, dto, context);
  }

  /**
   * Test PII service connection
   */
  @Post(':id/test')
  @RequirePermissions({ resource: 'config.pii_service', action: 'read' })
  @ApiOperation({ summary: 'Test PII service connection' })
  @ApiResponse({ status: 200, description: 'Returns connection test result' })
  async testConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.piiServiceConfigService.testConnection(id, context);
  }

  /**
   * Build request context
   */
  private buildContext(
    user: { id: string; username: string; tenantSchema?: string },
    req: Request,
  ): RequestContext {
    return {
      userId: user.id,
      userName: user.username,
      tenantSchema: user.tenantSchema || 'public',
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }
}
