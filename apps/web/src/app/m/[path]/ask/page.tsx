// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { PublicMarshmallowAskScreen } from '@/domains/marshmallow/screens/PublicMarshmallowAskScreen';

export default function AskMarshmallowPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  return <PublicMarshmallowAskScreen params={params} />;
}
