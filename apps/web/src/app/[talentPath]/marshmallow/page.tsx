// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { LegacyTalentMarshmallowRedirectScreen } from '@/domains/marshmallow/screens/LegacyTalentMarshmallowRedirectScreen';

export default async function LegacyTalentMarshmallowPage({
  params,
}: {
  params: Promise<{ talentPath: string }>;
}) {
  return LegacyTalentMarshmallowRedirectScreen({ params });
}
