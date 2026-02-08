// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Building2,User } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';

// Local type definitions for flexibility with API responses
type ProfileType = 'individual' | 'company';

interface CustomerStatusType {
  id: string;
  code: string;
  name: string;
  color: string | null;
}

interface CustomerTypeIconProps {
  type: ProfileType | undefined;
  className?: string;
}

export function CustomerTypeIcon({ type, className }: CustomerTypeIconProps) {
  if (type === 'company') {
    return <Building2 className={className} />;
  }
  return <User className={className} />;
}

interface CustomerStatusBadgeProps {
  status: CustomerStatusType | null | undefined;
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-slate-500 border-slate-300">
        -
      </Badge>
    );
  }
  return (
    <Badge 
      variant="outline" 
      style={{ 
        backgroundColor: status.color ? `${status.color}20` : undefined, 
        color: status.color || undefined, 
        borderColor: status.color ? `${status.color}40` : undefined 
      }}
    >
      {status.name}
    </Badge>
  );
}
