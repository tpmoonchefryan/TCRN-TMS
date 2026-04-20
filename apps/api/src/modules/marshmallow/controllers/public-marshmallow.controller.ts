// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';
import { Request, Response } from 'express';

import { Public } from '../../../common/decorators';
import { RateLimiterGuard } from '../../../common/guards/rate-limiter.guard';
import { TokenService } from '../../auth/token.service';
import { UaDetectionGuard } from '../../homepage/guards/ua-detection.guard';
import {
    MarkReadDto,
    PublicMessagesQueryDto,
    ReactDto,
    SsoMarkReadDto,
    SsoReplyDto,
    SubmitMessageDto,
} from '../dto/marshmallow.dto';
import { MarshmallowReactionService } from '../services/marshmallow-reaction.service';
import { PublicMarshmallowService } from '../services/public-marshmallow.service';
import {
  PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA,
  PUBLIC_MARSHMALLOW_CONFIG_SCHEMA,
  PUBLIC_MARSHMALLOW_FORBIDDEN_SCHEMA,
  PUBLIC_MARSHMALLOW_MARK_READ_SCHEMA,
  PUBLIC_MARSHMALLOW_MESSAGES_SCHEMA,
  PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA,
  PUBLIC_MARSHMALLOW_PREVIEW_IMAGE_SCHEMA,
  PUBLIC_MARSHMALLOW_REACTION_SCHEMA,
  PUBLIC_MARSHMALLOW_REPLY_SCHEMA,
  PUBLIC_MARSHMALLOW_SUBMIT_SCHEMA,
  PUBLIC_MARSHMALLOW_VALIDATE_SSO_SCHEMA,
} from './marshmallow-swagger.schemas';

