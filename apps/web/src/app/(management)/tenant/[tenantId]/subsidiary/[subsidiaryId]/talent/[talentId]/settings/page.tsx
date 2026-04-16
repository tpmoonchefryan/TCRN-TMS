// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useParams } from 'next/navigation';

import { TalentSettingsScreen } from '@/domains/config-dictionary-settings/screens/TalentSettingsScreen';

export default function TalentSettingsPage() {
  const params = useParams();
  const subsidiaryId = params.subsidiaryId as string;

  return <TalentSettingsScreen subsidiaryId={subsidiaryId} />;
}
