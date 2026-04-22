import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';

import { Providers } from './providers';
import {
  BRAND_THEME_COLOR,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_PATH,
  resolveMetadataBase,
} from './site-metadata';

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: 'TCRN TMS',
  description: 'Talent operations management system',
  applicationName: 'TCRN TMS',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [{ url: '/icons/favicon-32x32.png', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'TCRN TMS',
    description: 'Talent operations management system',
    siteName: 'TCRN TMS',
    type: 'website',
    images: [
      {
        url: DEFAULT_OG_IMAGE_PATH,
        alt: DEFAULT_OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TCRN TMS',
    description: 'Talent operations management system',
    images: [DEFAULT_OG_IMAGE_PATH],
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_THEME_COLOR,
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
