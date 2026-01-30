// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    Headers,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
    CreatePlatformIdentityDto,
    PlatformIdentityHistoryQueryDto,
    UpdatePlatformIdentityDto,
} from '../dto/customer.dto';
import { PlatformIdentityService } from '../services/platform-identity.service';

@ApiTags('Customer - Platform IDs')
@Controller('customers/:customerId/platform-identities')
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
  @ApiResponse({ status: 200, description: 'Returns platform identities' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async list(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Headers('x-talent-id') talentId: string,
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
  @ApiResponse({ status: 201, description: 'Platform identity added' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Headers('x-talent-id') talentId: string,
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
  @ApiResponse({ status: 200, description: 'Platform identity updated' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async update(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Headers('x-talent-id') talentId: string,
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
  @ApiResponse({ status: 200, description: 'Returns identity history' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async getHistory(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Headers('x-talent-id') talentId: string,
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
