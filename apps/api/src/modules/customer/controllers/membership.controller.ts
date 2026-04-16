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
    CreateMembershipDto,
    MembershipListQueryDto,
    UpdateMembershipDto,
} from '../dto/customer.dto';
import { MembershipRecordService } from '../services/membership-record.service';
import {
  CUSTOMER_BAD_REQUEST_SCHEMA,
  CUSTOMER_FORBIDDEN_SCHEMA,
  CUSTOMER_NOT_FOUND_SCHEMA,
  CUSTOMER_UNAUTHORIZED_SCHEMA,
  CUSTOMER_UPDATE_SCHEMA,
  MEMBERSHIP_CREATE_SCHEMA,
  MEMBERSHIP_LIST_SCHEMA,
} from './customer-swagger.schemas';

@ApiTags('Customer - Memberships')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
@Controller('talents/:talentId/customers/:customerId/memberships')
export class MembershipController {
  constructor(
    private readonly membershipRecordService: MembershipRecordService,
  ) {}

  /**
   * Get membership records for a customer
   */
  @Get()
  @RequirePermissions({ resource: 'customer.membership', action: 'read' })
  @ApiOperation({ summary: 'List membership records' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns membership records', schema: MEMBERSHIP_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read membership records', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read membership records', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async list(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: MembershipListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.membershipRecordService.findByCustomer(customerId, talentId, query, context);
  }

  /**
   * Add membership record
   */
  @Post()
  @RequirePermissions({ resource: 'customer.membership', action: 'create' })
  @ApiOperation({ summary: 'Add membership record' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Membership added', schema: MEMBERSHIP_CREATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Membership payload is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to add membership records', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to add membership records', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or membership dependency was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async create(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateMembershipDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.membershipRecordService.create(customerId, talentId, dto, context);
  }

  /**
   * Update membership record
   */
  @Patch(':recordId')
  @RequirePermissions({ resource: 'customer.membership', action: 'update' })
  @ApiOperation({ summary: 'Update membership record' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'recordId', description: 'Membership-record identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Membership updated', schema: CUSTOMER_UPDATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Membership update is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update membership records', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update membership records', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Membership record or dependent resource was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async update(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: UpdateMembershipDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.membershipRecordService.update(
      customerId,
      recordId,
      talentId,
      dto,
      context,
    );
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
