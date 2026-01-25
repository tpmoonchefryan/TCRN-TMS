// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

// Nested talent settings page - uses shared TalentSettingsContent component
// This page is for talents under a subsidiary (nested path)

import { useParams } from 'next/navigation';

import { TalentSettingsContent } from '@/components/settings/TalentSettingsContent';

export default function TalentSettingsPage() {
  const params = useParams();
  const subsidiaryId = params.subsidiaryId as string;

  return <TalentSettingsContent subsidiaryId={subsidiaryId} />;
}
