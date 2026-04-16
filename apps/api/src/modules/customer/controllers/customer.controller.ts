// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request, Response } from 'express';

import {
    AuthenticatedUser,
    CurrentUser,
    RequirePermissions,
    RequirePublishedTalentAccess,
} from '../../../common/decorators';
import {
    BatchOperationDto,
    CreateCompanyCustomerDto,
    CreateIndividualCustomerDto,
    CustomerListQueryDto,
    DeactivateCustomerDto,
    UpdateCompanyCustomerDto,
    UpdateIndividualCustomerDto,
    UpdateIndividualPiiDto,
} from '../dto/customer.dto';
import { BatchOperationService } from '../services/batch-operation.service';
import { CompanyCustomerService } from '../services/company-customer.service';
import { CustomerProfileService } from '../services/customer-profile.service';
import { IndividualCustomerService } from '../services/individual-customer.service';
import {
  CUSTOMER_ACTIVATION_SCHEMA,
  CUSTOMER_BAD_REQUEST_SCHEMA,
  CUSTOMER_BATCH_QUEUED_SCHEMA,
  CUSTOMER_BATCH_RESULT_SCHEMA,
  CUSTOMER_COMPANY_CREATE_SCHEMA,
  CUSTOMER_CONFLICT_SCHEMA,
  CUSTOMER_DETAIL_SCHEMA,
  CUSTOMER_FORBIDDEN_SCHEMA,
  CUSTOMER_INDIVIDUAL_CREATE_SCHEMA,
  CUSTOMER_LIST_SCHEMA,
  CUSTOMER_NOT_FOUND_SCHEMA,
  CUSTOMER_PII_PORTAL_SESSION_SCHEMA,
  CUSTOMER_PII_UPDATE_SCHEMA,
  CUSTOMER_UNAUTHORIZED_SCHEMA,
  CUSTOMER_UPDATE_SCHEMA,
} from './customer-swagger.schemas';

@ApiTags('Customer - Profiles')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
@Controller('talents/:talentId/customers')
export class CustomerController {
  constructor(
    private readonly customerProfileService: CustomerProfileService,
    private readonly individualCustomerService: IndividualCustomerService,
    private readonly companyCustomerService: CompanyCustomerService,
    private readonly batchOperationService: BatchOperationService,
  ) {}

