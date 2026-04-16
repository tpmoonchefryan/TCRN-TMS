// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards';
import { success } from '../../../common/response.util';
import { SaveEmailConfigDto, TestEmailDto } from '../dto/email-config.dto';
import { EmailConfigService } from '../services/email-config.service';
import { SmtpClient } from '../services/smtp.client';
import { TencentSesClient } from '../services/tencent-ses.client';

const EMAIL_CONFIG_DATA_SCHEMA = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      enum: ['tencent_ses', 'smtp'],
      example: 'smtp',
    },
    tencentSes: {
      type: 'object',
      nullable: true,
      properties: {
        secretId: { type: 'string', example: 'AKID***1234' },
        secretKey: { type: 'string', example: 'supe***key' },
        region: { type: 'string', example: 'ap-hongkong' },
        fromAddress: { type: 'string', example: 'noreply@tcrn.app' },
        fromName: { type: 'string', example: 'TCRN TMS' },
        replyTo: { type: 'string', nullable: true, example: 'support@tcrn.app' },
      },
    },
    smtp: {
      type: 'object',
      nullable: true,
      properties: {
        host: { type: 'string', example: 'smtp.example.com' },
        port: { type: 'integer', example: 465 },
        secure: { type: 'boolean', example: true },
        username: { type: 'string', example: 'smtp-user' },
        password: { type: 'string', example: 'smtp***word' },
        fromAddress: { type: 'string', example: 'noreply@tcrn.app' },
        fromName: { type: 'string', example: 'TCRN TMS' },
      },
    },
    isConfigured: { type: 'boolean', example: true },
    lastUpdated: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-04-13T08:30:00.000Z',
    },
  },
  required: ['provider', 'isConfigured'],
} as const;

const EMAIL_ACTION_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Connection test completed successfully' },
    error: { type: 'string', nullable: true, example: null },
  },
  required: ['success', 'message'],
} as const;

const createSuccessEnvelopeSchema = (dataSchema: Record<string, unknown>, exampleData: unknown) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: exampleData,
  },
});

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code,
      message,
    },
  },
});

const EMAIL_CONFIG_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(EMAIL_CONFIG_DATA_SCHEMA, {
  provider: 'smtp',
  smtp: {
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    username: 'smtp-user',
    password: 'smtp***word',
    fromAddress: 'noreply@tcrn.app',
    fromName: 'TCRN TMS',
  },
  isConfigured: true,
  lastUpdated: '2026-04-13T08:30:00.000Z',
});

const EMAIL_ACTION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(EMAIL_ACTION_RESULT_SCHEMA, {
  success: true,
  message: 'Connection test completed successfully',
  error: null,
});

const EMAIL_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  'INVALID_CONFIG',
  'Email provider configuration is invalid or incomplete',
);

const EMAIL_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const EMAIL_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_FORBIDDEN',
  'Email configuration is only available for AC tenant administrators',
);

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
  @ApiResponse({
    status: 200,
    description: 'Returns masked email provider configuration',
    schema: EMAIL_CONFIG_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read email configuration',
    schema: EMAIL_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can read email configuration',
    schema: EMAIL_FORBIDDEN_SCHEMA,
  })
  async getConfig(@CurrentUser() user: AuthenticatedUser) {
    this.checkAcTenantAccess(user);
    const config = await this.emailConfigService.getConfig();
    return success(config);
  }

  /**
   * PATCH /api/v1/email/config
   * Save email configuration
   */
  @Patch()
  @ApiOperation({ summary: 'Save email configuration' })
  @ApiResponse({
    status: 200,
    description: 'Returns masked email provider configuration after save',
    schema: EMAIL_CONFIG_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Email provider configuration is invalid or incomplete',
    schema: EMAIL_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to save email configuration',
    schema: EMAIL_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can save email configuration',
    schema: EMAIL_FORBIDDEN_SCHEMA,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Returns the test email execution result',
    schema: EMAIL_ACTION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Email provider is not configured or config is incomplete',
    schema: EMAIL_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to send a test email',
    schema: EMAIL_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can send a test email',
    schema: EMAIL_FORBIDDEN_SCHEMA,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Returns the email provider connection test result',
    schema: EMAIL_ACTION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Email provider is not configured or config is incomplete',
    schema: EMAIL_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to test the email provider connection',
    schema: EMAIL_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Only AC tenant administrators can test the email provider connection',
    schema: EMAIL_FORBIDDEN_SCHEMA,
  })
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
