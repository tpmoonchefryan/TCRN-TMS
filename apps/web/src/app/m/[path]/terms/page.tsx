// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PublicMarshmallowTermsScreen } from '@/domains/marshmallow/screens/PublicMarshmallowTermsScreen';

export default async function TermsPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  return PublicMarshmallowTermsScreen({ params });
}
