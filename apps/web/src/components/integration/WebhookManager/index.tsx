// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  AlertCircle,
  CheckCircle,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { WebhookDialog } from './WebhookDialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { integrationApi } from '@/lib/api/client';


interface WebhookItem {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  consecutiveFailures: number;
  createdAt: string;
  version?: number;
}

export function WebhookManager() {
  const t = useTranslations('integrationManagement');
  const tCommon = useTranslations('common');

  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editWebhook, setEditWebhook] = useState<WebhookItem | null>(null);
  const [deleteWebhook, setDeleteWebhook] = useState<WebhookItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await integrationApi.listWebhooks();
      if (response.success && response.data) {
        setWebhooks(response.data);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleToggleActive = async (webhook: WebhookItem) => {
    try {
      const response = webhook.isActive
        ? await integrationApi.deactivateWebhook?.(webhook.id)
        : await integrationApi.reactivateWebhook?.(webhook.id);

      if (response?.success) {
        toast.success(webhook.isActive ? t('webhookDeactivated') : t('webhookReactivated'));
        fetchWebhooks();
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteWebhook) return;

    setIsDeleting(true);
    try {
      const response = await integrationApi.deleteWebhook(deleteWebhook.id);
      if (response.success) {
        toast.success(t('webhookDeleted'));
        setDeleteWebhook(null);
        fetchWebhooks();
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredWebhooks = webhooks.filter((webhook) =>
    webhook.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    webhook.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    webhook.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (webhook: WebhookItem) => {
    if (!webhook.isActive) {
      return (
        <Badge variant="secondary">
          <XCircle size={12} className="mr-1" />
          {tCommon('inactive')}
        </Badge>
      );
    }
    if (webhook.consecutiveFailures > 0) {
      return (
        <Badge variant="destructive">
          <AlertCircle size={12} className="mr-1" />
          {t('failing')} ({webhook.consecutiveFailures})
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle size={12} className="mr-1" />
        {tCommon('active')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook size={20} className="text-primary" />
              {t('webhooks')}
            </CardTitle>
            <CardDescription>{t('webhooksDescription')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchWebhooks} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus size={14} className="mr-1" />
              {t('createWebhook')}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder={t('searchWebhooks')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : filteredWebhooks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Webhook className="mx-auto mb-4 opacity-30" size={48} />
            <p>{searchQuery ? t('noWebhooksMatch') : t('noWebhooks')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon('code')}</TableHead>
                <TableHead>{tCommon('name')}</TableHead>
                <TableHead>{t('url')}</TableHead>
                <TableHead>{t('events')}</TableHead>
                <TableHead>{t('lastTriggered')}</TableHead>
                <TableHead>{tCommon('status')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWebhooks.map((webhook) => (
                <TableRow key={webhook.id} className="group">
                  <TableCell>
                    <code className="text-xs font-mono text-primary">{webhook.code}</code>
                  </TableCell>
                  <TableCell>{webhook.nameEn}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                      {webhook.url}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event.split('.')[1]}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {webhook.lastTriggeredAt ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Send size={12} />
                        {new Date(webhook.lastTriggeredAt).toLocaleDateString()}
                        {webhook.lastStatus && (
                          <Badge
                            variant={webhook.lastStatus >= 200 && webhook.lastStatus < 300 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {webhook.lastStatus}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(webhook)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditWebhook(webhook)}>
                          <Settings className="mr-2 h-4 w-4" />
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(webhook)}>
                          {webhook.isActive ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              {tCommon('deactivate')}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {tCommon('activate')}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteWebhook(webhook)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <WebhookDialog
        open={isCreateOpen || !!editWebhook}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditWebhook(null);
          }
        }}
        webhook={editWebhook}
        onSuccess={() => {
          setIsCreateOpen(false);
          setEditWebhook(null);
          fetchWebhooks();
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWebhook} onOpenChange={(open: boolean) => !open && setDeleteWebhook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteWebhookTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteWebhookDescription', { code: deleteWebhook?.code ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
