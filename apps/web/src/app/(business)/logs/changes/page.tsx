// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ChangeLogDiff } from '@tcrn/shared';
import { format, formatDistanceToNow, Locale } from 'date-fns';
import { enUS, ja, zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { DiffViewer } from '@/components/logs/DiffViewer';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';

interface ChangeLogEntry {
  id: string;
  occurredAt: string;
  operatorId: string | null;
  operatorName: string | null;
  action: string;
  objectType: string;
  objectId: string;
  objectName: string | null;
  diff: ChangeLogDiff | null;
  ipAddress: string | null;
  requestId: string | null;
}

interface ChangeLogResponse {
  items: ChangeLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  deactivate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  reactivate: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// Locale mapping for date-fns
const dateLocales: Record<string, Locale> = {
  en: enUS,
  zh: zhCN,
  ja: ja,
};

export default function ChangeLogsPage() {
  // All hooks must be called first, in consistent order
  const t = useTranslations('logs');
  const locale = useLocale();
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [objectType, setObjectType] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Derived values and helper functions (after all hooks)
  const dateLocale = dateLocales[locale] || enUS;

  const formatPreciseTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd HH:mm:ss', { locale: dateLocale });
  };

  const formatRelativeTime = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: dateLocale });
  };

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
      });

      if (objectType) params.append('objectType', objectType);
      if (action) params.append('action', action);

      const response = await apiClient.get<ChangeLogResponse>(
        `/api/v1/logs/changes?${params}`
      );

      if (response.success && response.data) {
        setLogs(response.data.items);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      }
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  }, [page, objectType, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    fetchLogs();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={objectType || '__all__'} onValueChange={(v) => setObjectType(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('objectType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allTypes')}</SelectItem>
                <SelectItem value="customer_profile">{t('customer')}</SelectItem>
                <SelectItem value="marshmallow_message">{t('marshmallow')}</SelectItem>
                <SelectItem value="marshmallow_config">{t('marshmallowConfig')}</SelectItem>
                <SelectItem value="talent_homepage">{t('homepage')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={action || '__all__'} onValueChange={(v) => setAction(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('action')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allActions')}</SelectItem>
                <SelectItem value="create">{t('create')}</SelectItem>
                <SelectItem value="update">{t('update')}</SelectItem>
                <SelectItem value="deactivate">{t('deactivate')}</SelectItem>
                <SelectItem value="reactivate">{t('reactivate')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium">
            {total} {t('records')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('noRecords')}
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {log.action.toUpperCase()}
                        </span>
                        <span className="font-medium">{log.objectType}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {log.objectName || log.objectId.slice(0, 8)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('by')} {log.operatorName || t('system')} •{' '}
                        <span title={formatRelativeTime(log.occurredAt)}>
                          {formatPreciseTime(log.occurredAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {expandedId === log.id ? '▼' : '▶'}
                    </div>
                  </div>

                  {/* Expanded Diff View */}
                  {expandedId === log.id && log.diff && (
                    <div className="mt-4 pt-4 border-t">
                      <DiffViewer diff={log.diff} />
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                        {log.requestId && <span>Request: {log.requestId}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t('pageOf', { page, totalPages })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {t('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