@ApiTags('Public - Marshmallow')
@Controller('public/marshmallow')
@UseGuards(RateLimiterGuard, UaDetectionGuard)
export class PublicMarshmallowController {
  constructor(
    private readonly publicService: PublicMarshmallowService,
    private readonly reactionService: MarshmallowReactionService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Get marshmallow config for public page
   */
  @Get(':tenantCode/:talentCode/config')
  @Public()
  @ApiOperation({ summary: 'Get public marshmallow config via canonical shared-domain route' })
  @ApiParam({ name: 'tenantCode', description: 'Tenant code', schema: { type: 'string' } })
  @ApiParam({ name: 'talentCode', description: 'Talent code', schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'Returns config', schema: PUBLIC_MARSHMALLOW_CONFIG_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow page was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async getConfigByCodes(
    @Param('tenantCode') tenantCode: string,
    @Param('talentCode') talentCode: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.publicService.getConfigByCodes(tenantCode, talentCode);

    res.set({
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    });

    return data;
  }

  @Get(':path/config')
  @Public()
  @ApiOperation({ summary: 'Get public marshmallow config' })
  @ApiParam({ name: 'path', description: 'Public marshmallow path', schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'Returns config', schema: PUBLIC_MARSHMALLOW_CONFIG_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow page was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async getConfig(
    @Param('path') path: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.publicService.getConfig(path);

    res.set({
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    });

    return data;
  }

  /**
   * Get public messages
   */
  @Get(':tenantCode/:talentCode/messages')
  @Public()
  @ApiOperation({ summary: 'Get public messages via canonical shared-domain route' })
  @ApiParam({ name: 'tenantCode', description: 'Tenant code', schema: { type: 'string' } })
  @ApiParam({ name: 'talentCode', description: 'Talent code', schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'Returns messages', schema: PUBLIC_MARSHMALLOW_MESSAGES_SCHEMA })
  @ApiResponse({ status: 400, description: 'Public-marshmallow message query is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow page was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async getMessagesByCodes(
    @Param('tenantCode') tenantCode: string,
    @Param('talentCode') talentCode: string,
    @Query() query: PublicMessagesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.publicService.getMessagesByCodes(tenantCode, talentCode, query);

    if (query._t) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
    } else {
      res.set({
        'Cache-Control': 'public, max-age=30, s-maxage=60',
      });
    }

    return data;
  }

  @Get(':path/messages')
  @Public()
  @ApiOperation({ summary: 'Get public messages' })
  @ApiParam({ name: 'path', description: 'Public marshmallow path', schema: { type: 'string' } })
  @ApiResponse({ status: 200, description: 'Returns messages', schema: PUBLIC_MARSHMALLOW_MESSAGES_SCHEMA })
  @ApiResponse({ status: 400, description: 'Public-marshmallow message query is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow page was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async getMessages(
    @Param('path') path: string,
    @Query() query: PublicMessagesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.publicService.getMessages(path, query);

    // If cache-busting parameter is present, disable caching to return fresh data
    if (query._t) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
    } else {
      res.set({
        'Cache-Control': 'public, max-age=30, s-maxage=60',
      });
    }

    return data;
  }

  /**
   * Submit message
   */
  @Post(':tenantCode/:talentCode/submit')
  @Public()
  @ApiOperation({ summary: 'Submit marshmallow message via canonical shared-domain route' })
  @ApiParam({ name: 'tenantCode', description: 'Tenant code', schema: { type: 'string' } })
  @ApiParam({ name: 'talentCode', description: 'Talent code', schema: { type: 'string' } })
  @ApiResponse({ status: 201, description: 'Message submitted', schema: PUBLIC_MARSHMALLOW_SUBMIT_SCHEMA })
  @ApiResponse({ status: 400, description: 'Public-marshmallow submission is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 403, description: 'Public-marshmallow submission is not allowed for this talent', schema: PUBLIC_MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow page was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async submitMessageByCodes(
    @Param('tenantCode') tenantCode: string,
    @Param('talentCode') talentCode: string,
    @Body() dto: SubmitMessageDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] ?? '';

    return this.publicService.submitMessageByCodes(tenantCode, talentCode, dto, {
      ip,
      userAgent,
    });
  }

  @Post(':path/submit')
  @Public()
  @ApiOperation({ summary: 'Submit marshmallow message' })
  @ApiParam({ name: 'path', description: 'Public marshmallow path', schema: { type: 'string' } })
  @ApiResponse({ status: 201, description: 'Message submitted', schema: PUBLIC_MARSHMALLOW_SUBMIT_SCHEMA })
  @ApiResponse({ status: 400, description: 'Public-marshmallow submission is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 403, description: 'Public-marshmallow submission is not allowed for this talent', schema: PUBLIC_MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow page was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async submitMessage(
    @Param('path') path: string,
    @Body() dto: SubmitMessageDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] ?? '';

    return this.publicService.submitMessage(path, dto, { ip, userAgent });
  }

  /**
   * Preview image from link (e.g. Bilibili)
   */
  @Post('preview-image') // Global public endpoint, no path needed really, but could be under path if we want rate limit per talent?
  // Actually, keeping it generic is fine.
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Preview image from link' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://www.bilibili.com/video/BV1xx411c7mD' },
      },
      required: ['url'],
    },
  })
  @ApiResponse({ status: 200, description: 'Returns image URL', schema: PUBLIC_MARSHMALLOW_PREVIEW_IMAGE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Preview-image payload is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  async previewImage(
    @Body() body: { url: string },
  ) {
    const images = await this.publicService.resolveBilibiliImages(body.url);
    if (!images || images.length === 0) {
        return { images: [], error: 'Could not resolve images' };
    }
    return { images };
  }

  /**
   * Toggle reaction on message
   */
  @Post('messages/:messageId/react')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Toggle reaction on message' })
  @ApiParam({ name: 'messageId', description: 'Public marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Reaction toggled', schema: PUBLIC_MARSHMALLOW_REACTION_SCHEMA })
  @ApiResponse({ status: 400, description: 'Reaction payload is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow message was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async toggleReaction(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: ReactDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);

    return this.reactionService.toggleReaction(messageId, dto.reaction, {
      fingerprint: dto.fingerprint,
      ip,
    });
  }

  /**
   * Mark message as read (for streamers during broadcasts)
   */
  @Post(':path/messages/:messageId/mark-read')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiParam({ name: 'path', description: 'Public marshmallow path', schema: { type: 'string' } })
  @ApiParam({ name: 'messageId', description: 'Public marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Message marked as read', schema: PUBLIC_MARSHMALLOW_MARK_READ_SCHEMA })
  @ApiResponse({ status: 400, description: 'Mark-read payload is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow message or path was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async markAsRead(
    @Param('path') path: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: MarkReadDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);
    return this.publicService.markAsRead(path, messageId, {
      fingerprint: dto.fingerprint,
      ip,
    });
  }

  // =========================================================================
  // SSO Authenticated Endpoints (for streamer mode)
  // =========================================================================

  /**
   * Validate SSO token and get user info
   */
  @Post('validate-sso')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate SSO token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'eyJhbGciOi...' },
      },
      required: ['token'],
    },
  })
  @ApiResponse({ status: 200, description: 'Token validation result', schema: PUBLIC_MARSHMALLOW_VALIDATE_SSO_SCHEMA })
  @ApiResponse({ status: 400, description: 'SSO validation payload is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  async validateSsoToken(
    @Body() body: { token: string },
  ) {
    const payload = this.tokenService.verifyMarshmallowSsoToken(body.token);
    if (!payload) {
      return { valid: false, user: null };
    }

    return {
      valid: true,
      user: {
        id: payload.sub,
        displayName: payload.displayName,
        email: payload.email,
        talentId: payload.talentId,
      },
    };
  }

  /**
   * Mark message as read with SSO authentication
   */
  @Post(':path/messages/:messageId/mark-read-auth')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark message as read (SSO authenticated)' })
  @ApiParam({ name: 'path', description: 'Public marshmallow path', schema: { type: 'string' } })
  @ApiParam({ name: 'messageId', description: 'Public marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Message marked as read', schema: PUBLIC_MARSHMALLOW_MARK_READ_SCHEMA })
  @ApiResponse({ status: 400, description: 'SSO mark-read payload is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 403, description: 'SSO token is invalid or message access is forbidden', schema: PUBLIC_MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow message or path was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async markAsReadAuth(
    @Param('path') path: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: SsoMarkReadDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);

    // Validate SSO token
    const payload = this.tokenService.verifyMarshmallowSsoToken(dto.ssoToken);
    if (!payload) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Invalid or expired SSO token',
      });
    }

    return this.publicService.markAsReadAuth(path, messageId, {
      userId: payload.sub,
      displayName: payload.displayName,
      talentId: payload.talentId,
      tenantSchema: payload.tsc,
      ip,
    });
  }

  /**
   * Reply to message with SSO authentication
   */
  @Post(':path/messages/:messageId/reply-auth')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Reply to message (SSO authenticated)' })
  @ApiParam({ name: 'path', description: 'Public marshmallow path', schema: { type: 'string' } })
  @ApiParam({ name: 'messageId', description: 'Public marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Reply sent', schema: PUBLIC_MARSHMALLOW_REPLY_SCHEMA })
  @ApiResponse({ status: 400, description: 'SSO reply payload is invalid', schema: PUBLIC_MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 403, description: 'SSO token is invalid or message access is forbidden', schema: PUBLIC_MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Public marshmallow message or path was not found', schema: PUBLIC_MARSHMALLOW_NOT_FOUND_SCHEMA })
  async replyAuth(
    @Param('path') path: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: SsoReplyDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);

    // Validate SSO token
    const payload = this.tokenService.verifyMarshmallowSsoToken(dto.ssoToken);
    if (!payload) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Invalid or expired SSO token',
      });
    }

    return this.publicService.replyAuth(path, messageId, dto.content, {
      userId: payload.sub,
      displayName: payload.displayName,
      talentId: payload.talentId,
      tenantSchema: payload.tsc,
      ip,
    });
  }

  /**
   * Get client IP from request
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      'unknown'
    );
  }
}
