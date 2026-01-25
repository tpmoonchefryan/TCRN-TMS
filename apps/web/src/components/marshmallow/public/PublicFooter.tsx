// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface PublicFooterProps {
  path: string;
}

export function PublicFooter({ path }: PublicFooterProps) {
  const t = useTranslations('legal');

  return (
    <footer className="py-8 text-center text-xs text-slate-400">
      <p>Powered by <span className="font-semibold text-slate-500">TCRN TMS</span></p>
      <p className="mt-1">
        <Link href={`/m/${path}/terms`} className="hover:underline">{t('termsOfService')}</Link>
        {' • '}
        <Link href={`/m/${path}/privacy`} className="hover:underline">{t('privacyPolicy')}</Link>
      </p>
    </footer>
  );
}
