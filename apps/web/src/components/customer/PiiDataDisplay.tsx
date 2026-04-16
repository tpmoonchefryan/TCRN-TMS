'use client';

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PiiReveal } from '@/components/customer/PiiReveal';
import type { CustomerProfileType } from '@/lib/api/modules/customer';

interface PiiDataDisplayProps {
  customerId: string;
  talentId: string;
  profileType?: CustomerProfileType;
  className?: string;
}

export function PiiDataDisplay({
  customerId,
  talentId,
  profileType,
  className,
}: PiiDataDisplayProps) {
  return (
    <PiiReveal
      customerId={customerId}
      talentId={talentId}
      profileType={profileType}
      className={className}
    />
  );
}

export default PiiDataDisplay;
