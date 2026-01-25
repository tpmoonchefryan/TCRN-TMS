// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Request } from 'express';

import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';

import { DelegatedAdminService, DelegateScopeType, DelegateType } from './delegated-admin.service';

// DTOs
class ListDelegatedAdminsQueryDto {
  @IsOptional()
  @IsEnum(['subsidiary', 'talent'])
  scopeType?: DelegateScopeType;

  @IsOptional()
  @IsString()
  scopeId?: string;
}

class CreateDelegatedAdminDto {
  @IsEnum(['subsidiary', 'talent'])
  scopeType: DelegateScopeType;

  @IsString()
  scopeId: string;

  @IsEnum(['user', 'role'])
  delegateType: DelegateType;

  @IsString()
  delegateId: string;
}

/**
 * Delegated Admin Controller
 * Manages delegation of admin rights to users or roles
 * PRD §13.3 - Delegated Admin
 */
@ApiTags('Delegated Admins')
@Controller('delegated-admins')
@ApiBearerAuth()
export class DelegatedAdminController {
  constructor(private readonly delegatedAdminService: DelegatedAdminService) {}

  /**
   * GET /api/v1/delegated-admins
   * List delegated admins with optional filters
   */
  @Get()
  @ApiOperation({ summary: 'List delegated admins' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDelegatedAdminsQueryDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const delegations = await this.delegatedAdminService.list(
      user.tenantSchema,
      {
        scopeType: query.scopeType,
        scopeId: query.scopeId,
      },
      language,
    );

    const data = delegations.map((d) => ({
      id: d.id,
      scopeType: d.scopeType,
      scopeId: d.scopeId,
      scopeName: d.scopeName,
      delegateType: d.delegateType,
      delegateId: d.delegateId,
      delegateName: d.delegateName,
      grantedAt: d.grantedAt.toISOString(),
      grantedBy: d.grantedById ? {
        id: d.grantedById,
        username: d.grantedByUsername,
      } : null,
    }));

    return success(data);
  }

  /**
   * POST /api/v1/delegated-admins
   * Create a new delegated admin
   */
  @Post()
  @ApiOperation({ summary: 'Create delegated admin' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDelegatedAdminDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const delegation = await this.delegatedAdminService.create(
      user.tenantSchema,
      {
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        delegateType: dto.delegateType,
        delegateId: dto.delegateId,
      },
      user.id,
    );

    return success({
      id: delegation.id,
      scopeType: delegation.scopeType,
      scopeId: delegation.scopeId,
      scopeName: delegation.scopeName,
      delegateType: delegation.delegateType,
      delegateId: delegation.delegateId,
      delegateName: delegation.delegateName,
      grantedAt: delegation.grantedAt.toISOString(),
    });
  }

  /**
   * DELETE /api/v1/delegated-admins/:id
   * Remove a delegated admin
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove delegated admin' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.delegatedAdminService.delete(id, user.tenantSchema);

    return success({
      message: 'Delegated admin removed',
    });
  }

  /**
   * GET /api/v1/delegated-admins/my-scopes
   * Get scopes where current user has delegation rights
   */
  @Get('my-scopes')
  @ApiOperation({ summary: 'Get my delegated scopes' })
  async getMyScopes(@CurrentUser() user: AuthenticatedUser) {
    const scopes = await this.delegatedAdminService.getUserDelegatedScopes(
      user.tenantSchema,
      user.id,
    );

    return success(scopes);
  }
}
