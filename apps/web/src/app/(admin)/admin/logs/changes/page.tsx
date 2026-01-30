// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
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

interface ChangeLogEntry {
  id: string;
  occurredAt: string;
  action: string;
  objectType: string;
  objectId: string;
  objectName: string;
  operatorId: string;
  operatorName?: string;
  diff?: Record<string, unknown>;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  deactivate: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  reactivate: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

export default function ChangeLogsPage() {
  const t = useTranslations('logsPage');
  const tCommon = useTranslations('common');

  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [objectType, setObjectType] = useState('all');
  const [action, setAction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await logApi.getChangeLogs({
        objectType: objectType !== 'all' ? objectType : undefined,
        action: action !== 'all' ? action : undefined,
        search: searchQuery || undefined,
        page,
        pageSize: 20,
      });
      if (response.success && response.data) {
        setLogs(response.data.items || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [objectType, action, searchQuery, page, tCommon]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <History size={24} />
            {t('changeLogs')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('changeLogsDescription')}</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
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
                placeholder={t('searchLogs')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={objectType} onValueChange={setObjectType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('objectType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="membership">Membership</SelectItem>
                <SelectItem value="integration_adapter">Adapter</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="system_user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('action')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allActions')}</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="deactivate">Deactivate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentChanges')}</CardTitle>
          <CardDescription>{t('recentChangesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="mx-auto mb-4 opacity-30" size={48} />
              <p>{t('noLogs')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>{t('timestamp')}</TableHead>
                    <TableHead>{t('action')}</TableHead>
                    <TableHead>{t('objectType')}</TableHead>
                    <TableHead>{t('objectName')}</TableHead>
                    <TableHead>{t('operator')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <>
                      <TableRow key={log.id} className="cursor-pointer" onClick={() => toggleExpand(log.id)}>
                        <TableCell>
                          {log.diff ? (
                            expandedRows.has(log.id) ? (
                              <ChevronDown size={16} className="text-muted-foreground" />
                            ) : (
                              <ChevronRight size={16} className="text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.occurredAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.objectType}</TableCell>
                        <TableCell>{log.objectName || log.objectId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <User size={14} className="text-muted-foreground" />
                            {log.operatorName || log.operatorId || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(log.id) && log.diff && (
                        <TableRow key={`${log.id}-diff`}>
                          <TableCell colSpan={6} className="bg-muted/50">
                            <div className="p-4">
                              <h4 className="font-medium mb-2">{t('changes')}</h4>
                              <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto">
                                {JSON.stringify(log.diff, null, 2)}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
