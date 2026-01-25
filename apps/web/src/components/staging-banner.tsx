// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';

import { isStaging } from '@/lib/utils';

export const STAGING_BANNER_HEIGHT = 36; // Height of staging banner in pixels

/**
 * Staging environment banner (PRD §4.4)
 * Shows a yellow banner in staging environment
 */
export function StagingBanner() {
  const t = useTranslations('staging');

  if (!isStaging()) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[100] bg-yellow-400 px-4 py-2 text-center text-sm font-medium text-yellow-900"
      style={{ height: STAGING_BANNER_HEIGHT }}
    >
      {t('banner')}
    </div>
  );
}
