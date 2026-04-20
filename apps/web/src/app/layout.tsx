import '@/styles/globals.css';

import type { Metadata } from 'next';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'TCRN TMS',
  description: 'Talent operations management system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
