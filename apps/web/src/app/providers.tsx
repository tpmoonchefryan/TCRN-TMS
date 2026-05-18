'use client';

import { UiLocaleProvider } from '@/platform/runtime/locale/locale-provider';
import { SessionProvider } from '@/platform/runtime/session/session-provider';

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <UiLocaleProvider>{children}</UiLocaleProvider>
    </SessionProvider>
  );
}
