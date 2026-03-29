// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { permanentRedirect } from 'next/navigation';

export default async function LegacyTalentMarshmallowPage({
  params,
}: {
  params: Promise<{ talentPath: string }>;
}) {
  const { talentPath } = await params;
  permanentRedirect(`/m/${encodeURIComponent(talentPath)}`);
}
