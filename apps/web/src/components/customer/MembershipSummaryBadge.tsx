// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Crown, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui';
import { membershipApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface MembershipSummary {
  highestLevel: {
    platformCode: string;
    platformName: string;
    levelCode: string;
    levelName: string;
    color: string;
  } | null;
  activeCount: number;
  totalCount: number;
}

interface MembershipSummaryBadgeProps {
  customerId: string;
  talentId: string;
  className?: string;
  showCounts?: boolean;
  onClick?: () => void;
}

export function MembershipSummaryBadge({
  customerId,
  talentId,
  className,
  showCounts = true,
  onClick,
}: MembershipSummaryBadgeProps) {
  const t = useTranslations('membershipSummary');
  
  const [summary, setSummary] = useState<MembershipSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get membership list and calculate summary
      const response = await membershipApi.list(customerId, talentId, {
        includeExpired: false,
        isActive: true,
      });
      
      if (response.success && response.data) {
        const memberships = Array.isArray(response.data) ? response.data : [];
        
        // Calculate summary from memberships
        const activeCount = memberships.length;
        
        // Find highest level (lowest rank value)
        let highestLevel: MembershipSummary['highestLevel'] = null;
        let lowestRank = Infinity;
        
        for (const m of memberships) {
          const rank = m.membershipLevel?.rank ?? 999;
          if (rank < lowestRank) {
            lowestRank = rank;
            highestLevel = {
              platformCode: m.platform?.code || '',
              platformName: m.platform?.displayName || m.platform?.name || '',
              levelCode: m.membershipLevel?.code || '',
              levelName: m.membershipLevel?.name || '',
              color: m.membershipLevel?.color || '#808080',
            };
          }
        }

        // Get total count (including expired)
        const totalResponse = await membershipApi.list(customerId, talentId, {
          includeExpired: true,
        });
        const totalCount = Array.isArray(totalResponse.data) ? totalResponse.data.length : 0;
        
        setSummary({
          highestLevel,
          activeCount,
          totalCount,
        });
      }
    } catch {
      // Silent fail - show no memberships
      setSummary({
        highestLevel: null,
        activeCount: 0,
        totalCount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [customerId, talentId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (isLoading) {
    return (
      <div className={cn('inline-flex items-center gap-1', className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary || (!summary.highestLevel && summary.activeCount === 0)) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        {t('noMemberships')}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 cursor-pointer',
        onClick && 'hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Highest level badge */}
      {summary.highestLevel && (
        <Badge
          className="px-2 py-0.5 text-xs font-medium flex items-center gap-1"
          style={{ 
            backgroundColor: `${summary.highestLevel.color}20`,
            color: summary.highestLevel.color,
            borderColor: summary.highestLevel.color,
          }}
        >
          <Crown className="h-3 w-3" />
          <span>{summary.highestLevel.levelName}</span>
          {summary.highestLevel.platformName && (
            <span className="opacity-70">({summary.highestLevel.platformName})</span>
          )}
        </Badge>
      )}
      
      {/* Counts */}
      {showCounts && (
        <span className="text-xs text-muted-foreground">
          {t('activeCount', { count: summary.activeCount })}
          {summary.totalCount > summary.activeCount && (
            <span className="ml-1 opacity-70">
              / {t('totalCount', { count: summary.totalCount })}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
