// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
    BatchToggleDto,
    CreateExternalBlocklistDto,
    DisableExternalBlocklistDto,
    ExternalBlocklistQueryDto,
    OwnerType,
    UpdateExternalBlocklistDto,
} from '../dto/external-blocklist.dto';
import { ExternalBlocklistService } from '../services/external-blocklist.service';
import {
  EXTERNAL_BLOCKLIST_BATCH_SCHEMA,
  EXTERNAL_BLOCKLIST_DELETE_SCHEMA,
  EXTERNAL_BLOCKLIST_DISABLE_SCHEMA,
  EXTERNAL_BLOCKLIST_ENABLE_SCHEMA,
  EXTERNAL_BLOCKLIST_ITEM_ENVELOPE_SCHEMA,
  EXTERNAL_BLOCKLIST_LIST_SCHEMA,
  EXTERNAL_BLOCKLIST_SCOPE_SCHEMA,
  MARSHMALLOW_ALREADY_EXISTS_SCHEMA,
  MARSHMALLOW_BAD_REQUEST_SCHEMA,
  MARSHMALLOW_CONFLICT_SCHEMA,
  MARSHMALLOW_FORBIDDEN_SCHEMA,
  MARSHMALLOW_NOT_FOUND_SCHEMA,
  MARSHMALLOW_UNAUTHORIZED_SCHEMA,
} from './marshmallow-swagger.schemas';

// Authenticated user type with tenantSchema
interface AuthenticatedUser {
  id: string;
  username: string;
  tenantSchema: string;
}

@ApiTags('Ops - Blocklist')
@ApiBearerAuth()
@Controller('external-blocklist')
export class ExternalBlocklistController {
  constructor(private readonly service: ExternalBlocklistService) {}

  /**
   * List external blocklist patterns
   */
  @Get()
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'read' })
  @ApiOperation({ summary: 'List external blocklist patterns' })
  @ApiResponse({ status: 200, description: 'Returns patterns list', schema: EXTERNAL_BLOCKLIST_LIST_SCHEMA })
  @ApiResponse({ status: 400, description: 'External-blocklist query is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to list external blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list external blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
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
  @ApiParam({ name: 'scopeType', description: 'Owner scope type', schema: { type: 'string', enum: ['tenant', 'subsidiary', 'talent'] } })
  @ApiParam({ name: 'scopeId', description: 'Owner scope identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns inherited patterns', schema: EXTERNAL_BLOCKLIST_SCOPE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read inherited blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read inherited blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns inherited patterns', schema: EXTERNAL_BLOCKLIST_SCOPE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read talent inherited blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read talent inherited blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
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
  @ApiParam({ name: 'id', description: 'External-blocklist identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns pattern', schema: EXTERNAL_BLOCKLIST_ITEM_ENVELOPE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read external blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read external blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'External blocklist pattern was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.service.findById(user.tenantSchema, id);
    if (!item) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'External blocklist pattern not found',
      });
    }

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
  @ApiResponse({ status: 201, description: 'Pattern created', schema: EXTERNAL_BLOCKLIST_ITEM_ENVELOPE_SCHEMA })
  @ApiResponse({ status: 400, description: 'External-blocklist payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create external blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create external blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 409, description: 'External blocklist pattern already exists in the same scope', schema: MARSHMALLOW_ALREADY_EXISTS_SCHEMA })
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
  @ApiParam({ name: 'id', description: 'External-blocklist identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Pattern updated', schema: EXTERNAL_BLOCKLIST_ITEM_ENVELOPE_SCHEMA })
  @ApiResponse({ status: 400, description: 'External-blocklist update is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update external blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update external blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'External blocklist pattern was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'External blocklist update conflicted with current stored version or scope state', schema: MARSHMALLOW_CONFLICT_SCHEMA })
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
  @ApiParam({ name: 'id', description: 'External-blocklist identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Pattern deleted', schema: EXTERNAL_BLOCKLIST_DELETE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to delete external blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to delete external blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'External blocklist pattern was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @HttpCode(200)
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'update' })
  @ApiOperation({ summary: 'Disable inherited pattern in current scope' })
  @ApiParam({ name: 'id', description: 'Inherited external-blocklist identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Pattern disabled', schema: EXTERNAL_BLOCKLIST_DISABLE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Disable request is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to disable inherited blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to disable inherited blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Inherited external blocklist pattern was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @HttpCode(200)
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'update' })
  @ApiOperation({ summary: 'Enable pattern in current scope' })
  @ApiParam({ name: 'id', description: 'Inherited external-blocklist identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Pattern enabled', schema: EXTERNAL_BLOCKLIST_ENABLE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Enable request is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to enable inherited blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to enable inherited blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Inherited external blocklist pattern was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @HttpCode(200)
  @RequirePermissions({ resource: 'security.external_blocklist', action: 'update' })
  @ApiOperation({ summary: 'Batch toggle active status' })
  @ApiResponse({ status: 200, description: 'Patterns updated', schema: EXTERNAL_BLOCKLIST_BATCH_SCHEMA })
  @ApiResponse({ status: 400, description: 'Batch-toggle payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to batch-toggle external blocklist patterns', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to batch-toggle external blocklist patterns', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
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
