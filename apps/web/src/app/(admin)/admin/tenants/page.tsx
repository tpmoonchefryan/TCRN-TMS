 
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Building, CheckCircle, Loader2, Plus, RefreshCw, Search, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CreateTenantDialog } from '@/components/admin/create-tenant-dialog';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { tenantApi } from '@/lib/api/client';

interface Tenant {
  id: string;
  code: string;
  name: string;
  tier: 'ac' | 'standard';
  isActive: boolean;
  createdAt: string;
  settings?: {
    maxTalents?: number;
    maxCustomersPerTalent?: number;
    features?: string[];
  };
}

export default function TenantsPage() {
  const router = useRouter();
  const t = useTranslations('adminConsole.tenants');
  const tCommon = useTranslations('common');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tenantApi.list();
      if (response.success && response.data) {
        setTenants(response.data);
      } else {
        setError(response.error?.message || tCommon('error'));
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || tCommon('error');
      setError(errorMessage);
      toast.error(tCommon('error'), {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleAddTenant = () => {
    setIsCreateDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchTenants();
    toast.success(t('refreshing'));
  };

  // Filter tenants by search query
  const filteredTenants = tenants.filter(tenant => 
    tenant.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {t('title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
            {tCommon('refresh')}
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleAddTenant}
          >
            <Plus size={16} className="mr-2" />
            {t('createTenant')}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder={t('searchPlaceholder')} 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Building size={20} className="text-purple-600" />
            {t('activeTenants')} ({filteredTenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">
              <Loader2 size={48} className="mx-auto mb-4 text-purple-400 animate-spin" />
              <p>{t('loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <XCircle size={48} className="mx-auto mb-4 text-red-300" />
              <p>{error}</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-4">
                {tCommon('retry')}
              </Button>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Building size={48} className="mx-auto mb-4 text-slate-300" />
              <p>{searchQuery ? t('noTenantsMatch') : t('noTenants')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{tCommon('code')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{tCommon('name')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{t('tier')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{tCommon('status')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">{tCommon('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-purple-600">{tenant.code}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{tenant.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant={tenant.tier === 'ac' ? 'default' : 'secondary'}>
                          {tenant.tier.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {tenant.isActive ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={14} /> {tCommon('active')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400">
                            <XCircle size={14} /> {tCommon('inactive')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-sm">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                        >
                          {tCommon('view')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTenantDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchTenants}
      />
    </div>
  );
}
