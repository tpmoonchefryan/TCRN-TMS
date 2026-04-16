// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Globe, Plus, RefreshCw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PlatformEditorDialog } from '@/components/admin/platform-editor-dialog';
import {
  type AdminPlatformRecord,
  adminPlatformsDomainApi,
} from '@/domains/integration-communication/api/admin-platforms.api';
import { getTranslatedApiErrorMessage } from '@/lib/api/error-utils';
import { integrationApi } from '@/lib/api/modules/integration';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  StateView,
  TableShell,
} from '@/platform/ui';

export function AdminPlatformsScreen() {
  const t = useTranslations('adminConsole.platforms');
  const tCommon = useTranslations('common');
  const te = useTranslations('errors');

  const [platforms, setPlatforms] = useState<AdminPlatformRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPlatformDialogOpen, setIsPlatformDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<AdminPlatformRecord | null>(null);
  const [platformActionId, setPlatformActionId] = useState<string | null>(null);

  const getErrorMessage = useCallback((error: unknown): string => {
    return getTranslatedApiErrorMessage(error, te, te('generic'));
  }, [te]);

  const fetchPlatforms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminPlatformsDomainApi.listPlatforms();
      if (response.success && response.data) {
        setPlatforms(response.data);
        return;
      }

      setError(response.error?.message || tCommon('error'));
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage, tCommon]);

  useEffect(() => {
    void fetchPlatforms();
  }, [fetchPlatforms]);

  const filteredPlatforms = useMemo(
    () =>
      platforms.filter((platform) =>
        platform.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        platform.nameEn.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [platforms, searchQuery],
  );

  const handleTogglePlatformStatus = useCallback(async (platform: AdminPlatformRecord) => {
    setPlatformActionId(platform.id);

    try {
      const response = platform.isActive
        ? await integrationApi.deactivatePlatform(platform.id, platform.version)
        : await integrationApi.reactivatePlatform(platform.id, platform.version);

      if (!response.success) {
        throw new Error(response.error?.message || tCommon('error'));
      }

      toast.success(platform.isActive ? t('platformDeactivated') : t('platformReactivated'));
      await fetchPlatforms();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setPlatformActionId(null);
    }
  }, [fetchPlatforms, getErrorMessage, t, tCommon]);

  const viewState = isLoading ? 'loading' : error ? 'error' : filteredPlatforms.length === 0 ? 'empty' : 'ready';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Globe className="h-6 w-6" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <TableShell
        title={t('title')}
        description={t('description')}
        icon={<Globe className="h-5 w-5 text-primary" />}
        count={filteredPlatforms.length}
        actions={(
          <>
            <Button variant="outline" onClick={() => void fetchPlatforms()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {tCommon('refresh')}
            </Button>
            <Button
              onClick={() => {
                setEditingPlatform(null);
                setIsPlatformDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('createPlatform')}
            </Button>
          </>
        )}
        filters={(
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tCommon('search')}
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
            title: t('loadingPlatforms'),
            description: t('description'),
          }}
          error={{
            title: tCommon('error'),
            description: error || tCommon('error'),
          }}
          empty={{
            title: searchQuery ? t('noPlatformsMatch') : t('noPlatformsDefined'),
            description: t('description'),
          }}
          emptyIcon={<Globe className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          action={error ? (
            <Button variant="outline" onClick={() => void fetchPlatforms()}>
              {tCommon('retry')}
            </Button>
          ) : searchQuery ? null : (
            <Button
              onClick={() => {
                setEditingPlatform(null);
                setIsPlatformDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('createPlatform')}
            </Button>
          )}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlatforms.map((platform) => (
              <Card key={platform.id} className="border-border/70">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {platform.iconUrl ? (
                      <img
                        src={platform.iconUrl}
                        alt={platform.displayName || platform.nameEn}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-pink-100">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-foreground">
                          {platform.displayName || platform.nameEn}
                        </h3>
                        <Badge variant={platform.isActive ? 'default' : 'secondary'}>
                          {platform.isActive ? tCommon('active') : tCommon('inactive')}
                        </Badge>
                      </div>
                      <p className="font-mono text-sm text-primary">{platform.code}</p>
                      {platform.nameZh ? (
                        <p className="text-xs text-muted-foreground">{platform.nameZh}</p>
                      ) : null}
                      {platform.baseUrl ? (
                        <p className="truncate text-xs text-muted-foreground">{platform.baseUrl}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPlatform(platform);
                        setIsPlatformDialogOpen(true);
                      }}
                    >
                      {tCommon('edit')}
                    </Button>
                    <Button
                      variant={platform.isActive ? 'outline' : 'default'}
                      size="sm"
                      disabled={platformActionId === platform.id}
                      onClick={() => void handleTogglePlatformStatus(platform)}
                    >
                      {platform.isActive ? tCommon('deactivate') : tCommon('activate')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </StateView>
      </TableShell>

      <PlatformEditorDialog
        open={isPlatformDialogOpen}
        onOpenChange={setIsPlatformDialogOpen}
        platform={editingPlatform}
        onSuccess={() => void fetchPlatforms()}
      />
    </div>
  );
}
