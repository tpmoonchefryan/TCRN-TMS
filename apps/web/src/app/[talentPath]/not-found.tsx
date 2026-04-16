// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui';

export default async function NotFound() {
  const t = await getTranslations('runtimeMessages.notFound');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="text-center px-4">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('talentDescription')}
        </p>
        <Link href="/">
          <Button>{t('goToHomepage')}</Button>
        </Link>
      </div>
    </div>
  );
}
