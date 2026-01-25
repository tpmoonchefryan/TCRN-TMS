// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle,
  GitBranch,
  Key,
  Loader2,
  MoreHorizontal,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Settings,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

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

import { AdapterDialog } from './AdapterDialog';
import { AdapterConfigDialog } from './AdapterConfigDialog';

interface Adapter {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  ownerType: string;
  ownerId: string | null;
  platformId: string;
  platform: {
    code: string;
    displayName: string;
    iconUrl?: string;
  };
  adapterType: 'oauth' | 'api_key' | 'webhook';
  inherit: boolean;
  isActive: boolean;
  isInherited?: boolean;
  configCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface AdapterManagerProps {
  ownerType?: 'tenant' | 'subsidiary' | 'talent';
  ownerId?: string;
}

export function AdapterManager({ ownerType = 'tenant', ownerId }: AdapterManagerProps) {
  const t = useTranslations('integrationManagement');
  const tCommon = useTranslations('common');

  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAdapter, setEditAdapter] = useState<Adapter | null>(null);
  const [configAdapter, setConfigAdapter] = useState<Adapter | null>(null);

  const fetchAdapters = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await integrationApi.listAdapters();
      if (response.success && response.data) {
        setAdapters(response.data);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    fetchAdapters();
  }, [fetchAdapters]);

  const handleDeactivate = async (adapter: Adapter) => {
    try {
      const response = adapter.isActive
        ? await integrationApi.deactivateAdapter(adapter.id)
        : await integrationApi.reactivateAdapter(adapter.id);
      
      if (response.success) {
        toast.success(adapter.isActive ? t('adapterDeactivated') : t('adapterReactivated'));
        fetchAdapters();
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    }
  };

  const filteredAdapters = adapters.filter((adapter) =>
    adapter.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    adapter.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    adapter.platform.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAdapterTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      oauth: 'default',
      api_key: 'secondary',
      webhook: 'outline',
    };
    return (
      <Badge variant={variants[type] || 'secondary'} className="capitalize">
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plug size={20} className="text-primary" />
              {t('adapters')}
            </CardTitle>
            <CardDescription>{t('adaptersDescription')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAdapters} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus size={14} className="mr-1" />
              {t('createAdapter')}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder={t('searchAdapters')}
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
        ) : filteredAdapters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Plug className="mx-auto mb-4 opacity-30" size={48} />
            <p>{searchQuery ? t('noAdaptersMatch') : t('noAdapters')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('platform')}</TableHead>
                <TableHead>{tCommon('code')}</TableHead>
                <TableHead>{tCommon('name')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('configs')}</TableHead>
                <TableHead>{tCommon('status')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdapters.map((adapter) => (
                <TableRow key={adapter.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {adapter.platform.iconUrl ? (
                        <img
                          src={adapter.platform.iconUrl}
                          alt={adapter.platform.displayName}
                          className="w-5 h-5"
                        />
                      ) : (
                        <Plug size={16} className="text-muted-foreground" />
                      )}
                      <span>{adapter.platform.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-primary">{adapter.code}</code>
                      {adapter.isInherited && (
                        <span title={t('inherited')}>
                          <GitBranch size={12} className="text-muted-foreground" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{adapter.nameEn}</TableCell>
                  <TableCell>{getAdapterTypeBadge(adapter.adapterType)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setConfigAdapter(adapter)}
                    >
                      <Key size={12} />
                      {adapter.configCount} {t('configItems')}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {adapter.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle size={12} className="mr-1" />
                        {tCommon('active')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle size={12} className="mr-1" />
                        {tCommon('inactive')}
                      </Badge>
                    )}
                  </TableCell>
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
                        <DropdownMenuItem onClick={() => setEditAdapter(adapter)}>
                          <Settings className="mr-2 h-4 w-4" />
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setConfigAdapter(adapter)}>
                          <Key className="mr-2 h-4 w-4" />
                          {t('manageConfigs')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeactivate(adapter)}
                          className={adapter.isActive ? 'text-destructive' : 'text-green-600'}
                        >
                          {adapter.isActive ? (
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
      <AdapterDialog
        open={isCreateOpen || !!editAdapter}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditAdapter(null);
          }
        }}
        adapter={editAdapter}
        ownerType={ownerType}
        ownerId={ownerId}
        onSuccess={() => {
          setIsCreateOpen(false);
          setEditAdapter(null);
          fetchAdapters();
        }}
      />

      {/* Config Dialog */}
      <AdapterConfigDialog
        open={!!configAdapter}
        onOpenChange={(open) => {
          if (!open) setConfigAdapter(null);
        }}
        adapter={configAdapter}
        onSuccess={fetchAdapters}
      />
    </Card>
  );
}
