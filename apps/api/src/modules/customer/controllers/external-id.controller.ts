// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import { CreateExternalIdDto } from '../dto/customer.dto';
import { CustomerExternalIdService } from '../services/external-id.service';

@ApiTags('Customer - External IDs')
@Controller('customers/:customerId/external-ids')
export class ExternalIdController {
  constructor(
    private readonly externalIdService: CustomerExternalIdService,
  ) {}

  /**
   * Get external IDs for a customer
   */
  @Get()
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ summary: 'List customer external IDs' })
  @ApiResponse({ status: 200, description: 'Returns external IDs' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async list(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Headers('x-talent-id') talentId: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.externalIdService.findByCustomer(customerId, talentId, context);
  }

  /**
   * Add external ID
   */
  @Post()
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Add external ID' })
  @ApiResponse({ status: 201, description: 'External ID added' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Headers('x-talent-id') talentId: string,
    @Body() dto: CreateExternalIdDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.externalIdService.create(customerId, talentId, dto, context);
  }

  /**
   * Delete external ID
   */
  @Delete(':externalIdId')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Delete external ID' })
  @ApiResponse({ status: 200, description: 'External ID deleted' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async delete(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('externalIdId', ParseUUIDPipe) externalIdId: string,
    @Headers('x-talent-id') talentId: string,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    await this.externalIdService.delete(customerId, externalIdId, talentId, context);
    return { message: 'External ID deleted' };
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
