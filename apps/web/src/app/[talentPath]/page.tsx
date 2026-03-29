// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { permanentRedirect } from 'next/navigation';

export default async function LegacyTalentHomepagePage({
  params,
}: {
  params: Promise<{ talentPath: string }>;
}) {
  const { talentPath } = await params;
  permanentRedirect(`/p/${encodeURIComponent(talentPath)}`);
}
