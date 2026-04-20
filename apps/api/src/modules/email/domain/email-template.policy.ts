// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { normalizeSupportedUiLocale } from '@tcrn/shared';

import type {
  EmailTemplateTranslationCarrier,
  EmailTemplateTranslationMaps,
} from './email-template-translation.policy';
import { buildEmailTemplateTranslationMaps } from './email-template-translation.policy';
import type { RenderedEmail, SupportedLocale } from '../interfaces/email.interface';

export interface EmailTemplateStoredRecord extends EmailTemplateTranslationCarrier {
  code: string;
  variables: string[];
  category: string;
  isActive: boolean;
}

export interface EmailTemplateLocalizedContent extends EmailTemplateStoredRecord {
  translations: Record<string, string>;
  subjectTranslations: Record<string, string>;
  bodyHtmlTranslations: Record<string, string>;
  bodyTextTranslations: Record<string, string>;
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
  template: EmailTemplateStoredRecord,
  locale: SupportedLocale,
  variables: Record<string, string>,
): RenderedEmail => {
  const maps = buildEmailTemplateTranslationMaps(template);
  const subject = resolveLocalizedTranslation(
    maps.subjectTranslations,
    locale,
    template.subjectEn,
  );
  const htmlBody = resolveLocalizedTranslation(
    maps.bodyHtmlTranslations,
    locale,
    template.bodyHtmlEn,
  );
  const textBody = resolveOptionalLocalizedTranslation(
    maps.bodyTextTranslations,
    locale,
    template.bodyTextEn,
  );

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

export function decorateEmailTemplate(
  template: EmailTemplateStoredRecord,
): EmailTemplateLocalizedContent {
  const maps = buildEmailTemplateTranslationMaps(template);

  return {
    ...template,
    ...maps,
  };
}

function resolveLocalizedTranslation(
  translations: Record<string, string>,
  locale: SupportedLocale,
  fallback: string,
) {
  return resolveOptionalLocalizedTranslation(translations, locale, fallback) ?? fallback;
}

function resolveOptionalLocalizedTranslation(
  translations: Record<string, string>,
  locale: SupportedLocale,
  fallback: string | null,
) {
  const normalizedLocale = normalizeSupportedUiLocale(locale);

  if (normalizedLocale && translations[normalizedLocale]) {
    return translations[normalizedLocale];
  }

  if (locale.startsWith('zh')) {
    return translations.zh_HANT
      || translations.zh_HANS
      || translations.en
      || fallback
      || undefined;
  }

  const baseLanguage = locale.split(/[-_]/)[0];
  if (baseLanguage && translations[baseLanguage]) {
    return translations[baseLanguage];
  }

  return translations.en || fallback || undefined;
}

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
