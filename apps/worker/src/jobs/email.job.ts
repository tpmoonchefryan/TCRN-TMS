// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { prisma } from '@tcrn/database';
import {
  DEFAULT_EMAIL_FROM_ADDRESS,
  DEFAULT_EMAIL_FROM_NAME,
  DEFAULT_EMAIL_PROVIDER,
  DEFAULT_TENCENT_SES_REGION,
  EMAIL_CONFIG_KEY,
  type EmailProvider,
  mask,
  normalizeStoredEmailConfig,
} from '@tcrn/shared';
import type { Job, Processor } from 'bullmq';
import { createDecipheriv } from 'crypto';
import * as nodemailer from 'nodemailer';
import * as tencentcloud from 'tencentcloud-sdk-nodejs-ses';

import { workerLogger as logger } from '../logger';

const SesClient = tencentcloud.ses.v20201002.Client;

// Job data interface
interface EmailJobData {
  tenantSchema: string;
  templateCode: string;
  recipientEmail: string;
  locale: string;
  variables: Record<string, string>;
}

// Job result interface
interface EmailJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email configuration from database
interface EmailConfig {
  provider: EmailProvider;
  tencentSes?: {
    secretId: string;
    secretKey: string;
    region: string;
    fromAddress: string;
    fromName: string;
    replyTo?: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
  };
}

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.EMAIL_CONFIG_ENCRYPTION_KEY;

  if (!key || key.length !== 64) {
    logger.warn('[EmailJob] EMAIL_CONFIG_ENCRYPTION_KEY not configured, using fallback');
    return Buffer.alloc(32, 'email-dev-key');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Decrypt a value
 */
function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    return ciphertext; // Not encrypted
  }

  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    logger.warn('[EmailJob] Failed to decrypt value, returning as-is');
    return ciphertext;
  }
}

/**
 * Get email configuration from database or environment
 */
export async function getEmailConfig(): Promise<EmailConfig | null> {
  // Try to get from database first
  const config = await prisma.globalConfig.findUnique({
    where: { key: EMAIL_CONFIG_KEY },
  });

  if (config?.value) {
    const stored = normalizeStoredEmailConfig(config.value);
    const result: EmailConfig = {
      provider: stored.provider,
    };

    if (stored.tencentSes) {
      result.tencentSes = {
        secretId: decrypt(stored.tencentSes.secretId ?? ''),
        secretKey: decrypt(stored.tencentSes.secretKey ?? ''),
        region: stored.tencentSes.region || DEFAULT_TENCENT_SES_REGION,
        fromAddress: stored.tencentSes.fromAddress ?? '',
        fromName: stored.tencentSes.fromName ?? '',
        replyTo: stored.tencentSes.replyTo,
      };
    }

    if (stored.smtp) {
      result.smtp = {
        host: stored.smtp.host ?? '',
        port: stored.smtp.port ?? 465,
        secure: stored.smtp.secure ?? true,
        username: stored.smtp.username ?? '',
        password: decrypt(stored.smtp.password ?? ''),
        fromAddress: stored.smtp.fromAddress ?? '',
        fromName: stored.smtp.fromName ?? '',
      };
    }

    return result;
  }

  // Fallback to environment variables
  const secretId = process.env.TENCENT_SES_SECRET_ID;
  const secretKey = process.env.TENCENT_SES_SECRET_KEY;

  if (secretId && secretKey) {
    return {
      provider: DEFAULT_EMAIL_PROVIDER,
      tencentSes: {
        secretId,
        secretKey,
        region: process.env.TENCENT_SES_REGION || DEFAULT_TENCENT_SES_REGION,
        fromAddress: process.env.TENCENT_SES_FROM_ADDRESS || DEFAULT_EMAIL_FROM_ADDRESS,
        fromName: process.env.TENCENT_SES_FROM_NAME || DEFAULT_EMAIL_FROM_NAME,
        replyTo: process.env.TENCENT_SES_REPLY_TO,
      },
    };
  }

  return null;
}

/**
 * Get email address from explicit payload only
 */
async function getRecipientEmail(
  recipientEmail?: string,
): Promise<string> {
  if (recipientEmail) {
    return recipientEmail;
  }

  throw new Error(
    'Recipient email must be provided explicitly. Worker-side PII lookup has been retired.',
  );
}

/**
 * Get and render email template
 */
