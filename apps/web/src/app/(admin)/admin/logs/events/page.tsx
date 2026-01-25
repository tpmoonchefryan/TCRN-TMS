// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { logApi } from '@/lib/api/client';

interface TechEventEntry {
  id: string;
  occurredAt: string;
  eventType: string;
  scope: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  payload?: Record<string, unknown>;
  traceId?: string;
}

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; className: string }> = {
  info: {
    icon: <Info size={14} />,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  warn: {
    icon: <AlertTriangle size={14} />,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  error: {
    icon: <AlertCircle size={14} />,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  critical: {
    icon: <Shield size={14} />,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

export default function SystemEventsPage() {
  const t = useTranslations('logsPage');
  const tCommon = useTranslations('common');

  const [events, setEvents] = useState<TechEventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [scope, setScope] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await logApi.getTechEvents({
        scope: scope !== 'all' ? scope : undefined,
        severity: severity !== 'all' ? severity : undefined,
        search: searchQuery || undefined,
        page,
        pageSize: 20,
      });
      if (response.success && response.data) {
        setEvents(response.data.items || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [scope, severity, searchQuery, page, tCommon]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <Activity size={24} />
            {t('systemEvents')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('systemEventsDescription')}</p>
        </div>
        <Button variant="outline" onClick={fetchEvents} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
          {tCommon('refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder={t('searchEvents')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('scope')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allScopes')}</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="job">Job</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('severity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allSeverities')}</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentEvents')}</CardTitle>
          <CardDescription>{t('recentEventsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="mx-auto mb-4 opacity-30" size={48} />
              <p>{t('noEvents')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('timestamp')}</TableHead>
                    <TableHead>{t('severity')}</TableHead>
                    <TableHead>{t('eventType')}</TableHead>
                    <TableHead>{t('scope')}</TableHead>
                    <TableHead>{t('traceId')}</TableHead>
                    <TableHead>{t('details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const config = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.info;
                    return (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(event.occurredAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={config.className}>
                            {config.icon}
                            <span className="ml-1">{event.severity}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{event.eventType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.scope}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {event.traceId ? event.traceId.slice(0, 8) + '...' : '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {event.payload ? JSON.stringify(event.payload).slice(0, 50) + '...' : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('page')} {page} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {tCommon('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {tCommon('next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
