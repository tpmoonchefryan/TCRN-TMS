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

@ApiTags('Customer - Profiles')
@Controller('customers')
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
  @ApiResponse({ 
    status: 200, 
    description: 'Returns paginated customer list',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            nickname: 'John Doe',
            profileType: 'individual',
            statusCode: 'active',
            tags: ['VIP', 'Premium'],
            isActive: true,
            createdAt: '2024-01-15T10:30:00Z',
          },
        ],
        meta: {
          pagination: {
            page: 1,
            pageSize: 20,
            totalCount: 150,
            totalPages: 8,
            hasNext: true,
            hasPrev: false,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async list(
    @Query() query: CustomerListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.customerProfileService.findMany(query, context);
    return {
      success: true,
      data: result.items,
      meta: result.meta,
    };
  }

  /**
   * Get customer detail
   */
  @Get(':id')
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ summary: 'Get customer detail' })
  @ApiResponse({ status: 200, description: 'Returns customer detail' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-talent-id') talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.customerProfileService.findById(id, talentId, context);
  }

  /**
   * Create individual customer
   */
  @Post('individuals')
  @RequirePermissions({ resource: 'customer.profile', action: 'create' })
  @ApiOperation({ summary: 'Create individual customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async createIndividual(
    @Body() dto: CreateIndividualCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.individualCustomerService.create(dto, context);
  }

  /**
   * Update individual customer (non-PII fields)
   */
  @Patch('individuals/:id')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Update individual customer' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async updateIndividual(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-talent-id') talentId: string,
    @Body() dto: UpdateIndividualCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.individualCustomerService.update(id, talentId, dto, context);
  }

  /**
   * Request PII access token
   */
  @Post('individuals/:id/request-pii-access')
  @RequirePermissions({ resource: 'customer.profile', action: 'read' })
  @ApiOperation({ summary: 'Request PII access token' })
  @ApiResponse({ status: 200, description: 'Returns PII access token' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async requestPiiAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-talent-id') talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.individualCustomerService.requestPiiAccess(id, talentId, context);
  }

  /**
   * Update individual customer PII
   */
  @Patch('individuals/:id/pii')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Update individual customer PII' })
  @ApiResponse({ status: 200, description: 'PII update submitted' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async updateIndividualPii(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-talent-id') talentId: string,
    @Body() dto: UpdateIndividualPiiDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.individualCustomerService.updatePii(id, talentId, dto, context);
  }

  /**
   * Create company customer
   */
  @Post('companies')
  @RequirePermissions({ resource: 'customer.profile', action: 'create' })
  @ApiOperation({ summary: 'Create company customer' })
  @ApiResponse({ status: 201, description: 'Company created' })
  async createCompany(
    @Body() dto: CreateCompanyCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.companyCustomerService.create(dto, context);
  }

  /**
   * Update company customer
   */
  @Patch('companies/:id')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Update company customer' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async updateCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-talent-id') talentId: string,
    @Body() dto: UpdateCompanyCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.companyCustomerService.update(id, talentId, dto, context);
  }

  /**
   * Deactivate customer
   */
  @Post(':id/deactivate')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Deactivate customer' })
  @ApiResponse({ status: 200, description: 'Customer deactivated' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-talent-id') talentId: string,
    @Body() dto: DeactivateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.customerProfileService.deactivate(
      id,
      talentId,
      dto.reasonCode,
      dto.version,
      context,
    );
  }

  /**
   * Reactivate customer
   */
  @Post(':id/reactivate')
  @RequirePermissions({ resource: 'customer.profile', action: 'update' })
  @ApiOperation({ summary: 'Reactivate customer' })
  @ApiResponse({ status: 200, description: 'Customer reactivated' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-talent-id') talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.customerProfileService.reactivate(id, talentId, context);
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
  @ApiResponse({ status: 200, description: 'Batch operation completed' })
  @ApiResponse({ status: 202, description: 'Batch operation queued for async processing' })
  @ApiHeader({ name: 'X-Talent-Id', required: true, description: 'Current talent ID' })
  async batchOperation(
    @Headers('x-talent-id') talentId: string,
    @Body() dto: BatchOperationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.batchOperationService.executeBatch(talentId, dto, context);
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
