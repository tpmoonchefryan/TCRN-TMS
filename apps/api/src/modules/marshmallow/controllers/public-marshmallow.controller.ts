// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { Public } from '../../../common/decorators';
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

@ApiTags('Public - Marshmallow')
@Controller('public/marshmallow')
@UseGuards(UaDetectionGuard)
export class PublicMarshmallowController {
  constructor(
    private readonly publicService: PublicMarshmallowService,
    private readonly reactionService: MarshmallowReactionService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Get marshmallow config for public page
   */
  @Get(':path/config')
  @Public()
  @ApiOperation({ summary: 'Get public marshmallow config' })
  @ApiResponse({ status: 200, description: 'Returns config' })
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
  @Get(':path/messages')
  @Public()
  @ApiOperation({ summary: 'Get public messages' })
  @ApiResponse({ status: 200, description: 'Returns messages' })
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
  @Post(':path/submit')
  @Public()
  @ApiOperation({ summary: 'Submit marshmallow message' })
  @ApiResponse({ status: 201, description: 'Message submitted' })
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
  @ApiOperation({ summary: 'Preview image from link' })
  @ApiResponse({ status: 200, description: 'Returns image URL' })
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
  @ApiOperation({ summary: 'Toggle reaction on message' })
  @ApiResponse({ status: 200, description: 'Reaction toggled' })
  async toggleReaction(
    @Param('messageId') messageId: string,
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
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(
    @Param('path') path: string,
    @Param('messageId') messageId: string,
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
  @ApiOperation({ summary: 'Validate SSO token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
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
  @ApiOperation({ summary: 'Mark message as read (SSO authenticated)' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsReadAuth(
    @Param('path') path: string,
    @Param('messageId') messageId: string,
    @Body() dto: SsoMarkReadDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);

    // Validate SSO token
    const payload = this.tokenService.verifyMarshmallowSsoToken(dto.ssoToken);
    if (!payload) {
      return { success: false, error: 'Invalid or expired SSO token' };
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
  @ApiOperation({ summary: 'Reply to message (SSO authenticated)' })
  @ApiResponse({ status: 200, description: 'Reply sent' })
  async replyAuth(
    @Param('path') path: string,
    @Param('messageId') messageId: string,
    @Body() dto: SsoReplyDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);

    // Validate SSO token
    const payload = this.tokenService.verifyMarshmallowSsoToken(dto.ssoToken);
    if (!payload) {
      return { success: false, error: 'Invalid or expired SSO token' };
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
