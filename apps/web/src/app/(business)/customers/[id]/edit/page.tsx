// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { EditCustomerScreen } from '@/domains/customer-membership/screens/EditCustomerScreen';

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <EditCustomerScreen params={params} />;
}
