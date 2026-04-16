// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { LegacyTalentHomepageRedirectScreen } from '@/domains/homepage-public/screens/LegacyTalentHomepageRedirectScreen';

export default async function LegacyTalentHomepagePage({
  params,
}: {
  params: Promise<{ talentPath: string }>;
}) {
  return LegacyTalentHomepageRedirectScreen({ params });
}
