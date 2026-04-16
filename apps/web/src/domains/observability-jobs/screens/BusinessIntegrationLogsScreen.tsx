// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { JsonViewer } from '@/components/logs/JsonViewer';
import {
  businessIntegrationLogsApi,
  formatIntegrationLogPreciseTime,
  formatIntegrationLogRelativeTime,
  getIntegrationLogStatusColor,
  type IntegrationLogRecord,
} from '@/domains/observability-jobs/api/integration-logs.api';
import { getQueryNumber, getQueryString, replaceQueryState } from '@/platform/routing/query-state';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/platform/ui';

export function BusinessIntegrationLogsScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('logs');
  const locale = useLocale();
  const [logs, setLogs] = useState<IntegrationLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const page = getQueryNumber(searchParams, 'page', 1);
  const expandedId = getQueryString(searchParams, 'expanded') || null;
  const direction = getQueryString(searchParams, 'direction');
  const statusFilter = getQueryString(searchParams, 'status');

  const replaceLogsQuery = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      replaceQueryState({
        router,
        pathname,
        searchParams,
        updates,
      });
    },
    [pathname, router, searchParams],
  );

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await businessIntegrationLogsApi.list({
        direction,
        statusFilter,
        page,
        pageSize: 20,
      });
      setLogs(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [direction, page, statusFilter]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const toggleExpand = (id: string) => {
    replaceLogsQuery({
      expanded: expandedId === id ? null : id,
    });
  };

  const getStatusFilterLabel = (status: '2xx' | '3xx' | '4xx' | '5xx') => {
    switch (status) {
      case '2xx':
        return t('statusSuccess');
      case '3xx':
        return t('statusRedirect');
      case '4xx':
        return t('statusClientError');
      case '5xx':
        return t('statusServerError');
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select
              value={direction || '__all__'}
              onValueChange={(value) =>
                replaceLogsQuery({
                  direction: value === '__all__' ? null : value,
                  page: null,
                  expanded: null,
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('direction')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allDirections')}</SelectItem>
                <SelectItem value="inbound">{t('inbound')}</SelectItem>
                <SelectItem value="outbound">{t('outbound')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter || '__all__'}
              onValueChange={(value) =>
                replaceLogsQuery({
                  status: value === '__all__' ? null : value,
                  page: null,
                  expanded: null,
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allStatuses')}</SelectItem>
                <SelectItem value="2xx">{getStatusFilterLabel('2xx')}</SelectItem>
                <SelectItem value="3xx">{getStatusFilterLabel('3xx')}</SelectItem>
                <SelectItem value="4xx">{getStatusFilterLabel('4xx')}</SelectItem>
                <SelectItem value="5xx">{getStatusFilterLabel('5xx')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => void fetchLogs()}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium">
            {total} {t('records')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">{t('noRecords')}</div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="p-4 transition-colors hover:bg-muted/50">
                  <div
                    className="flex cursor-pointer items-start justify-between"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                            log.direction === 'inbound'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}
                        >
                          {log.direction === 'inbound' ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {log.direction === 'inbound' ? t('inbound') : t('outbound')}
                        </span>
                        {log.responseStatus && (
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${getIntegrationLogStatusColor(
                              log.responseStatus,
                            )}`}
                          >
                            {log.responseStatus}
                          </span>
                        )}
                        {log.method && <Badge variant="outline">{log.method}</Badge>}
                        {log.latencyMs && (
                          <span className="text-muted-foreground text-xs">{log.latencyMs}ms</span>
                        )}
                      </div>
                      <div className="text-muted-foreground truncate font-mono text-sm">
                        {log.endpoint}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        <span title={formatIntegrationLogRelativeTime(locale, log.occurredAt)}>
                          {formatIntegrationLogPreciseTime(locale, log.occurredAt)}
                        </span>
                        {log.consumerCode && <span> • {log.consumerCode}</span>}
                        {log.traceId && <span> • {t('trace')}: {log.traceId.slice(0, 8)}</span>}
                      </div>
                      {log.errorMessage && (
                        <div className="mt-1 text-xs text-red-600">{log.errorMessage}</div>
                      )}
                    </div>
                    <div className="text-muted-foreground ml-2 text-sm">
                      {expandedId === log.id ? '▼' : '▶'}
                    </div>
                  </div>

                  {expandedId === log.id && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {log.requestHeaders && (
                        <div>
                          <div className="text-muted-foreground mb-1 text-xs font-medium">
                            {t('requestHeaders')}
                          </div>
                          <JsonViewer data={log.requestHeaders} />
                        </div>
                      )}
                      {log.requestBody !== null && log.requestBody !== undefined && (
                        <div>
                          <div className="text-muted-foreground mb-1 text-xs font-medium">
                            {t('requestBody')}
                          </div>
                          <JsonViewer data={log.requestBody} />
                        </div>
                      )}
                      {log.responseBody !== null && log.responseBody !== undefined && (
                        <div>
                          <div className="text-muted-foreground mb-1 text-xs font-medium">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {t('pageOf', { page, totalPages })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                replaceLogsQuery({
                  page: page - 1 <= 1 ? null : page - 1,
                  expanded: null,
                })
              }
              disabled={page === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                replaceLogsQuery({
                  page: Math.min(totalPages, page + 1),
                  expanded: null,
                })
              }
              disabled={page === totalPages}
            >
              {t('next')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
