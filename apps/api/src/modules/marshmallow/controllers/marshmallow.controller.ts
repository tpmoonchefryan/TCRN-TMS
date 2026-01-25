// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import { TokenService } from '../../auth/token.service';
import { BUCKETS, MinioService } from '../../minio/minio.service';
import {
    BatchActionDto,
    ExportMessagesDto,
    MessageListQueryDto,
    RejectMessageDto,
    ReplyMessageDto,
    UpdateConfigDto,
    UpdateMessageDto,
} from '../dto/marshmallow.dto';
import { MarshmallowConfigService } from '../services/marshmallow-config.service';
import { MarshmallowExportService } from '../services/marshmallow-export.service';
import { MarshmallowMessageService } from '../services/marshmallow-message.service';

// Authenticated user type with tenantSchema
interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  tenantId: string;
  tenantSchema: string;
}

@ApiTags('Marshmallow Management')
@Controller('talents/:talentId/marshmallow')
export class MarshmallowController {
  constructor(
    private readonly configService: MarshmallowConfigService,
    private readonly messageService: MarshmallowMessageService,
    private readonly exportService: MarshmallowExportService,
    private readonly tokenService: TokenService,
    private readonly minioService: MinioService,
    private readonly appConfigService: ConfigService,
  ) {}

  // =========================================================================
  // Config
  // =========================================================================

  @Get('config')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'read' })
  @ApiOperation({ summary: 'Get marshmallow config' })
  async getConfig(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.configService.getOrCreate(talentId, user.tenantSchema);
  }

  @Patch('config')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Update marshmallow config' })
  async updateConfig(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: UpdateConfigDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.configService.update(talentId, user.tenantSchema, dto, context);
  }

  @Post('avatar')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Upload avatar for marshmallow page' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const context = this.buildContext(user, req);
    const extension = file.mimetype.split('/')[1];
    const objectName = `${user.tenantSchema}/${talentId}/avatar-${Date.now()}.${extension}`;

    // Upload to MinIO
    await this.minioService.uploadFile(
      BUCKETS.AVATARS,
      objectName,
      file.buffer,
      file.mimetype,
    );

    // Generate public URL
    // In production, this should be the CDN URL or public MinIO URL
    // For now, we'll construct it based on the APP_URL or MINIO_PUBLIC_URL
    const minioPublicUrl = this.appConfigService.get<string>('MINIO_PUBLIC_URL') 
      || this.appConfigService.get<string>('APP_URL') + '/api/v1/public/assets';

    const avatarUrl = `${minioPublicUrl}/${BUCKETS.AVATARS}/${objectName}`;
    
    // Update config with new avatar URL
    // We create a partial DTO update
    const dto = new UpdateConfigDto();
    dto.avatarUrl = avatarUrl;
    // Need to fetch current version first or handle concurrency properly
    // For simplicity here, we'll let the frontend trigger the config update, 
    // OR we can just return the URL and let frontend call updateConfig
    
    return { url: avatarUrl };
  }

  // =========================================================================
  // Domain Verification
  // =========================================================================

  @Post('config/domain')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Set custom domain for marshmallow' })
  async setCustomDomain(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: { customDomain: string | null },
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.configService.setCustomDomain(talentId, dto.customDomain, context);
  }

  @Post('config/verify-domain')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Verify custom domain DNS configuration' })
  async verifyCustomDomain(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.configService.verifyCustomDomain(talentId, context);
  }

  // =========================================================================
  // SSO Token
  // =========================================================================

  @Post('sso-token')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'read' })
  @ApiOperation({ summary: 'Generate SSO token for streamer mode on public page' })
  async generateSsoToken(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { token, expiresIn } = this.tokenService.generateMarshmallowSsoToken({
      sub: user.id,
      tid: user.tenantId,
      tsc: user.tenantSchema,
      talentId,
      displayName: user.displayName || user.username,
      email: user.email,
    });

    return {
      token,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  // =========================================================================
  // Messages
  // =========================================================================

  @Get('messages')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'read' })
  @ApiOperation({ summary: 'List marshmallow messages' })
  async listMessages(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Query() query: MessageListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.messageService.findMany(talentId, user.tenantSchema, query);
    return {
      items: result.items,
      meta: {
        total: result.total,
        stats: result.stats,
      },
    };
  }

  @Post('messages/:messageId/approve')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Approve message' })
  async approveMessage(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.messageService.approve(talentId, user.tenantSchema, messageId, context);
  }

  @Post('messages/:messageId/reject')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Reject message' })
  async rejectMessage(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: RejectMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.messageService.reject(talentId, user.tenantSchema, messageId, dto, context);
  }

  @Post('messages/:messageId/unreject')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Unreject message - restore to pending status' })
  async unrejectMessage(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.messageService.unreject(talentId, user.tenantSchema, messageId, context);
  }

  @Post('messages/:messageId/reply')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Reply to message' })
  async replyMessage(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: ReplyMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.messageService.reply(talentId, user.tenantSchema, messageId, dto, context);
  }

  @Post('messages/batch')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Batch action on messages' })
  async batchAction(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: BatchActionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.messageService.batchAction(talentId, user.tenantSchema, dto, context);
  }

  @Patch('messages/:messageId')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Update message (read, starred, pinned)' })
  async updateMessage(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.messageService.update(talentId, user.tenantSchema, messageId, dto, context);
  }

  // =========================================================================
  // Export
  // =========================================================================

  @Post('export')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'export' })
  @ApiOperation({ summary: 'Export marshmallow messages' })
  @ApiResponse({ status: 202, description: 'Export job created' })
  async exportMessages(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: ExportMessagesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.exportService.createExportJob(talentId, user.tenantSchema, dto, context);
  }

  @Get('export/:jobId')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'read' })
  @ApiOperation({ summary: 'Get export job status' })
  async getExportJob(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exportService.getExportJob(jobId, user.tenantSchema);
  }

  @Get('export/:jobId/download')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'read' })
  @ApiOperation({ summary: 'Get download URL for export' })
  async getExportDownloadUrl(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const url = await this.exportService.getDownloadUrl(jobId, user.tenantSchema);
    return { url };
  }

  private buildContext(
    user: { id: string; username: string },
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
