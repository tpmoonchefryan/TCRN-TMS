// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Globe, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CreatePlatformDialog } from '@/components/admin/create-platform-dialog';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { integrationApi } from '@/lib/api/client';

interface Platform {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export default function PlatformsPage() {
  const t = useTranslations('adminConsole.platforms');
  const tCommon = useTranslations('common');
  const te = useTranslations('errors');

  // Helper to get translated error message from API error
  const getErrorMessage = useCallback((error: unknown): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCode = (error as any)?.code;
    if (errorCode && typeof errorCode === 'string') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const translated = te(errorCode as any);
        if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
          return translated;
        }
      } catch {
        // Fall through
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (error as any)?.message || te('generic');
  }, [te]);

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchPlatforms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await integrationApi.listPlatforms();
      if (response.success && response.data) {
        setPlatforms(response.data);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const filteredPlatforms = platforms.filter(platform =>
    platform.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    platform.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePlatform = () => {
    setIsCreateDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchPlatforms();
    toast.success('Refreshing platforms...');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <Globe size={24} />
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
            {tCommon('retry')}
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleCreatePlatform}
          >
            <Plus size={16} className="mr-2" />
            {t('createPlatform')}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder={tCommon('search')}
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Social Platform Registry
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Platforms defined here can be used when creating API Consumers for integrations.
                Common platforms include YouTube, Twitter/X, Twitch, Bilibili, etc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Globe size={20} className="text-purple-600" />
            Platforms ({filteredPlatforms.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">
              <Loader2 size={48} className="mx-auto mb-4 text-purple-400 animate-spin" />
              <p>Loading platforms...</p>
            </div>
          ) : filteredPlatforms.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Globe size={48} className="mx-auto mb-4 text-slate-300" />
              <p>{searchQuery ? 'No platforms match your search.' : 'No platforms defined.'}</p>
              <Button 
                className="mt-4 bg-purple-600 hover:bg-purple-700"
                onClick={handleCreatePlatform}
              >
                <Plus size={16} className="mr-2" />
                {t('createPlatform')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlatforms.map((platform) => (
                <Card key={platform.id} className="border hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {platform.iconUrl ? (
                        <img 
                          src={platform.iconUrl} 
                          alt={platform.nameEn} 
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                          <Globe size={20} className="text-purple-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800">{platform.nameEn}</h3>
                          <Badge variant={platform.isActive ? 'default' : 'secondary'}>
                            {platform.isActive ? tCommon('active') : tCommon('inactive')}
                          </Badge>
                        </div>
                        <p className="text-sm font-mono text-purple-600">{platform.code}</p>
                        {platform.nameZh && (
                          <p className="text-xs text-slate-500 mt-1">{platform.nameZh}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePlatformDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchPlatforms}
      />
    </div>
  );
}
