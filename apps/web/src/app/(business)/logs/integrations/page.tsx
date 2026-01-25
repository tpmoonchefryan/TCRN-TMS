// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { format, formatDistanceToNow, Locale } from 'date-fns';
import { enUS, ja, zhCN } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { JsonViewer } from '@/components/logs/JsonViewer';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';

interface IntegrationLogEntry {
  id: string;
  occurredAt: string;
  consumerId: string | null;
  consumerCode: string | null;
  direction: 'inbound' | 'outbound';
  endpoint: string;
  method: string | null;
  requestHeaders: Record<string, string> | null;
  requestBody: unknown | null;
  responseStatus: number | null;
  responseBody: unknown | null;
  latencyMs: number | null;
  errorMessage: string | null;
  traceId: string | null;
}

interface IntegrationLogResponse {
  items: IntegrationLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  '2xx': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  '3xx': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  '4xx': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  '5xx': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function getStatusColor(status: number | null): string {
  if (!status) return 'bg-gray-100 text-gray-800';
  if (status >= 200 && status < 300) return STATUS_COLORS['2xx'];
  if (status >= 300 && status < 400) return STATUS_COLORS['3xx'];
  if (status >= 400 && status < 500) return STATUS_COLORS['4xx'];
  if (status >= 500) return STATUS_COLORS['5xx'];
  return 'bg-gray-100 text-gray-800';
}

// Locale mapping for date-fns
const dateLocales: Record<string, Locale> = {
  en: enUS,
  zh: zhCN,
  ja: ja,
};

export default function IntegrationLogsPage() {
  // All hooks must be called first, in consistent order
  const t = useTranslations('logs');
  const locale = useLocale();
  const [logs, setLogs] = useState<IntegrationLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [direction, setDirection] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

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

      if (direction) params.append('direction', direction);
      if (statusFilter) params.append('statusGroup', statusFilter);

      const response = await apiClient.get<IntegrationLogResponse>(
        `/api/v1/logs/integrations?${params}`
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
  }, [page, direction, statusFilter]);

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
            <Select value={direction || '__all__'} onValueChange={(v) => setDirection(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('direction')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allDirections')}</SelectItem>
                <SelectItem value="inbound">{t('inbound')}</SelectItem>
                <SelectItem value="outbound">{t('outbound')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allStatuses')}</SelectItem>
                <SelectItem value="2xx">2xx Success</SelectItem>
                <SelectItem value="3xx">3xx Redirect</SelectItem>
                <SelectItem value="4xx">4xx Client Error</SelectItem>
                <SelectItem value="5xx">5xx Server Error</SelectItem>
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
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${
                          log.direction === 'inbound' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {log.direction === 'inbound' ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {log.direction.toUpperCase()}
                        </span>
                        {log.responseStatus && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(log.responseStatus)}`}>
                            {log.responseStatus}
                          </span>
                        )}
                        {log.method && (
                          <Badge variant="outline">{log.method}</Badge>
                        )}
                        {log.latencyMs && (
                          <span className="text-xs text-muted-foreground">
                            {log.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-mono text-muted-foreground truncate">
                        {log.endpoint}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span title={formatRelativeTime(log.occurredAt)}>
                          {formatPreciseTime(log.occurredAt)}
                        </span>
                        {log.consumerCode && <span> • {log.consumerCode}</span>}
                        {log.traceId && <span> • trace: {log.traceId.slice(0, 8)}</span>}
                      </div>
                      {log.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">
                          {log.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground ml-2">
                      {expandedId === log.id ? '▼' : '▶'}
                    </div>
                  </div>

                  {/* Expanded Request/Response View */}
                  {expandedId === log.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {log.requestHeaders && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {t('requestHeaders')}
                          </div>
                          <JsonViewer data={log.requestHeaders} />
                        </div>
                      )}
                      {log.requestBody !== null && log.requestBody !== undefined && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {t('requestBody')}
                          </div>
                          <JsonViewer data={log.requestBody} />
                        </div>
                      )}
                      {log.responseBody !== null && log.responseBody !== undefined && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {t('responseBody')}
                          </div>
                          <JsonViewer data={log.responseBody} />
                        </div>
                      )}
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
