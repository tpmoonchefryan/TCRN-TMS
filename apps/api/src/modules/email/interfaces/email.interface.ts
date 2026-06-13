// SPDX-License-Identifier: Apache-2.0
import type { SupportedUiLocale } from '@tcrn/shared';

export interface EmailJobData {
  tenantSchema: string;
  templateCode: string;
  recipientEmail: string;
  locale: string;
  variables: Record<string, string>;
}

export interface EmailJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export type EmailCategory = 'system' | 'business';

export type SupportedLocale = SupportedUiLocale;
