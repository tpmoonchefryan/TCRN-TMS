// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Redirect to settings page with details tab
export default function DirectTalentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const talentId = params.talentId as string;

  useEffect(() => {
    router.replace(`/tenant/${tenantId}/talent/${talentId}/settings?tab=details`);
  }, [router, tenantId, talentId]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
