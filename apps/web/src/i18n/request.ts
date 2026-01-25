// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

// Supported locales (PRD supports zh/en/ja)
export const locales = ['en', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Locale detection from cookie or Accept-Language header
async function getLocale(): Promise<Locale> {
  // Try to get from cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  if (localeCookie && locales.includes(localeCookie.value as Locale)) {
    return localeCookie.value as Locale;
  }

  // Try to detect from Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().split('-')[0])
      .find((lang) => locales.includes(lang as Locale));
    if (preferredLocale) {
      return preferredLocale as Locale;
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await getLocale();

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
