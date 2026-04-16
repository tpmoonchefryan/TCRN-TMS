// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
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
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import {
    CurrentUser,
    RequirePermissions,
    RequirePublishedTalentAccess,
} from '../../../common/decorators';
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
import {
  MARSHMALLOW_ALREADY_EXISTS_SCHEMA,
  MARSHMALLOW_AVATAR_UPLOAD_SCHEMA,
  MARSHMALLOW_BAD_REQUEST_SCHEMA,
  MARSHMALLOW_CONFIG_SCHEMA,
  MARSHMALLOW_CUSTOM_DOMAIN_SCHEMA,
  MARSHMALLOW_EXPORT_DOWNLOAD_SCHEMA,
  MARSHMALLOW_EXPORT_JOB_CREATE_SCHEMA,
  MARSHMALLOW_EXPORT_JOB_SCHEMA,
  MARSHMALLOW_FORBIDDEN_SCHEMA,
  MARSHMALLOW_MESSAGE_BATCH_SCHEMA,
  MARSHMALLOW_MESSAGE_LIST_SCHEMA,
  MARSHMALLOW_MESSAGE_MODERATION_SCHEMA,
  MARSHMALLOW_MESSAGE_REPLY_SCHEMA,
  MARSHMALLOW_MESSAGE_UPDATE_SCHEMA,
  MARSHMALLOW_NOT_FOUND_SCHEMA,
  MARSHMALLOW_SSO_TOKEN_SCHEMA,
  MARSHMALLOW_UNAUTHORIZED_SCHEMA,
  MARSHMALLOW_VERIFY_DOMAIN_SCHEMA,
  MARSHMALLOW_VERSION_CONFLICT_SCHEMA,
} from './marshmallow-swagger.schemas';

// Authenticated user type with tenantSchema
interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  tenantId: string;
  tenantSchema: string;
}

