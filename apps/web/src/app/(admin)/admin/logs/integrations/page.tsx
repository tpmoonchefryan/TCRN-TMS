// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Loader2,
  Network,
  RefreshCw,
  Search,
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

interface IntegrationLogEntry {
  id: string;
  occurredAt: string;
  consumerId?: string;
  consumerCode?: string;
  direction: 'inbound' | 'outbound';
  endpoint: string;
  method: string;
  responseStatus?: number;
  latencyMs?: number;
  errorMessage?: string;
  traceId?: string;
}

export default function IntegrationLogsPage() {
  const t = useTranslations('logsPage');
  const tCommon = useTranslations('common');

  const [logs, setLogs] = useState<IntegrationLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [direction, setDirection] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stats
  const [stats, setStats] = useState({
    totalRequests: 0,
    avgLatencyMs: 0,
    errorRate: 0,
  });

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await logApi.getIntegrationLogs({
        direction: direction !== 'all' ? direction : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        endpoint: searchQuery || undefined,
        page,
        pageSize: 20,
      });
      if (response.success && response.data) {
        setLogs(response.data.items || []);
        setTotalPages(response.data.totalPages || 1);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [direction, statusFilter, searchQuery, page, tCommon]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getStatusBadge = (status?: number) => {
    if (!status) return <Badge variant="secondary">-</Badge>;
    
    if (status >= 200 && status < 300) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{status}</Badge>;
    }
    if (status >= 400 && status < 500) {
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{status}</Badge>;
    }
    if (status >= 500) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{status}</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <Network size={24} />
            {t('integrationLogs')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('integrationLogsDescription')}</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
          {tCommon('refresh')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">{t('totalRequests')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock size={20} className="text-blue-500" />
              {stats.avgLatencyMs}ms
            </div>
            <p className="text-sm text-muted-foreground">{t('avgLatency')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${stats.errorRate > 0.05 ? 'text-red-500' : 'text-green-500'}`}>
              {(stats.errorRate * 100).toFixed(2)}%
            </div>
            <p className="text-sm text-muted-foreground">{t('errorRate')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder={t('searchEndpoint')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('direction')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allDirections')}</SelectItem>
                <SelectItem value="inbound">{t('inbound')}</SelectItem>
                <SelectItem value="outbound">{t('outbound')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('statusCode')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatus')}</SelectItem>
                <SelectItem value="2xx">{t('success')} (2xx)</SelectItem>
                <SelectItem value="4xx">{t('clientError')} (4xx)</SelectItem>
                <SelectItem value="5xx">{t('serverError')} (5xx)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentRequests')}</CardTitle>
          <CardDescription>{t('recentRequestsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Network className="mx-auto mb-4 opacity-30" size={48} />
              <p>{t('noIntegrationLogs')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('timestamp')}</TableHead>
                    <TableHead>{t('direction')}</TableHead>
                    <TableHead>{t('method')}</TableHead>
                    <TableHead>{t('endpoint')}</TableHead>
                    <TableHead>{t('consumer')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('latency')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.occurredAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.direction === 'inbound' ? (
                          <Badge variant="outline" className="gap-1">
                            <ArrowDownLeft size={12} />
                            {t('inbound')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <ArrowUpRight size={12} />
                            {t('outbound')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {log.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">
                        {log.endpoint}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.consumerCode || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.responseStatus)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.latencyMs ? `${log.latencyMs}ms` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
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
