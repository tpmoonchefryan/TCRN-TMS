// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PublicMarshmallowPrivacyScreen } from '@/domains/marshmallow/screens/PublicMarshmallowPrivacyScreen';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  return PublicMarshmallowPrivacyScreen({ params });
}
