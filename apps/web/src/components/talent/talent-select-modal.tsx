// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useState } from 'react';


import { TalentSwitcherCompact } from './talent-switcher';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TalentInfo } from '@/stores/talent-store';

interface TalentSelectModalProps {
  open: boolean;
  talents: TalentInfo[];
  onSelect: (talent: TalentInfo) => void;
  title?: string;
  description?: string;
}

export function TalentSelectModal({
  open,
  talents,
  onSelect,
  title,
  description,
}: TalentSelectModalProps) {
  const t = useTranslations('talentModal');
  const [selectedTalent, setSelectedTalent] = useState<TalentInfo | null>(null);

  const handleConfirm = () => {
    if (selectedTalent) {
      onSelect(selectedTalent);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title || t('selectTalent')}</DialogTitle>
          <DialogDescription>{description || t('selectTalentDesc')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto py-4">
          <TalentSwitcherCompact
            talents={talents}
            selectedId={selectedTalent?.id}
            onSelect={setSelectedTalent}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!selectedTalent} className="w-full sm:w-auto">
            {t('continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// No talent available message component
export function NoTalentMessage() {
  const t = useTranslations('talentModal');
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center dark:border-yellow-900 dark:bg-yellow-950">
      <p className="text-sm text-yellow-800 dark:text-yellow-200">
        {t('noTalentExists')}
      </p>
    </div>
  );
}
