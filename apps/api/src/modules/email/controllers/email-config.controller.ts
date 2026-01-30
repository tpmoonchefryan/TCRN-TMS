// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards';
import { success } from '../../../common/response.util';
import { SaveEmailConfigDto, TestEmailDto } from '../dto/email-config.dto';
import { EmailConfigService } from '../services/email-config.service';
import { SmtpClient } from '../services/smtp.client';
import { TencentSesClient } from '../services/tencent-ses.client';

/**
 * Email Configuration Controller
 * For AC tenant admin to manage email provider configuration
 * Route: /api/v1/email/config
 */
@ApiTags('Ops - Email')
@Controller('email/config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EmailConfigController {
  constructor(
    private readonly emailConfigService: EmailConfigService,
    private readonly tencentSesClient: TencentSesClient,
    private readonly smtpClient: SmtpClient,
  ) {}

  /**
   * Check if user is AC tenant admin
   */
  private checkAcTenantAccess(user: AuthenticatedUser): void {
    // AC tenant has schema 'tenant_ac'
    if (user.tenantSchema !== 'tenant_ac') {
      throw new ForbiddenException({
        code: 'AC_TENANT_ONLY',
        message: 'Email configuration is only available for AC tenant administrators',
      });
    }
  }

  /**
   * GET /api/v1/email/config
   * Get email configuration (masked)
   */
  @Get()
  @ApiOperation({ summary: 'Get email configuration' })
  async getConfig(@CurrentUser() user: AuthenticatedUser) {
    this.checkAcTenantAccess(user);
    const config = await this.emailConfigService.getConfig();
    return success(config);
  }

  /**
   * PUT /api/v1/email/config
   * Save email configuration
   */
  @Put()
  @ApiOperation({ summary: 'Save email configuration' })
  async saveConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveEmailConfigDto,
  ) {
    this.checkAcTenantAccess(user);

    // Validate that the selected provider config is provided
    if (dto.provider === 'tencent_ses' && !dto.tencentSes) {
      throw new BadRequestException({
        code: 'INVALID_CONFIG',
        message: 'Tencent SES configuration is required when provider is tencent_ses',
      });
    }

    if (dto.provider === 'smtp' && !dto.smtp) {
      throw new BadRequestException({
        code: 'INVALID_CONFIG',
        message: 'SMTP configuration is required when provider is smtp',
      });
    }

    const config = await this.emailConfigService.saveConfig(dto);
    return success(config);
  }

  /**
   * POST /api/v1/email/config/test
   * Send a test email
   */
  @Post('test')
  @ApiOperation({ summary: 'Send test email' })
  async sendTestEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TestEmailDto,
  ) {
    this.checkAcTenantAccess(user);

    const config = await this.emailConfigService.getDecryptedConfig();

    if (!config) {
      throw new BadRequestException({
        code: 'EMAIL_NOT_CONFIGURED',
        message: 'Email is not configured. Please save configuration first.',
      });
    }

    let result: { success: boolean; message: string; error?: string };

    if (config.provider === 'tencent_ses') {
      if (!config.tencentSes?.secretId || !config.tencentSes?.secretKey) {
        throw new BadRequestException({
          code: 'SES_NOT_CONFIGURED',
          message: 'Tencent SES credentials are not configured',
        });
      }

      // Send test email via Tencent SES
      try {
        const messageId = await this.tencentSesClient.sendTestEmail(dto.testEmail, {
          secretId: config.tencentSes.secretId,
          secretKey: config.tencentSes.secretKey,
          region: config.tencentSes.region || 'ap-hongkong',
          fromAddress: config.tencentSes.fromAddress,
          fromName: config.tencentSes.fromName,
          replyTo: config.tencentSes.replyTo,
        });
        result = {
          success: true,
          message: `Test email sent successfully via Tencent SES (MessageId: ${messageId})`,
        };
      } catch (error) {
        const err = error as Error;
        result = {
          success: false,
          message: 'Failed to send test email via Tencent SES',
          error: err.message,
        };
      }
    } else if (config.provider === 'smtp') {
      if (!config.smtp?.host || !config.smtp?.username || !config.smtp?.password) {
        throw new BadRequestException({
          code: 'SMTP_NOT_CONFIGURED',
          message: 'SMTP configuration is incomplete',
        });
      }

      // Send test email via SMTP
      result = await this.smtpClient.sendTestEmail(dto.testEmail, config.smtp);
    } else {
      throw new BadRequestException({
        code: 'UNKNOWN_PROVIDER',
        message: `Unknown email provider: ${config.provider}`,
      });
    }

    return success(result);
  }

  /**
   * POST /api/v1/email/config/test-connection
   * Test connection to email provider
   */
  @Post('test-connection')
  @ApiOperation({ summary: 'Test email provider connection' })
  async testConnection(@CurrentUser() user: AuthenticatedUser) {
    this.checkAcTenantAccess(user);

    const config = await this.emailConfigService.getDecryptedConfig();

    if (!config) {
      throw new BadRequestException({
        code: 'EMAIL_NOT_CONFIGURED',
        message: 'Email is not configured. Please save configuration first.',
      });
    }

    let result: { success: boolean; message: string; error?: string };

    if (config.provider === 'tencent_ses') {
      // For Tencent SES, we can only verify by checking if credentials are set
      if (config.tencentSes?.secretId && config.tencentSes?.secretKey) {
        result = {
          success: true,
          message: 'Tencent SES credentials are configured. Send a test email to verify.',
        };
      } else {
        result = {
          success: false,
          message: 'Tencent SES credentials are not configured',
        };
      }
    } else if (config.provider === 'smtp') {
      if (!config.smtp?.host) {
        result = {
          success: false,
          message: 'SMTP configuration is incomplete',
        };
      } else {
        // Test SMTP connection
        result = await this.smtpClient.testConnection(config.smtp);
      }
    } else {
      result = {
        success: false,
        message: `Unknown email provider: ${config.provider}`,
      };
    }

    return success(result);
  }
}
