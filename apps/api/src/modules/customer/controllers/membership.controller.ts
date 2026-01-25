// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
  MembershipListQueryDto,
  CreateMembershipDto,
  UpdateMembershipDto,
} from '../dto/customer.dto';
import { MembershipRecordService } from '../services/membership-record.service';

@ApiTags('Customers - Memberships')
@Controller('customers/:customerId/memberships')
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
  @ApiResponse({ status: 200, description: 'Returns membership records' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async list(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Headers('x-talent-id') talentId: string,
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
  @ApiResponse({ status: 201, description: 'Membership added' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Headers('x-talent-id') talentId: string,
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
  @ApiResponse({ status: 200, description: 'Membership updated' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async update(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Headers('x-talent-id') talentId: string,
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