  /**
   * Get customer list
   */
  @Get()
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ 
    summary: 'List customers',
    description: `Returns a paginated list of customers for the specified talent.
    
Supports filtering by profile type, status, tags, membership status, and date range.
Results include both individual and company customers.`,
  })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns paginated customer list',
    schema: CUSTOMER_LIST_SCHEMA,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  async list(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Query() query: CustomerListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.customerProfileService.findMany(talentId, query, context);
    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }

  /**
   * Get customer detail
   */
  @Get(':customerId')
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ summary: 'Get customer detail' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns customer detail', schema: CUSTOMER_DETAIL_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read customer detail', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read customer detail', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async getById(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.customerProfileService.findById(customerId, talentId, context);
  }

  /**
   * Create individual customer
   */
  @Post('individuals')
  @RequirePermissions({ resource: 'customer.profile', action: 'create' })
  @ApiOperation({ summary: 'Create individual customer' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Customer created', schema: CUSTOMER_INDIVIDUAL_CREATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Individual-customer payload is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create individual customers', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create individual customers', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent or customer dependency was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async createIndividual(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: CreateIndividualCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.individualCustomerService.create(talentId, dto, context);
  }

  /**
   * Update individual customer (non-PII fields)
   */
  @Patch('individuals/:customerId')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Update individual customer' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Customer updated', schema: CUSTOMER_UPDATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Individual-customer update is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update individual customers', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update individual customers', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or talent was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Individual-customer update conflicted with current stored version', schema: CUSTOMER_CONFLICT_SCHEMA })
  async updateIndividual(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateIndividualCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.individualCustomerService.update(customerId, talentId, dto, context);
  }

  /**
   * Create a PII portal session
   */
  @Post('individuals/:customerId/pii-portal-session')
  @HttpCode(200)
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ summary: 'Create PII portal session' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns one-time PII portal redirect data', schema: CUSTOMER_PII_PORTAL_SESSION_SCHEMA })
  @ApiResponse({ status: 400, description: 'PII portal session request is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create a PII portal session', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create a PII portal session', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or talent was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async createPiiPortalSession(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.individualCustomerService.createPiiPortalSession(customerId, talentId, context);
  }

  /**
   * Create a company-customer PII portal session
   */
  @Post('companies/:customerId/pii-portal-session')
  @HttpCode(200)
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ summary: 'Create company-customer PII portal session' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns one-time PII portal redirect data', schema: CUSTOMER_PII_PORTAL_SESSION_SCHEMA })
  @ApiResponse({ status: 400, description: 'PII portal session request is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create a PII portal session', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create a PII portal session', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or talent was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async createCompanyPiiPortalSession(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.companyCustomerService.createPiiPortalSession(customerId, talentId, context);
  }

  /**
   * Update individual customer PII
   */
  @Patch('individuals/:customerId/pii')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Update individual customer PII' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'PII update submitted', schema: CUSTOMER_PII_UPDATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'PII update payload is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update customer PII', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update customer PII', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or talent was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Customer PII update conflicted with current stored version', schema: CUSTOMER_CONFLICT_SCHEMA })
  async updateIndividualPii(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateIndividualPiiDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.individualCustomerService.updatePii(customerId, talentId, dto, context);
  }

  /**
   * Create company customer
   */
  @Post('companies')
  @RequirePermissions({ resource: 'customer.profile', action: 'create' })
  @ApiOperation({ summary: 'Create company customer' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Company created', schema: CUSTOMER_COMPANY_CREATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Company-customer payload is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create company customers', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create company customers', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent or customer dependency was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async createCompany(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: CreateCompanyCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.companyCustomerService.create(talentId, dto, context);
  }

  /**
   * Update company customer
   */
  @Patch('companies/:customerId')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Update company customer' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Company updated', schema: CUSTOMER_UPDATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Company-customer update is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update company customers', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update company customers', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or talent was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Company-customer update conflicted with current stored version', schema: CUSTOMER_CONFLICT_SCHEMA })
  async updateCompany(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateCompanyCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.companyCustomerService.update(customerId, talentId, dto, context);
  }

  /**
   * Deactivate customer
   */
  @Post(':customerId/deactivate')
  @HttpCode(200)
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Deactivate customer' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Customer deactivated', schema: CUSTOMER_ACTIVATION_SCHEMA })
  @ApiResponse({ status: 400, description: 'Deactivate request is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to deactivate customers', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to deactivate customers', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Deactivate request conflicted with current stored version', schema: CUSTOMER_CONFLICT_SCHEMA })
  async deactivate(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: DeactivateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.customerProfileService.deactivate(
      customerId,
      talentId,
      dto.reasonCode,
      dto.version,
      context,
    );
  }

  /**
   * Reactivate customer
   */
  @Post(':customerId/reactivate')
  @HttpCode(200)
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Reactivate customer' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'customerId', description: 'Customer identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Customer reactivated', schema: CUSTOMER_ACTIVATION_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to reactivate customers', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to reactivate customers', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async reactivate(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.customerProfileService.reactivate(customerId, talentId, context);
  }

  // ==========================================================================
  // Batch Operations (PRD §11.7)
  // ==========================================================================

  /**
   * Execute batch operation on multiple customers
   */
  @Post('batch')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Execute batch operation on customers' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Batch operation completed', schema: CUSTOMER_BATCH_RESULT_SCHEMA })
  @ApiResponse({ status: 202, description: 'Batch operation queued for async processing', schema: CUSTOMER_BATCH_QUEUED_SCHEMA })
  @ApiResponse({ status: 400, description: 'Batch operation request is invalid', schema: CUSTOMER_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to execute customer batch operations', schema: CUSTOMER_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to execute customer batch operations', schema: CUSTOMER_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Customer or membership dependency was not found', schema: CUSTOMER_NOT_FOUND_SCHEMA })
  async batchOperation(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: BatchOperationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.batchOperationService.executeBatch(talentId, dto, context);

    if ('jobId' in result) {
      res.status(202);
    } else {
      res.status(200);
    }

    return result;
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
