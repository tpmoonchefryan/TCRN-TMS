// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Building, CheckCircle, Plus, RefreshCw, Search, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CreateTenantDialog } from '@/components/admin/create-tenant-dialog';
import { type AdminTenantRecord,adminTenantsDomainApi } from '@/domains/config-dictionary-settings/api/admin-tenants.api';
import {
  Badge,
  Button,
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

export function AdminTenantsScreen() {
  const router = useRouter();
  const t = useTranslations('adminConsole.tenants');
  const tCommon = useTranslations('common');

  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<AdminTenantRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminTenantsDomainApi.list();
      if (response.success && response.data) {
        setTenants(response.data);
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
    void fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = useMemo(
    () =>
      tenants.filter((tenant) =>
        tenant.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, tenants],
  );

  const viewState = isLoading ? 'loading' : error ? 'error' : filteredTenants.length === 0 ? 'empty' : 'ready';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <TableShell
        title={t('activeTenants')}
        description={t('description')}
        icon={<Building className="h-5 w-5 text-primary" />}
        count={filteredTenants.length}
        actions={(
          <>
            <Button variant="outline" onClick={() => void fetchTenants()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {tCommon('refresh')}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createTenant')}
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
            title: searchQuery ? t('noTenantsMatch') : t('noTenants'),
            description: searchQuery ? t('searchPlaceholder') : t('description'),
          }}
          emptyIcon={<Building className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          action={error ? (
            <Button variant="outline" onClick={() => void fetchTenants()}>
              {tCommon('retry')}
            </Button>
          ) : null}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon('code')}</TableHead>
                  <TableHead>{tCommon('name')}</TableHead>
                  <TableHead>{t('tier')}</TableHead>
                  <TableHead>{tCommon('status')}</TableHead>
                  <TableHead>{tCommon('created')}</TableHead>
                  <TableHead className="text-right">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-mono font-medium text-primary">{tenant.code}</TableCell>
                    <TableCell>{tenant.name}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.tier === 'ac' ? 'default' : 'secondary'}>
                        {tenant.tier.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.isActive ? (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                          <CheckCircle className="h-4 w-4" />
                          {tCommon('active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          {tCommon('inactive')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                      >
                        {tCommon('view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </StateView>
      </TableShell>

      <CreateTenantDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => void fetchTenants()}
      />
    </div>
  );
}
