// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { CheckCircle, Key, Loader2, Plus, RefreshCw, Search, ShieldAlert, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CreateConsumerDialog } from '@/components/admin/create-consumer-dialog';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { integrationApi } from '@/lib/api/client';

interface Adapter {
  id: string;
  code: string;
  nameEn: string;
  nameJa?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  apiKeyPrefix?: string;
}

export default function ConsumersPage() {
  const t = useTranslations('adminConsole.consumers');
  const tCommon = useTranslations('common');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchAdapters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await integrationApi.listAdapters();
      if (response.success && response.data) {
        setAdapters(response.data);
      } else {
        setError(response.error?.message || tCommon('error'));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : tCommon('error');
      setError(errorMessage);
      toast.error(tCommon('error'), {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    fetchAdapters();
  }, [fetchAdapters]);

  const handleAddConsumer = () => {
    setIsCreateDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchAdapters();
    toast.success(t('refreshing'));
  };

  // Filter adapters by search query
  const filteredAdapters = adapters.filter(adapter => 
    adapter.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    adapter.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
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
            onClick={handleAddConsumer}
          >
            <Plus size={16} className="mr-2" />
            {t('createConsumer')}
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
            <ShieldAlert size={20} className="text-purple-600" />
            {t('title')} ({filteredAdapters.length})
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
          ) : filteredAdapters.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShieldAlert size={48} className="mx-auto mb-4 text-slate-300" />
              <p>{searchQuery ? t('noConsumersMatch') : t('noConsumers')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{tCommon('code')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{tCommon('name')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{t('apiKey')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{tCommon('status')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">{tCommon('created')}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">{tCommon('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdapters.map((adapter) => (
                    <tr key={adapter.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-purple-600">{adapter.code}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{adapter.nameEn}</td>
                      <td className="py-3 px-4">
                        {adapter.apiKeyPrefix ? (
                          <span className="flex items-center gap-1 text-slate-500 font-mono text-sm">
                            <Key size={14} /> {adapter.apiKeyPrefix}...
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {adapter.isActive ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle size={12} className="mr-1" /> {tCommon('active')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle size={12} className="mr-1" /> {tCommon('inactive')}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-sm">
                        {new Date(adapter.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toast.info(`View details: ${adapter.code}`)}
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

      <CreateConsumerDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchAdapters}
      />
    </div>
  );
}
