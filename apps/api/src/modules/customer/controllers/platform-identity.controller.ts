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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import {
    AuthenticatedUser,
    CurrentUser,
    RequirePermissions,
    RequirePublishedTalentAccess,
} from '../../../common/decorators';
import {
    CreatePlatformIdentityDto,
    PlatformIdentityHistoryQueryDto,
    UpdatePlatformIdentityDto,
} from '../dto/customer.dto';
import { PlatformIdentityService } from '../services/platform-identity.service';
import {
  CUSTOMER_ALREADY_EXISTS_SCHEMA,
  CUSTOMER_BAD_REQUEST_SCHEMA,
  CUSTOMER_FORBIDDEN_SCHEMA,
  CUSTOMER_NOT_FOUND_SCHEMA,
  CUSTOMER_UNAUTHORIZED_SCHEMA,
  PLATFORM_IDENTITY_CREATE_SCHEMA,
  PLATFORM_IDENTITY_HISTORY_SCHEMA,
  PLATFORM_IDENTITY_LIST_SCHEMA,
  PLATFORM_IDENTITY_UPDATE_SCHEMA,
} from './customer-swagger.schemas';

@ApiTags('Customer - Platform IDs')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
@Controller('talents/:talentId/customers/:customerId/platform-identities')
export class PlatformIdentityController {
  constructor(
    private readonly platformIdentityService: PlatformIdentityService,
  ) {}

  /**
   * Get platform identities for a customer
   */
  @Get()
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ summary: 'List platform identities' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns platform identities', schema: PLATFORM_IDENTITY_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read platform identities', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read platform identities', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async list(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.platformIdentityService.findByCustomer(customerId, talentId, context);
  }

  /**
   * Add platform identity
   */
  @Post()
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Add platform identity' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Platform identity added', schema: PLATFORM_IDENTITY_CREATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Platform-identity payload is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to add platform identities', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to add platform identities', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or platform was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Platform identity already exists for this customer', schema: CUSTOMER_ALREADY_EXISTS_SCHEMA })
  async create(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreatePlatformIdentityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.platformIdentityService.create(customerId, talentId, dto, context);
  }

  /**
   * Update platform identity
   */
  @Patch(':identityId')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Update platform identity' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'identityId', description: 'Platform-identity identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Platform identity updated', schema: PLATFORM_IDENTITY_UPDATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Platform-identity update is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update platform identities', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update platform identities', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Platform identity or dependent resource was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Platform identity update conflicted with current data', schema: CUSTOMER_ALREADY_EXISTS_SCHEMA })
  async update(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Body() dto: UpdatePlatformIdentityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.platformIdentityService.update(
      customerId,
      identityId,
      talentId,
      dto,
      context,
    );
  }

  /**
   * Get platform identity history
   */
  @Get('history')
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ summary: 'Get platform identity history' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns identity history', schema: PLATFORM_IDENTITY_HISTORY_SCHEMA })
  @ApiResponse({ status: 400, description: 'Platform-identity history query is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read platform-identity history', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read platform-identity history', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async getHistory(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: PlatformIdentityHistoryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.platformIdentityService.getHistory(customerId, talentId, query, context);
  }

  /**
   * Build request context
   */
  private buildContext(
    user: AuthenticatedUser,
    req: Request,
  ): RequestContext {
    return {
      userId: user.id,
      userName: user.username,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
      tenantId: user.tenantId,
      tenantSchema: user.tenantSchema,
    };
  }
}