@ApiTags('Ops - Marshmallow')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns marshmallow config', schema: MARSHMALLOW_CONFIG_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read marshmallow config', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read marshmallow config', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent or marshmallow config was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
  async getConfig(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.configService.getOrCreate(talentId, user.tenantSchema);
  }

  @Patch('config')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Update marshmallow config' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Marshmallow config updated', schema: MARSHMALLOW_CONFIG_SCHEMA })
  @ApiResponse({ status: 400, description: 'Marshmallow-config payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update marshmallow config', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update marshmallow config', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent or marshmallow config was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Marshmallow-config update conflicted with current stored version or domain state', schema: MARSHMALLOW_VERSION_CONFLICT_SCHEMA })
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
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Avatar uploaded successfully', schema: MARSHMALLOW_AVATAR_UPLOAD_SCHEMA })
  @ApiResponse({ status: 400, description: 'Avatar upload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to upload marshmallow avatars', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to upload marshmallow avatars', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  async uploadAvatar(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Req() _req: Request,
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

    const extension = file.mimetype.split('/')[1];
    const objectName = `${user.tenantSchema}/${talentId}/avatar-${Date.now()}.${extension}`;

    try {
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
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // =========================================================================
  // Domain Verification
  // =========================================================================

  @Post('config/domain')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Set custom domain for marshmallow' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        customDomain: {
          type: 'string',
          nullable: true,
          example: 'mail.aki.example.com',
        },
      },
      required: ['customDomain'],
    },
  })
  @ApiResponse({ status: 201, description: 'Marshmallow custom domain updated', schema: MARSHMALLOW_CUSTOM_DOMAIN_SCHEMA })
  @ApiResponse({ status: 400, description: 'Custom-domain payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update marshmallow custom domains', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update marshmallow custom domains', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent or marshmallow config was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Custom domain is already in use or conflicted with current state', schema: MARSHMALLOW_ALREADY_EXISTS_SCHEMA })
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
  @HttpCode(200)
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Verify custom domain DNS configuration' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns marshmallow custom-domain verification result', schema: MARSHMALLOW_VERIFY_DOMAIN_SCHEMA })
  @ApiResponse({ status: 400, description: 'Custom-domain verification failed validation', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to verify marshmallow custom domains', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to verify marshmallow custom domains', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent or marshmallow config was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Returns marshmallow SSO token', schema: MARSHMALLOW_SSO_TOKEN_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create marshmallow SSO tokens', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create marshmallow SSO tokens', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns marshmallow messages', schema: MARSHMALLOW_MESSAGE_LIST_SCHEMA })
  @ApiResponse({ status: 400, description: 'Marshmallow-message query is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to list marshmallow messages', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to list marshmallow messages', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'messageId', description: 'Marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Marshmallow message approved', schema: MARSHMALLOW_MESSAGE_MODERATION_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to approve marshmallow messages', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to approve marshmallow messages', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Marshmallow message was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'messageId', description: 'Marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Marshmallow message rejected', schema: MARSHMALLOW_MESSAGE_MODERATION_SCHEMA })
  @ApiResponse({ status: 400, description: 'Reject-message payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to reject marshmallow messages', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to reject marshmallow messages', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Marshmallow message was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'messageId', description: 'Marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Marshmallow message restored to pending', schema: MARSHMALLOW_MESSAGE_MODERATION_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to unreject marshmallow messages', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to unreject marshmallow messages', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Marshmallow message was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'messageId', description: 'Marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 201, description: 'Reply sent for marshmallow message', schema: MARSHMALLOW_MESSAGE_REPLY_SCHEMA })
  @ApiResponse({ status: 400, description: 'Reply-message payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to reply to marshmallow messages', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to reply to marshmallow messages', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Marshmallow message was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @HttpCode(200)
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'update' })
  @ApiOperation({ summary: 'Batch action on messages' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Batch action completed for marshmallow messages', schema: MARSHMALLOW_MESSAGE_BATCH_SCHEMA })
  @ApiResponse({ status: 400, description: 'Batch-action payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to batch-update marshmallow messages', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to batch-update marshmallow messages', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'One or more marshmallow messages were not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'messageId', description: 'Marshmallow-message identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Marshmallow message updated', schema: MARSHMALLOW_MESSAGE_UPDATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Message update payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update marshmallow messages', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update marshmallow messages', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Marshmallow message was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
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
  @HttpCode(202)
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'export' })
  @ApiOperation({ summary: 'Export marshmallow messages' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 202, description: 'Export job created', schema: MARSHMALLOW_EXPORT_JOB_CREATE_SCHEMA })
  @ApiResponse({ status: 400, description: 'Marshmallow-export payload is invalid', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to create marshmallow exports', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create marshmallow exports', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Talent or marshmallow export source data was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
  async exportMessages(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: ExportMessagesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.exportService.createExportJob(talentId, dto, context);
  }

  @Get('export/:jobId')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'read' })
  @ApiOperation({ summary: 'Get export job status' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'jobId', description: 'Marshmallow-export job identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns marshmallow export job detail', schema: MARSHMALLOW_EXPORT_JOB_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to read marshmallow export jobs', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to read marshmallow export jobs', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Marshmallow export job was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
  async getExportJob(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exportService.getExportJob(jobId, talentId, user.tenantSchema);
  }

  @Get('export/:jobId/download')
  @RequirePermissions({ resource: 'talent.marshmallow', action: 'read' })
  @ApiOperation({ summary: 'Get download URL for export' })
  @ApiParam({ name: 'talentId', description: 'Talent identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiParam({ name: 'jobId', description: 'Marshmallow-export job identifier', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 200, description: 'Returns marshmallow export download URL', schema: MARSHMALLOW_EXPORT_DOWNLOAD_SCHEMA })
  @ApiResponse({ status: 400, description: 'Marshmallow export is not ready for download', schema: MARSHMALLOW_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to download marshmallow exports', schema: MARSHMALLOW_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to download marshmallow exports', schema: MARSHMALLOW_FORBIDDEN_SCHEMA })
  @ApiResponse({ status: 404, description: 'Marshmallow export job was not found', schema: MARSHMALLOW_NOT_FOUND_SCHEMA })
  async getExportDownloadUrl(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const url = await this.exportService.getDownloadUrl(jobId, talentId, user.tenantSchema);
    return { url };
  }

  private buildContext(
    user: { id: string; username: string; tenantSchema: string },
    req: Request,
  ): RequestContext {
    return {
      userId: user.id,
      userName: user.username,
      tenantSchema: user.tenantSchema,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
    };
  }
}
