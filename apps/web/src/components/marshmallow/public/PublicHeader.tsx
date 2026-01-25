// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { isStaging } from '@/lib/utils';

import { LanguageSwitcher } from './LanguageSwitcher';

export function PublicHeader() {
  const stagingOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;
  
  return (
    <header 
      className="relative z-[150] bg-transparent"
      style={{ marginTop: stagingOffset }}
    >
      <div className="max-w-2xl mx-auto px-4 py-3 flex justify-end">
        <LanguageSwitcher />
      </div>
    </header>
  );
}
