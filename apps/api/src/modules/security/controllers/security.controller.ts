// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { RequirePermissions, CurrentUser, AuthenticatedUser } from '../../../common/decorators';
import {
  BlocklistListQueryDto,
  CreateBlocklistDto,
  UpdateBlocklistDto,
  TestBlocklistDto,
  DisableScopeDto,
  IpRuleListQueryDto,
  CreateIpRuleDto,
  CheckIpDto,
} from '../dto/security.dto';
import { BlocklistService } from '../services/blocklist.service';
import { FingerprintService } from '../services/fingerprint.service';
import { IpAccessService } from '../services/ip-access.service';

@ApiTags('Security')
@Controller('')
export class SecurityController {
  constructor(
    private readonly fingerprintService: FingerprintService,
    private readonly blocklistService: BlocklistService,
    private readonly ipAccessService: IpAccessService,
  ) {}

  // =========================================================================
  // Fingerprint
  // =========================================================================

  @Post('security/fingerprint')
  @RequirePermissions({ resource: 'system', action: 'read' })
  @ApiOperation({ summary: 'Get technical fingerprint' })
  async getFingerprint(@CurrentUser() user: { id: string; tenantId: string }) {
    const { fingerprint, version } = this.fingerprintService.generateVersionedFingerprint(
      user.tenantId,
      user.id,
    );
    const shortFingerprint = this.fingerprintService.generateShortFingerprint(
      user.tenantId,
      user.id,
    );

    return {
      fingerprint,
      shortFingerprint,
      version,
      generatedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Blocklist
  // =========================================================================

  @Get('blocklist-entries')
  @RequirePermissions({ resource: 'security.blocklist', action: 'read' })
  @ApiOperation({ summary: 'List blocklist entries with inheritance support' })
  async listBlocklist(
    @Query() query: BlocklistListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.blocklistService.findMany(user.tenantSchema, query);
    return {
      success: true,
      data: {
        items: result.items,
        meta: { total: result.total },
      },
    };
  }

  @Post('blocklist-entries')
  @RequirePermissions({ resource: 'security.blocklist', action: 'write' })
  @ApiOperation({ summary: 'Create blocklist entry' })
  async createBlocklist(
    @Body() dto: CreateBlocklistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.blocklistService.create(dto, context);
  }

  @Post('blocklist-entries/test')
  @RequirePermissions({ resource: 'security.blocklist', action: 'read' })
  @ApiOperation({ summary: 'Test blocklist pattern' })
  async testBlocklist(@Body() dto: TestBlocklistDto) {
    return this.blocklistService.test(dto);
  }

  @Get('blocklist-entries/:id')
  @RequirePermissions({ resource: 'security.blocklist', action: 'read' })
  @ApiOperation({ summary: 'Get blocklist entry' })
  async getBlocklist(@Param('id', ParseUUIDPipe) id: string) {
    return this.blocklistService.findById(id);
  }

  @Patch('blocklist-entries/:id')
  @RequirePermissions({ resource: 'security.blocklist', action: 'write' })
  @ApiOperation({ summary: 'Update blocklist entry' })
  async updateBlocklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlocklistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.blocklistService.update(id, dto, context);
  }

  @Delete('blocklist-entries/:id')
  @RequirePermissions({ resource: 'security.blocklist', action: 'delete' })
  @ApiOperation({ summary: 'Delete blocklist entry' })
  async deleteBlocklist(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.blocklistService.delete(id, context);
  }

  @Post('blocklist-entries/:id/disable')
  @RequirePermissions({ resource: 'security.blocklist', action: 'write' })
  @ApiOperation({ summary: 'Disable inherited blocklist entry in current scope' })
  async disableBlocklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisableScopeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.blocklistService.disableInScope(
      user.tenantSchema,
      id,
      dto,
      user.id,
    );
  }

  @Post('blocklist-entries/:id/enable')
  @RequirePermissions({ resource: 'security.blocklist', action: 'write' })
  @ApiOperation({ summary: 'Enable previously disabled blocklist entry in current scope' })
  async enableBlocklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisableScopeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.blocklistService.enableInScope(
      user.tenantSchema,
      id,
      dto,
    );
  }

  // =========================================================================
  // IP Access Rules
  // =========================================================================

  @Get('ip-access-rules')
  @RequirePermissions({ resource: 'security.ip_rules', action: 'read' })
  @ApiOperation({ summary: 'List IP access rules' })
  async listIpRules(@Query() query: IpRuleListQueryDto) {
    const result = await this.ipAccessService.findMany(query);
    return {
      success: true,
      data: {
        items: result.items,
        meta: { total: result.total },
      },
    };
  }

  @Post('ip-access-rules')
  @RequirePermissions({ resource: 'security.ip_rules', action: 'write' })
  @ApiOperation({ summary: 'Create IP access rule' })
  async createIpRule(
    @Body() dto: CreateIpRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.ipAccessService.addRule(dto, context);
  }

  @Post('ip-access-rules/check')
  @RequirePermissions({ resource: 'security.ip_rules', action: 'read' })
  @ApiOperation({ summary: 'Check IP access' })
  async checkIpAccess(@Body() dto: CheckIpDto) {
    return this.ipAccessService.checkAccess(dto.ip, dto.scope as any);
  }

  @Delete('ip-access-rules/:id')
  @RequirePermissions({ resource: 'security.ip_rules', action: 'delete' })
  @ApiOperation({ summary: 'Delete IP access rule' })
  async deleteIpRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.ipAccessService.removeRule(id, context);
  }

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
    };
  }
}
