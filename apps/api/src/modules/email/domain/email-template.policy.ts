// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { pickLocalizedText, type LocalizedText } from '@tcrn/shared';

import type { RenderedEmail, SupportedLocale } from '../interfaces/email.interface';

export interface EmailTemplateStoredRecord {
  code: string;
  name: LocalizedText;
  subject: LocalizedText;
  bodyHtml: LocalizedText;
  bodyText: LocalizedText;
  variables: string[];
  category: string;
  isActive: boolean;
}

export type EmailTemplateLocalizedContent = EmailTemplateStoredRecord;

const replaceTemplateVariables = (value: string, variables: Record<string, string>): string => {
  let rendered = value;

  for (const [key, variableValue] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(pattern, variableValue);
  }

  return rendered;
};

export const renderEmailTemplate = (
  template: EmailTemplateStoredRecord,
  locale: SupportedLocale,
  variables: Record<string, string>
): RenderedEmail => {
  const subject = pickLocalizedText(template.subject, locale);
  const htmlBody = pickLocalizedText(template.bodyHtml, locale);
  const textBody = pickLocalizedText(template.bodyText, locale);

  const renderedSubject = replaceTemplateVariables(subject, variables);
  const renderedHtmlBody = replaceTemplateVariables(htmlBody, variables);
  const renderedTextBody = textBody.trim()
    ? replaceTemplateVariables(textBody, variables)
    : undefined;

  return {
    subject: renderedSubject,
    htmlBody: renderedHtmlBody,
    textBody: renderedTextBody,
  };
};

export function decorateEmailTemplate(
  template: EmailTemplateStoredRecord
): EmailTemplateLocalizedContent {
  return template;
}

export const fillPreviewVariables = (
  templateVariables: string[] | null | undefined,
  variables: Record<string, string>
): Record<string, string> => {
  const filledVariables = { ...variables };

  for (const variableName of templateVariables ?? []) {
    if (!filledVariables[variableName]) {
      filledVariables[variableName] = `[${variableName}]`;
    }
  }

  return filledVariables;
};
