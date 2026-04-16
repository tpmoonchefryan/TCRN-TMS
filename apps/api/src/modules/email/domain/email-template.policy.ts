// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RenderedEmail, SupportedLocale } from '../interfaces/email.interface';

export interface EmailTemplateLocalizedContent {
  subjectEn: string;
  subjectZh: string | null;
  subjectJa: string | null;
  bodyHtmlEn: string;
  bodyHtmlZh: string | null;
  bodyHtmlJa: string | null;
  bodyTextEn: string | null;
  bodyTextZh: string | null;
  bodyTextJa: string | null;
}

const replaceTemplateVariables = (
  value: string,
  variables: Record<string, string>,
): string => {
  let rendered = value;

  for (const [key, variableValue] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(pattern, variableValue);
  }

  return rendered;
};

export const renderEmailTemplate = (
  template: EmailTemplateLocalizedContent,
  locale: SupportedLocale,
  variables: Record<string, string>,
): RenderedEmail => {
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

  const renderedSubject = replaceTemplateVariables(subject, variables);
  const renderedHtmlBody = replaceTemplateVariables(htmlBody, variables);
  const renderedTextBody = textBody
    ? replaceTemplateVariables(textBody, variables)
    : undefined;

  return {
    subject: renderedSubject,
    htmlBody: renderedHtmlBody,
    textBody: renderedTextBody,
  };
};

export const fillPreviewVariables = (
  templateVariables: string[] | null | undefined,
  variables: Record<string, string>,
): Record<string, string> => {
  const filledVariables = { ...variables };

  for (const variableName of templateVariables ?? []) {
    if (!filledVariables[variableName]) {
      filledVariables[variableName] = `[${variableName}]`;
    }
  }

  return filledVariables;
};
