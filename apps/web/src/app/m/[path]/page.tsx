// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PublicMarshmallowFeedScreen } from '@/domains/marshmallow/screens/PublicMarshmallowFeedScreen';

export default async function MarshmallowFeedPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  return PublicMarshmallowFeedScreen({ params });
}
