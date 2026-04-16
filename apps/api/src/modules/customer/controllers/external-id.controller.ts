// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import {
    CurrentUser,
    RequirePermissions,
    RequirePublishedTalentAccess,
} from '../../../common/decorators';
import { CreateExternalIdDto } from '../dto/customer.dto';
import { CustomerExternalIdService } from '../services/external-id.service';
import {
  CUSTOMER_ALREADY_EXISTS_SCHEMA,
  CUSTOMER_BAD_REQUEST_SCHEMA,
  CUSTOMER_EXTERNAL_ID_DELETE_SCHEMA,
  CUSTOMER_EXTERNAL_ID_ITEM_SCHEMA,
  CUSTOMER_EXTERNAL_ID_LIST_SCHEMA,
  CUSTOMER_FORBIDDEN_SCHEMA,
  CUSTOMER_NOT_FOUND_SCHEMA,
  CUSTOMER_UNAUTHORIZED_SCHEMA,
} from './customer-swagger.schemas';

@ApiTags('Customer - External IDs')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
@Controller('talents/:talentId/customers/:customerId/external-ids')
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns external IDs', schema: CUSTOMER_EXTERNAL_ID_LIST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read customer external IDs', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read customer external IDs', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async list(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'External ID added', schema: CUSTOMER_EXTERNAL_ID_ITEM_SCHEMA })
  @ApiResponse({ status: 400, description: 'External-ID payload is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to add external IDs', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to add external IDs', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or consumer was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'External ID already exists for this customer', schema: CUSTOMER_ALREADY_EXISTS_SCHEMA })
  async create(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'externalIdId', description: 'External-ID identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'External ID deleted', schema: CUSTOMER_EXTERNAL_ID_DELETE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to delete external IDs', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to delete external IDs', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or external ID was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async delete(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('externalIdId', ParseUUIDPipe) externalIdId: string,
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
