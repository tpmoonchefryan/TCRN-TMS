// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { SendEmailDto } from '../dto/send-email.dto';
import type { EmailJobData } from '../interfaces/email.interface';

export interface EmailDispatchTemplate {
  isActive: boolean;
}

export const EMAIL_JOB_NAME = 'send-email';

export const hasEmailDispatchRecipient = (
  dto: Pick<SendEmailDto, 'recipientEmail'>,
): boolean => Boolean(dto.recipientEmail);

export const canDispatchEmailTemplate = (
  template: EmailDispatchTemplate | null | undefined,
): boolean => Boolean(template?.isActive);

export const buildEmailJobData = (dto: SendEmailDto): EmailJobData => ({
  tenantSchema: dto.tenantSchema,
  templateCode: dto.templateCode,
  recipientEmail: dto.recipientEmail,
  locale: dto.locale || 'en',
  variables: dto.variables || {},
});

export const buildSystemEmailDto = (
  email: string,
  templateCode: string,
  locale: string = 'en',
  variables: Record<string, string> = {},
): SendEmailDto => ({
  tenantSchema: 'public',
  templateCode,
  recipientEmail: email,
  locale,
  variables,
});

export const buildBusinessEmailDto = (
  tenantSchema: string,
  recipientEmail: string,
  templateCode: string,
  locale: string = 'en',
  variables: Record<string, string> = {},
): SendEmailDto => ({
  tenantSchema,
  templateCode,
  recipientEmail,
  locale,
  variables,
});

export const buildEmailJobOptions = () => ({
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { age: 86400 },
  removeOnFail: { age: 604800 },
});
