// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
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

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
    BlocklistListQueryDto,
    CheckIpDto,
    CreateBlocklistDto,
    CreateIpRuleDto,
    DisableScopeDto,
    IpRuleListQueryDto,
    IpRuleScope,
    TestBlocklistDto,
    UpdateBlocklistDto,
} from '../dto/security.dto';
import { BlocklistService } from '../services/blocklist.service';
import { FingerprintService } from '../services/fingerprint.service';
import { IpAccessService } from '../services/ip-access.service';
import {
  SECURITY_ALREADY_EXISTS_SCHEMA,
  SECURITY_BAD_REQUEST_SCHEMA,
  SECURITY_BLOCKLIST_DELETE_SCHEMA,
  SECURITY_BLOCKLIST_DISABLE_SCHEMA,
  SECURITY_BLOCKLIST_ENABLE_SCHEMA,
  SECURITY_BLOCKLIST_ITEM_SCHEMA,
  SECURITY_BLOCKLIST_LIST_SCHEMA,
  SECURITY_BLOCKLIST_TEST_SCHEMA,
  SECURITY_CONFLICT_SCHEMA,
  SECURITY_FINGERPRINT_SCHEMA,
  SECURITY_FORBIDDEN_SCHEMA,
  SECURITY_IP_CHECK_SCHEMA,
  SECURITY_IP_RULE_DELETE_SCHEMA,
  SECURITY_IP_RULE_ITEM_SCHEMA,
  SECURITY_IP_RULE_LIST_SCHEMA,
  SECURITY_NOT_FOUND_SCHEMA,
  SECURITY_UNAUTHORIZED_SCHEMA,
} from './security-swagger.schemas';

