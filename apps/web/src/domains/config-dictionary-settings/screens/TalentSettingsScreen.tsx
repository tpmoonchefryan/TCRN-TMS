// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { TalentSettingsContent } from '@/components/settings/TalentSettingsContent';

interface TalentSettingsScreenProps {
  subsidiaryId?: string;
}

export function TalentSettingsScreen({ subsidiaryId }: TalentSettingsScreenProps) {
  return <TalentSettingsContent subsidiaryId={subsidiaryId} />;
}
