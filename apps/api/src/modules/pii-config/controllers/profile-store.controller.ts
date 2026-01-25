// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { RequirePermissions, CurrentUser } from '../../../common/decorators';
import {
  CreateProfileStoreDto,
  UpdateProfileStoreDto,
  PaginationQueryDto,
} from '../dto/pii-config.dto';
import { ProfileStoreService } from '../services/profile-store.service';

@ApiTags('Profile Stores')
@Controller('profile-stores')
export class ProfileStoreController {
  constructor(
    private readonly profileStoreService: ProfileStoreService,
  ) {}

  /**
   * List profile stores
   */
  @Get()
  @RequirePermissions({ resource: 'config.profile_store', action: 'read' })
  @ApiOperation({ summary: 'List profile stores' })
  @ApiResponse({ status: 200, description: 'Returns profile store list' })
  async list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.profileStoreService.findMany(query, context);
  }

  /**
   * Get profile store by ID
   */
  @Get(':id')
  @RequirePermissions({ resource: 'config.profile_store', action: 'read' })
  @ApiOperation({ summary: 'Get profile store' })
  @ApiResponse({ status: 200, description: 'Returns profile store' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; username: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.profileStoreService.findById(id, context);
  }

  /**
   * Create profile store
   */
  @Post()
  @RequirePermissions({ resource: 'config.profile_store', action: 'create' })
  @ApiOperation({ summary: 'Create profile store' })
  @ApiResponse({ status: 201, description: 'Store created' })
  async create(
    @Body() dto: CreateProfileStoreDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.profileStoreService.create(dto, context);
  }

  /**
   * Update profile store
   */
  @Patch(':id')
  @RequirePermissions({ resource: 'config.profile_store', action: 'update' })
  @ApiOperation({ summary: 'Update profile store' })
  @ApiResponse({ status: 200, description: 'Store updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileStoreDto,
    @CurrentUser() user: { id: string; username: string },
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.profileStoreService.update(id, dto, context);
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