@ApiTags('System - Security')
@ApiBearerAuth()
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Get technical fingerprint' })
  @ApiResponse({ status: 200, description: 'Returns the current authenticated user fingerprint', schema: SECURITY_FINGERPRINT_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to generate a fingerprint', schema: SECURITY_UNAUTHORIZED_SCHEMA })
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
  @ApiResponse({ status: 200, description: 'Returns blocklist entries', schema: SECURITY_BLOCKLIST_LIST_SCHEMA })
  @ApiResponse({ status: 400, description: 'Blocklist query is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to list blocklist entries', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list blocklist entries', schema: SECURITY_FORBIDDEN_SCHEMA })
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
  @ApiResponse({ status: 201, description: 'Blocklist entry created', schema: SECURITY_BLOCKLIST_ITEM_SCHEMA })
  @ApiResponse({ status: 400, description: 'Blocklist payload is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create blocklist entries', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create blocklist entries', schema: SECURITY_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 409, description: 'Blocklist entry already exists in the same scope', schema: SECURITY_ALREADY_EXISTS_SCHEMA })
  async createBlocklist(
    @Body() dto: CreateBlocklistDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.blocklistService.create(dto, context);
  }

  @Post('blocklist-entries/test')
  @HttpCode(200)
  @RequirePermissions({ resource: 'security.blocklist', action: 'read' })
  @ApiOperation({ summary: 'Test blocklist pattern' })
  @ApiResponse({ status: 200, description: 'Returns blocklist-pattern test result', schema: SECURITY_BLOCKLIST_TEST_SCHEMA })
  @ApiResponse({ status: 400, description: 'Blocklist-pattern test payload is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to test blocklist patterns', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to test blocklist patterns', schema: SECURITY_FORBIDDEN_SCHEMA })
  async testBlocklist(@Body() dto: TestBlocklistDto) {
    return this.blocklistService.test(dto);
  }

  @Get('blocklist-entries/:id')
  @RequirePermissions({ resource: 'security.blocklist', action: 'read' })
  @ApiOperation({ summary: 'Get blocklist entry' })
  @ApiParam({ name: 'id', description: 'Blocklist-entry identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns blocklist entry detail', schema: SECURITY_BLOCKLIST_ITEM_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read blocklist entries', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read blocklist entries', schema: SECURITY_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Blocklist entry was not found', schema: SECURITY_NOT_FOUND_SCHEMA })
  async getBlocklist(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.blocklistService.findById(user.tenantSchema, id);
  }

  @Patch('blocklist-entries/:id')
  @RequirePermissions({ resource: 'security.blocklist', action: 'write' })
  @ApiOperation({ summary: 'Update blocklist entry' })
  @ApiParam({ name: 'id', description: 'Blocklist-entry identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Blocklist entry updated', schema: SECURITY_BLOCKLIST_ITEM_SCHEMA })
  @ApiResponse({ status: 400, description: 'Blocklist update is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update blocklist entries', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update blocklist entries', schema: SECURITY_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Blocklist entry was not found', schema: SECURITY_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Blocklist update conflicted with current stored version or scope state', schema: SECURITY_CONFLICT_SCHEMA })
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
  @ApiParam({ name: 'id', description: 'Blocklist-entry identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Blocklist entry deleted', schema: SECURITY_BLOCKLIST_DELETE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to delete blocklist entries', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to delete blocklist entries', schema: SECURITY_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Blocklist entry was not found', schema: SECURITY_NOT_FOUND_SCHEMA })
  async deleteBlocklist(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.blocklistService.delete(id, context);
  }

  @Post('blocklist-entries/:id/disable')
  @HttpCode(200)
  @RequirePermissions({ resource: 'security.blocklist', action: 'write' })
  @ApiOperation({ summary: 'Disable inherited blocklist entry in current scope' })
  @ApiParam({ name: 'id', description: 'Inherited blocklist-entry identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Inherited blocklist entry disabled', schema: SECURITY_BLOCKLIST_DISABLE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Disable-scope payload is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to disable blocklist entries', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to disable blocklist entries', schema: SECURITY_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Inherited blocklist entry was not found', schema: SECURITY_NOT_FOUND_SCHEMA })
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
  @HttpCode(200)
  @RequirePermissions({ resource: 'security.blocklist', action: 'write' })
  @ApiOperation({ summary: 'Enable previously disabled blocklist entry in current scope' })
  @ApiParam({ name: 'id', description: 'Inherited blocklist-entry identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Inherited blocklist entry enabled', schema: SECURITY_BLOCKLIST_ENABLE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Enable-scope payload is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to enable blocklist entries', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to enable blocklist entries', schema: SECURITY_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Inherited blocklist entry was not found', schema: SECURITY_NOT_FOUND_SCHEMA })
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
  @ApiResponse({ status: 200, description: 'Returns IP access rules', schema: SECURITY_IP_RULE_LIST_SCHEMA })
  @ApiResponse({ status: 400, description: 'IP-rule query is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to list IP access rules', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list IP access rules', schema: SECURITY_FORBIDDEN_SCHEMA })
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
  @ApiResponse({ status: 201, description: 'IP access rule created', schema: SECURITY_IP_RULE_ITEM_SCHEMA })
  @ApiResponse({ status: 400, description: 'IP-rule payload is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create IP access rules', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create IP access rules', schema: SECURITY_FORBIDDEN_SCHEMA })
  async createIpRule(
    @Body() dto: CreateIpRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.ipAccessService.addRule(dto, context);
  }

  @Post('ip-access-rules/check')
  @HttpCode(200)
  @RequirePermissions({ resource: 'security.ip_rules', action: 'read' })
  @ApiOperation({ summary: 'Check IP access' })
  @ApiResponse({ status: 200, description: 'Returns IP access decision', schema: SECURITY_IP_CHECK_SCHEMA })
  @ApiResponse({ status: 400, description: 'IP-access check payload is invalid', schema: SECURITY_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to check IP access', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to check IP access', schema: SECURITY_FORBIDDEN_SCHEMA })
  async checkIpAccess(@Body() dto: CheckIpDto) {
    return this.ipAccessService.checkAccess(dto.ip, dto.scope ?? IpRuleScope.GLOBAL);
  }

  @Delete('ip-access-rules/:id')
  @RequirePermissions({ resource: 'security.ip_rules', action: 'delete' })
  @ApiOperation({ summary: 'Delete IP access rule' })
  @ApiParam({ name: 'id', description: 'IP-rule identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'IP access rule deleted', schema: SECURITY_IP_RULE_DELETE_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to delete IP access rules', schema: SECURITY_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to delete IP access rules', schema: SECURITY_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'IP access rule was not found', schema: SECURITY_NOT_FOUND_SCHEMA })
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
      tenantId: user.tenantId,
      tenantSchema: user.tenantSchema,
    };
  }
}
