// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { RequirePermissions, CurrentUser } from '../../../common/decorators';
import {
  ExternalBlocklistQueryDto,
  CreateExternalBlocklistDto,
  UpdateExternalBlocklistDto,
  BatchToggleDto,
  DisableExternalBlocklistDto,
  OwnerType,
} from '../dto/external-blocklist.dto';
import { ExternalBlocklistService } from '../services/external-blocklist.service';

// Authenticated user type with tenantSchema
interface AuthenticatedUser {
  id: string;
  username: string;
  tenantSchema: string;
}

@ApiTags('External Blocklist')
@Controller('external-blocklist')
export class ExternalBlocklistController {
  constructor(private readonly service: ExternalBlocklistService) {}

  /**
   * List external blocklist patterns
   */
  @Get()
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'read' })
  @ApiOperation({ summary: 'List external blocklist patterns' })
  @ApiResponse({ status: 200, description: 'Returns patterns list' })
  async findMany(
    @Query() query: ExternalBlocklistQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.findMany(user.tenantSchema, query);
    return {
      success: true,
      data: result.items,
      meta: {
        pagination: {
          page: query.page || 1,
          pageSize: query.pageSize || 20,
          totalCount: result.total,
          totalPages: Math.ceil(result.total / (query.pageSize || 20)),
        },
      },
    };
  }

  /**
   * Get patterns with inheritance for a specific scope (talent or subsidiary)
   */
  @Get('scope/:scopeType/:scopeId')
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'read' })
  @ApiOperation({ summary: 'Get patterns with inheritance for scope' })
  @ApiResponse({ status: 200, description: 'Returns inherited patterns' })
  async findWithInheritance(
    @Param('scopeType') scopeType: string,
    @Param('scopeId', ParseUUIDPipe) scopeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const items = await this.service.findWithInheritance(
      user.tenantSchema, 
      scopeType as OwnerType, 
      scopeId,
    );
    return {
      success: true,
      data: items,
    };
  }

  /**
   * Get patterns with inheritance for a specific talent (legacy endpoint)
   */
  @Get('talent/:talentId')
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'read' })
  @ApiOperation({ summary: 'Get patterns with inheritance for talent' })
  @ApiResponse({ status: 200, description: 'Returns inherited patterns' })
  async findWithInheritanceTalent(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const items = await this.service.findWithInheritance(
      user.tenantSchema, 
      OwnerType.TALENT, 
      talentId,
    );
    return {
      success: true,
      data: items,
    };
  }

  /**
   * Get single pattern by ID
   */
  @Get(':id')
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'read' })
  @ApiOperation({ summary: 'Get external blocklist pattern by ID' })
  @ApiResponse({ status: 200, description: 'Returns pattern' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.service.findById(user.tenantSchema, id);
    return {
      success: true,
      data: item,
    };
  }

  /**
   * Create external blocklist pattern
   */
  @Post()
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'create' })
  @ApiOperation({ summary: 'Create external blocklist pattern' })
  @ApiResponse({ status: 201, description: 'Pattern created' })
  async create(
    @Body() dto: CreateExternalBlocklistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const item = await this.service.create(user.tenantSchema, dto, context);
    return {
      success: true,
      data: item,
    };
  }

  /**
   * Update external blocklist pattern
   */
  @Patch(':id')
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'update' })
  @ApiOperation({ summary: 'Update external blocklist pattern' })
  @ApiResponse({ status: 200, description: 'Pattern updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExternalBlocklistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const item = await this.service.update(user.tenantSchema, id, dto, context);
    return {
      success: true,
      data: item,
    };
  }

  /**
   * Delete external blocklist pattern
   */
  @Delete(':id')
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'delete' })
  @ApiOperation({ summary: 'Delete external blocklist pattern' })
  @ApiResponse({ status: 200, description: 'Pattern deleted' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.delete(user.tenantSchema, id);
    return {
      success: true,
      message: 'Pattern deleted',
    };
  }

  /**
   * Disable inherited pattern in current scope
   */
  @Post(':id/disable')
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'update' })
  @ApiOperation({ summary: 'Disable inherited pattern in current scope' })
  @ApiResponse({ status: 200, description: 'Pattern disabled' })
  async disableInScope(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisableExternalBlocklistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.disableInScope(
      user.tenantSchema,
      id,
      dto,
      user.id,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Enable previously disabled pattern in current scope
   */
  @Post(':id/enable')
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'update' })
  @ApiOperation({ summary: 'Enable pattern in current scope' })
  @ApiResponse({ status: 200, description: 'Pattern enabled' })
  async enableInScope(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisableExternalBlocklistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.enableInScope(
      user.tenantSchema,
      id,
      dto,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Batch toggle active status
   */
  @Post('batch-toggle')
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'update' })
  @ApiOperation({ summary: 'Batch toggle active status' })
  @ApiResponse({ status: 200, description: 'Patterns updated' })
  async batchToggle(
    @Body() dto: BatchToggleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.service.batchToggle(
      user.tenantSchema,
      dto.ids,
      dto.isActive,
      context,
    );
    return {
      success: true,
      data: result,
    };
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
