// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

// Self-hosted fonts (PRD §5 可商用字体 - OFL-1.1 licensed)
import '@/styles/globals.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-jp';
import '@fontsource-variable/noto-sans-sc';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Toaster } from 'sonner';

import { StagingBanner } from '@/components/staging-banner';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('runtimeMessages.metadata');

  return {
    title: t('title'),
    description: t('description'),
    keywords: ['VTuber', 'VUP', 'CRM', 'Talent Management', 'TCRN'],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StagingBanner />
          <main suppressHydrationWarning>{children}</main>
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
