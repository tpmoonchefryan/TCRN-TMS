// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ArrowRight, Loader2, RefreshCw, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui';
import { platformIdentityApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface HistoryRecord {
  id: string;
  identityId: string;
  platform: {
    code: string;
    name: string;
  };
  changeType: 'uid_changed' | 'nickname_changed' | 'deactivated';
  oldValue?: string;
  newValue?: string;
  capturedAt: string;
  capturedBy?: {
    id: string;
    username: string;
  };
}

interface IdentityHistoryTimelineProps {
  customerId: string;
  talentId: string;
  platformCode?: string;
  maxItems?: number;
}

export function IdentityHistoryTimeline({
  customerId,
  talentId,
  platformCode,
  maxItems = 10,
}: IdentityHistoryTimelineProps) {
  const t = useTranslations('identityHistory');
  
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const loadHistory = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const response = await platformIdentityApi.history(customerId, talentId, {
        platformCode,
        page: pageNum,
        pageSize: maxItems,
      });
      if (response.success && response.data) {
        const items = response.data as HistoryRecord[];
        if (pageNum === 1) {
          setHistory(items);
        } else {
          setHistory(prev => [...prev, ...items]);
        }
        // Check if there are more items
        setHasMore(items.length === maxItems);
      }
    } catch {
      // Silent fail - just show no history
    } finally {
      setIsLoading(false);
    }
  }, [customerId, talentId, platformCode, maxItems]);

  useEffect(() => {
    loadHistory(1);
  }, [loadHistory]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadHistory(nextPage);
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'uid_changed':
        return t('uidChanged');
      case 'nickname_changed':
        return t('nicknameChanged');
      case 'deactivated':
        return t('deactivated');
      default:
        return changeType;
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'uid_changed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'nickname_changed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'deactivated':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && history.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">{t('loading')}</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <RefreshCw className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative pl-6 border-l-2 border-border space-y-4">
        {history.map((record) => (
          <div key={record.id} className="relative">
            {/* Timeline dot */}
            <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            
            {/* Content */}
            <div className="bg-card border rounded-lg p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {record.platform?.name || record.platform?.code}
                  </span>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    getChangeTypeColor(record.changeType)
                  )}>
                    {getChangeTypeLabel(record.changeType)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(record.capturedAt)}
                </span>
              </div>
              
              {/* Value change display */}
              {(record.oldValue || record.newValue) && (
                <div className="flex items-center gap-2 text-sm">
                  {record.oldValue && (
                    <span className="px-2 py-1 bg-muted rounded text-muted-foreground font-mono text-xs">
                      {record.oldValue}
                    </span>
                  )}
                  {record.oldValue && record.newValue && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  )}
                  {record.newValue && (
                    <span className="px-2 py-1 bg-primary/10 rounded text-primary font-mono text-xs">
                      {record.newValue}
                    </span>
                  )}
                </div>
              )}
              
              {/* Operator */}
              {record.capturedBy && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{record.capturedBy.username}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
