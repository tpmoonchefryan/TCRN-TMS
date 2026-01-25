// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tencentcloud from 'tencentcloud-sdk-nodejs-ses';

import type { SendEmailParams } from '../interfaces/email.interface';

const SesClient = tencentcloud.ses.v20201002.Client;

/**
 * Dynamic Tencent SES configuration (from database)
 */
export interface TencentSesConfig {
  secretId: string;
  secretKey: string;
  region: string;
  fromAddress: string;
  fromName: string;
  replyTo?: string;
}

@Injectable()
export class TencentSesClient {
  private readonly logger = new Logger(TencentSesClient.name);
  private client: InstanceType<typeof SesClient> | null = null;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const secretId = this.configService.get<string>('TENCENT_SES_SECRET_ID');
    const secretKey = this.configService.get<string>('TENCENT_SES_SECRET_KEY');
    const region = this.configService.get<string>('TENCENT_SES_REGION') || 'ap-hongkong';

    this.isConfigured = !!(secretId && secretKey);

    if (this.isConfigured) {
      this.client = new SesClient({
        credential: {
          secretId: secretId!,
          secretKey: secretKey!,
        },
        region,
      });
      this.logger.log(`Tencent SES client initialized (region: ${region})`);
    } else {
      this.logger.warn(
        'Tencent SES credentials not configured. Emails will be logged instead of sent.',
      );
    }
  }

  /**
   * Check if SES client is properly configured (from env vars)
   */
  get configured(): boolean {
    return this.isConfigured;
  }

  /**
   * Create a new SES client with dynamic configuration
   */
  private createDynamicClient(config: TencentSesConfig): InstanceType<typeof SesClient> {
    return new SesClient({
      credential: {
        secretId: config.secretId,
        secretKey: config.secretKey,
      },
      region: config.region || 'ap-hongkong',
    });
  }

  /**
   * Send email via Tencent Cloud SES (using env vars)
   */
  async sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
    const fromAddress = this.configService.get<string>('TENCENT_SES_FROM_ADDRESS');
    const fromName = this.configService.get<string>('TENCENT_SES_FROM_NAME') || 'TCRN TMS';
    const replyTo = this.configService.get<string>('TENCENT_SES_REPLY_TO');

    // Development mode: log email instead of sending
    if (!this.client) {
      this.logger.log('=== DEV MODE: Email would be sent ===');
      this.logger.log(`To: ${params.to}`);
      this.logger.log(`Subject: ${params.subject}`);
      this.logger.log(`HTML Body (first 200 chars): ${params.htmlBody.substring(0, 200)}...`);
      return { messageId: `dev-${Date.now()}` };
    }

    try {
      const response = await this.client.SendEmail({
        FromEmailAddress: `${fromName} <${fromAddress}>`,
        Destination: [params.to],
        Subject: params.subject,
        Simple: {
          Html: params.htmlBody,
          Text: params.textBody || '',
        },
        ReplyToAddresses: replyTo || undefined,
      });

      this.logger.log(`Email sent successfully: ${response.MessageId}`);
      return { messageId: response.MessageId || '' };
    } catch (error) {
      this.logger.error(`Failed to send email to ${params.to}:`, error);
      throw error;
    }
  }

  /**
   * Send email via Tencent Cloud SES with dynamic configuration (from database)
   */
  async sendEmailWithConfig(params: SendEmailParams, config: TencentSesConfig): Promise<{ messageId: string }> {
    const client = this.createDynamicClient(config);

    try {
      const response = await client.SendEmail({
        FromEmailAddress: `${config.fromName} <${config.fromAddress}>`,
        Destination: [params.to],
        Subject: params.subject,
        Simple: {
          Html: params.htmlBody,
          Text: params.textBody || '',
        },
        ReplyToAddresses: config.replyTo || undefined,
      });

      this.logger.log(`Email sent via dynamic SES config: ${response.MessageId}`);
      return { messageId: response.MessageId || '' };
    } catch (error) {
      this.logger.error(`Failed to send email to ${params.to} via dynamic config:`, error);
      throw error;
    }
  }

  /**
   * Send a test email via Tencent SES with dynamic configuration
   */
  async sendTestEmail(testEmail: string, config: TencentSesConfig): Promise<string> {
    const client = this.createDynamicClient(config);

    try {
      const response = await client.SendEmail({
        FromEmailAddress: `${config.fromName} <${config.fromAddress}>`,
        Destination: [testEmail],
        Subject: 'TCRN TMS - Tencent SES Test Email',
        Simple: {
          Html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Tencent SES Configuration Test</h2>
              <p>This is a test email to verify your Tencent Cloud SES configuration.</p>
              <p style="color: #666;">
                <strong>Region:</strong> ${config.region}<br>
                <strong>From:</strong> ${config.fromAddress}<br>
                <strong>Time:</strong> ${new Date().toISOString()}
              </p>
              <hr style="border: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">
                This email was sent from TCRN TMS to test the Tencent SES configuration.
              </p>
            </div>
          `,
          Text: `Tencent SES Configuration Test\n\nThis is a test email to verify your Tencent Cloud SES configuration.\n\nRegion: ${config.region}\nFrom: ${config.fromAddress}\nTime: ${new Date().toISOString()}`,
        },
        ReplyToAddresses: config.replyTo || undefined,
      });

      this.logger.log(`SES test email sent to ${testEmail}: ${response.MessageId}`);
      return response.MessageId || '';
    } catch (error) {
      this.logger.error(`Failed to send SES test email to ${testEmail}:`, error);
      throw error;
    }
  }
}
