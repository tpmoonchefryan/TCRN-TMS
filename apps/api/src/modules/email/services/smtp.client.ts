// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import type { SendEmailParams } from '../interfaces/email.interface';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

export interface SmtpTestResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * SMTP Email Client
 * Sends emails via SMTP using nodemailer
 */
@Injectable()
export class SmtpClient {
  private readonly logger = new Logger(SmtpClient.name);

  /**
   * Create a transporter with the given config
   */
  private createTransporter(config: SmtpConfig): Transporter<SMTPTransport.SentMessageInfo> {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: {
        user: config.username,
        pass: config.password,
      },
      // Connection timeout
      connectionTimeout: 10000, // 10 seconds
      // Greeting timeout
      greetingTimeout: 10000,
      // Socket timeout
      socketTimeout: 30000,
    });
  }

  /**
   * Send email via SMTP
   */
  async sendEmail(params: SendEmailParams, config: SmtpConfig): Promise<{ messageId: string }> {
    const transporter = this.createTransporter(config);

    try {
      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: params.to,
        subject: params.subject,
        html: params.htmlBody,
        text: params.textBody || undefined,
      });

      this.logger.log(`Email sent via SMTP: ${info.messageId}`);
      return { messageId: info.messageId || '' };
    } catch (error) {
      this.logger.error(`Failed to send email via SMTP to ${params.to}:`, error);
      throw error;
    } finally {
      transporter.close();
    }
  }

  /**
   * Test SMTP connection
   */
  async testConnection(config: SmtpConfig): Promise<SmtpTestResult> {
    const transporter = this.createTransporter(config);

    try {
      await transporter.verify();
      this.logger.log(`SMTP connection test successful (${config.host}:${config.port})`);
      return {
        success: true,
        message: 'SMTP connection verified successfully',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`SMTP connection test failed (${config.host}:${config.port}): ${err.message}`);
      return {
        success: false,
        message: 'SMTP connection failed',
        error: err.message,
      };
    } finally {
      transporter.close();
    }
  }

  /**
   * Send a test email via SMTP
   */
  async sendTestEmail(testEmail: string, config: SmtpConfig): Promise<SmtpTestResult> {
    const transporter = this.createTransporter(config);

    try {
      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: testEmail,
        subject: 'TCRN TMS - SMTP Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">SMTP Configuration Test</h2>
            <p>This is a test email to verify your SMTP configuration.</p>
            <p style="color: #666;">
              <strong>Server:</strong> ${config.host}:${config.port}<br>
              <strong>From:</strong> ${config.fromAddress}<br>
              <strong>Time:</strong> ${new Date().toISOString()}
            </p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              This email was sent from TCRN TMS to test the SMTP configuration.
            </p>
          </div>
        `,
        text: `SMTP Configuration Test\n\nThis is a test email to verify your SMTP configuration.\n\nServer: ${config.host}:${config.port}\nFrom: ${config.fromAddress}\nTime: ${new Date().toISOString()}`,
      });

      this.logger.log(`SMTP test email sent to ${testEmail}: ${info.messageId}`);
      return {
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to send SMTP test email to ${testEmail}: ${err.message}`);
      return {
        success: false,
        message: 'Failed to send test email',
        error: err.message,
      };
    } finally {
      transporter.close();
    }
  }
}