async function renderTemplate(
  templateCode: string,
  locale: string,
  variables: Record<string, string>,
): Promise<{ subject: string; htmlBody: string; textBody?: string }> {
  const template = await prisma.emailTemplate.findUnique({
    where: { code: templateCode },
  });

  if (!template) {
    throw new Error(`Email template not found: ${templateCode}`);
  }

  if (!template.isActive) {
    throw new Error(`Email template is not active: ${templateCode}`);
  }

  // Select locale-specific content with fallback to English
  let subject: string;
  let htmlBody: string;
  let textBody: string | undefined;

  switch (locale) {
    case 'zh':
      subject = template.subjectZh || template.subjectEn;
      htmlBody = template.bodyHtmlZh || template.bodyHtmlEn;
      textBody = template.bodyTextZh || template.bodyTextEn || undefined;
      break;
    case 'ja':
      subject = template.subjectJa || template.subjectEn;
      htmlBody = template.bodyHtmlJa || template.bodyHtmlEn;
      textBody = template.bodyTextJa || template.bodyTextEn || undefined;
      break;
    default:
      subject = template.subjectEn;
      htmlBody = template.bodyHtmlEn;
      textBody = template.bodyTextEn || undefined;
  }

  // Replace variables using {{variableName}} pattern
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(pattern, value);
    htmlBody = htmlBody.replace(pattern, value);
    if (textBody) {
      textBody = textBody.replace(pattern, value);
    }
  }

  return { subject, htmlBody, textBody };
}

/**
 * Send email via Tencent SES
 */
async function sendViaTencentSes(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string | undefined,
  config: NonNullable<EmailConfig['tencentSes']>,
): Promise<string> {
  const client = new SesClient({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey,
    },
    region: config.region,
  });

  const response = await client.SendEmail({
    FromEmailAddress: `${config.fromName} <${config.fromAddress}>`,
    Destination: [to],
    Subject: subject,
    Simple: {
      Html: htmlBody,
      Text: textBody || '',
    },
    ReplyToAddresses: config.replyTo || undefined,
  });

  return response.MessageId || '';
}

/**
 * Send email via SMTP
 */
async function sendViaSmtp(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string | undefined,
  config: NonNullable<EmailConfig['smtp']>,
): Promise<string> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to,
      subject,
      html: htmlBody,
      text: textBody || undefined,
    });

    return info.messageId || '';
  } finally {
    transporter.close();
  }
}

/**
 * Send email using configured provider
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string,
): Promise<string> {
  const config = await getEmailConfig();

  // Development mode: log email instead of sending
  if (!config) {
    logger.info('[EmailJob] === DEV MODE: Email would be sent ===');
    logger.info(`[EmailJob] To: ${mask.email(to)}`);
    logger.info(`[EmailJob] Subject: ${subject}`);
    logger.info(`[EmailJob] HTML Body (first 200 chars): ${htmlBody.substring(0, 200)}...`);
    return `dev-${Date.now()}`;
  }

  if (config.provider === 'tencent_ses' && config.tencentSes) {
    logger.info(`[EmailJob] Sending via Tencent SES to ${mask.email(to)}`);
    return sendViaTencentSes(to, subject, htmlBody, textBody, config.tencentSes);
  }

  if (config.provider === 'smtp' && config.smtp) {
    logger.info(`[EmailJob] Sending via SMTP to ${mask.email(to)}`);
    return sendViaSmtp(to, subject, htmlBody, textBody, config.smtp);
  }

  throw new Error(`Invalid email configuration: provider=${config.provider}`);
}

/**
 * Log email error to tenant schema
 */
async function logEmailError(
  tenantSchema: string,
  templateCode: string,
  recipientHint: string,
  locale: string,
  errorCode: string,
  errorMessage: string,
  retryCount: number,
): Promise<void> {
  try {
    // Use raw query to insert into tenant schema
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${tenantSchema}".email_log 
        (id, template_code, recipient_hint, locale, error_code, error_message, retry_count, created_at)
      VALUES 
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
    `, templateCode, recipientHint, locale, errorCode, errorMessage, retryCount);
  } catch (logError) {
    logger.error(`[EmailJob] Failed to log email error: ${logError}`);
  }
}

/**
 * Email job processor
 */
export const emailJobProcessor: Processor<EmailJobData, EmailJobResult> = async (
  job: Job<EmailJobData, EmailJobResult>,
) => {
  const startTime = Date.now();
  const { tenantSchema, templateCode, recipientEmail, locale, variables } = job.data;

  logger.info(`[EmailJob] Processing job ${job.id} (template: ${templateCode})`);

  let email: string | undefined;

  try {
    // 1. Get recipient email
    email = await getRecipientEmail(recipientEmail);
    
    // 2. Render template
    const rendered = await renderTemplate(templateCode, locale, variables);
    
    // 3. Send email
    const messageId = await sendEmail(email, rendered.subject, rendered.htmlBody, rendered.textBody);
    
    const duration = Date.now() - startTime;
    logger.info(`[EmailJob] Job ${job.id} completed in ${duration}ms (messageId: ${messageId})`);

    return { success: true, messageId };
  } catch (error) {
    const err = error as Error & { code?: string };
    const duration = Date.now() - startTime;
    
    logger.error(`[EmailJob] Job ${job.id} failed after ${duration}ms:`, err.message);

    // Log error to tenant schema
    await logEmailError(
      tenantSchema,
      templateCode,
      email ? mask.email(email) : 'unknown',
      locale,
      err.code || 'UNKNOWN',
      err.message,
      job.attemptsMade,
    );

    // Re-throw to trigger retry
    throw error;
  }
};
