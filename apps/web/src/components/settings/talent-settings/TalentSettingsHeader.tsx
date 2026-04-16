// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { TalentData } from './types';

interface TalentSettingsHeaderProps {
  talent: TalentData;
  onBack: () => void;
  t: (key: string) => string;
  tTalent: (key: string) => string;
}

const getLifecycleBadgeVariant = (
  lifecycleStatus: TalentData['lifecycleStatus']
): 'default' | 'secondary' | 'warning' => {
  switch (lifecycleStatus) {
    case 'published':
      return 'default';
    case 'disabled':
      return 'secondary';
    case 'draft':
    default:
      return 'warning';
  }
};

const getLifecycleLabel = (
  lifecycleStatus: TalentData['lifecycleStatus'],
  tTalent: (key: string) => string
): string => {
  switch (lifecycleStatus) {
    case 'published':
      return tTalent('lifecyclePublished');
    case 'disabled':
      return tTalent('lifecycleDisabled');
    case 'draft':
    default:
      return tTalent('lifecycleDraft');
  }
};

export function TalentSettingsHeader({
  talent,
  onBack,
  t,
  tTalent,
}: TalentSettingsHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft size={20} />
      </Button>
      {talent.avatarUrl ? (
        <img
          src={talent.avatarUrl}
          alt={talent.displayName}
          className="w-12 h-12 rounded-full object-cover border-2 border-pink-200"
        />
      ) : (
        <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-full">
          <Sparkles size={24} className="text-pink-500" />
        </div>
      )}
      <div className="flex-1">
        <h1 className="text-2xl font-bold">{talent.displayName}</h1>
        <p className="text-muted-foreground">{t('talentSettings')}</p>
      </div>
      <Badge variant={getLifecycleBadgeVariant(talent.lifecycleStatus)}>
        {getLifecycleLabel(talent.lifecycleStatus, tTalent)}
      </Badge>
    </div>
  );
}
