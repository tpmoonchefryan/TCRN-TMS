// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { format, formatDistanceToNow, Locale } from 'date-fns';
import { enUS, ja, zhCN } from 'date-fns/locale';
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Info, RefreshCw, XCircle } from 'lucide-react';
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

interface TechEventLogEntry {
  id: string;
  occurredAt: string;
  severity: string;
  eventType: string;
  scope: string;
  traceId: string | null;
  source: string | null;
  message: string | null;
  payloadJson: Record<string, unknown> | null;
  errorCode: string | null;
}

interface TechEventLogResponse {
  items: TechEventLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; color: string; bgColor: string }> = {
  debug: { icon: Info, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  info: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  warn: { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  error: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  critical: { icon: XCircle, color: 'text-red-800', bgColor: 'bg-red-200 dark:bg-red-900/50' },
};

// Locale mapping for date-fns
const dateLocales: Record<string, Locale> = {
  en: enUS,
  zh: zhCN,
  ja: ja,
};

export default function SystemEventsPage() {
  // All hooks must be called first, in consistent order
  const t = useTranslations('logs');
  const locale = useLocale();
  const [logs, setLogs] = useState<TechEventLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string>('');
  const [scope, setScope] = useState<string>('');

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

      if (severity) params.append('severity', severity);
      if (scope) params.append('scope', scope);

      const response = await apiClient.get<TechEventLogResponse>(
        `/api/v1/logs/events?${params}`
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
  }, [page, severity, scope]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    fetchLogs();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getSeverityConfig = (sev: string) => {
    return SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={severity || '__all__'} onValueChange={(v) => setSeverity(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('severity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allSeverities')}</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scope || '__all__'} onValueChange={(v) => setScope(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('scope')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allScopes')}</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="pii">PII</SelectItem>
                <SelectItem value="homepage">Homepage</SelectItem>
                <SelectItem value="marshmallow">Marshmallow</SelectItem>
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
              {logs.map((log) => {
                const config = getSeverityConfig(log.severity);
                const Icon = config.icon;

                return (
                  <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${config.bgColor} ${config.color}`}>
                            <Icon className="h-3 w-3" />
                            {log.severity.toUpperCase()}
                          </span>
                          <Badge variant="outline">{log.scope}</Badge>
                          <span className="font-mono text-sm">{log.eventType}</span>
                        </div>
                        {log.message && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {log.message}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          <span title={formatRelativeTime(log.occurredAt)}>
                            {formatPreciseTime(log.occurredAt)}
                          </span>
                          {log.source && <span> • {log.source}</span>}
                          {log.traceId && <span> • trace: {log.traceId.slice(0, 8)}</span>}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground ml-2">
                        {expandedId === log.id ? '▼' : '▶'}
                      </div>
                    </div>

                    {/* Expanded Payload View */}
                    {expandedId === log.id && log.payloadJson && (
                      <div className="mt-4 pt-4 border-t">
                        <JsonViewer data={log.payloadJson} />
                        {log.errorCode && (
                          <div className="mt-2 text-xs text-red-600">
                            Error Code: {log.errorCode}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
