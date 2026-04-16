// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { CustomerDetailScreen } from '@/domains/customer-membership/screens/CustomerDetailScreen';

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CustomerDetailScreen params={params} />;
}
