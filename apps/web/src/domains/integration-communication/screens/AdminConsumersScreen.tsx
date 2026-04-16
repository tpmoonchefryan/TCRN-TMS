// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { CheckCircle, Copy, Key, MoreHorizontal, Plus, RefreshCw, Search, ShieldAlert, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CreateConsumerDialog } from '@/components/admin/create-consumer-dialog';
import {
  type AdminConsumerRecord,
  adminConsumersDomainApi,
} from '@/domains/integration-communication/api/admin-consumers.api';
import {
  type ConsumerKeyMutationResponse,
  integrationApi,
} from '@/lib/api/modules/integration';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  StateView,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableShell,
} from '@/platform/ui';

export function AdminConsumersScreen() {
  const t = useTranslations('adminConsole.consumers');
  const tCommon = useTranslations('common');

  const [searchQuery, setSearchQuery] = useState('');
  const [consumers, setConsumers] = useState<AdminConsumerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConsumer, setEditingConsumer] = useState<AdminConsumerRecord | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{ code: string; apiKey: string } | null>(null);
  const [consumerActionId, setConsumerActionId] = useState<string | null>(null);

  const fetchConsumers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminConsumersDomainApi.listConsumers();
      if (response.success && response.data) {
        setConsumers(response.data);
        return;
      }

      setError(response.error?.message || tCommon('error'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tCommon('error');
      setError(message);
      toast.error(tCommon('error'), {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    void fetchConsumers();
  }, [fetchConsumers]);

  const filteredConsumers = useMemo(
    () =>
      consumers.filter((consumer) =>
        consumer.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        consumer.nameEn.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [consumers, searchQuery],
  );

  const handleKeyAction = useCallback(
    async (
      consumer: AdminConsumerRecord,
      action: 'generate' | 'rotate' | 'revoke',
    ) => {
      setConsumerActionId(consumer.id);

      try {
        const response = await (
          action === 'generate'
            ? integrationApi.generateConsumerKey(consumer.id)
            : action === 'rotate'
              ? integrationApi.rotateConsumerKey(consumer.id)
              : integrationApi.revokeConsumerKey(consumer.id)
        );

        if (!response.success) {
          throw new Error(response.error?.message || tCommon('error'));
        }

        const data = response.data as ConsumerKeyMutationResponse | undefined;
        if (data?.apiKey) {
          setGeneratedKey({
            code: consumer.code,
            apiKey: data.apiKey,
          });
        }

        toast.success(
          action === 'generate'
            ? t('keyGenerated')
            : action === 'rotate'
              ? t('keyRotated')
              : t('keyRevoked'),
        );
        await fetchConsumers();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : tCommon('error');
        toast.error(tCommon('error'), {
          description: message,
        });
      } finally {
        setConsumerActionId(null);
      }
    },
    [fetchConsumers, t, tCommon],
  );

  const handleCopyGeneratedKey = useCallback(async () => {
    if (!generatedKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedKey.apiKey);
      toast.success(t('keyCopied'));
    } catch {
      toast.error(tCommon('error'));
    }
  }, [generatedKey, t, tCommon]);

  const viewState = isLoading ? 'loading' : error ? 'error' : filteredConsumers.length === 0 ? 'empty' : 'ready';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <TableShell
        title={t('title')}
        description={t('description')}
        icon={<ShieldAlert className="h-5 w-5 text-primary" />}
        count={filteredConsumers.length}
        actions={(
          <>
            <Button variant="outline" onClick={() => void fetchConsumers()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {tCommon('refresh')}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createConsumer')}
            </Button>
          </>
        )}
        filters={(
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        )}
      >
        <StateView
          state={viewState}
          loading={{
            title: t('loading'),
            description: t('description'),
          }}
          error={{
            title: tCommon('error'),
            description: error || tCommon('error'),
          }}
          empty={{
            title: searchQuery ? t('noConsumersMatch') : t('noConsumers'),
            description: t('description'),
          }}
          emptyIcon={<ShieldAlert className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          action={error ? (
            <Button variant="outline" onClick={() => void fetchConsumers()}>
              {tCommon('retry')}
            </Button>
          ) : null}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon('code')}</TableHead>
                <TableHead>{tCommon('name')}</TableHead>
                <TableHead>{t('category')}</TableHead>
                <TableHead>{t('apiKey')}</TableHead>
                <TableHead>{tCommon('status')}</TableHead>
                <TableHead>{tCommon('created')}</TableHead>
                <TableHead className="text-right">{tCommon('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConsumers.map((consumer) => (
                <TableRow key={consumer.id}>
                  <TableCell className="font-mono font-medium text-primary">{consumer.code}</TableCell>
                  <TableCell>{consumer.nameEn}</TableCell>
                  <TableCell className="capitalize">{consumer.consumerCategory}</TableCell>
                  <TableCell>
                    {consumer.apiKeyPrefix ? (
                      <span className="inline-flex items-center gap-1 font-mono text-sm text-muted-foreground">
                        <Key className="h-4 w-4" />
                        {consumer.apiKeyPrefix}...
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('noApiKey')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {consumer.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {tCommon('active')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="mr-1 h-3 w-3" />
                        {tCommon('inactive')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {consumer.createdAt ? new Date(consumer.createdAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={tCommon('openMenu')}
                          disabled={consumerActionId === consumer.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingConsumer(consumer)}>
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        {consumer.apiKeyPrefix ? (
                          <>
                            <DropdownMenuItem onClick={() => void handleKeyAction(consumer, 'rotate')}>
                              {t('rotateKey')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void handleKeyAction(consumer, 'revoke')}
                              className="text-destructive"
                            >
                              {t('revokeKey')}
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem onClick={() => void handleKeyAction(consumer, 'generate')}>
                            {t('generateKey')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StateView>
      </TableShell>

      <CreateConsumerDialog
        open={isCreateDialogOpen || !!editingConsumer}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingConsumer(null);
          }
        }}
        consumer={editingConsumer}
        onSuccess={() => void fetchConsumers()}
      />

      <Dialog open={!!generatedKey} onOpenChange={(open) => !open && setGeneratedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('generatedKeyTitle')}</DialogTitle>
            <DialogDescription>
              {t('generatedKeyDescription', { code: generatedKey?.code || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 font-mono text-sm break-all">
            {generatedKey?.apiKey}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGeneratedKey(null)}>
              {tCommon('close')}
            </Button>
            <Button onClick={() => void handleCopyGeneratedKey()}>
              <Copy className="mr-2 h-4 w-4" />
              {t('copyKey')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
