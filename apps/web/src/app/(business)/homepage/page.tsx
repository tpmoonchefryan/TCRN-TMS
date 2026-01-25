'use client';

import { Edit, ExternalLink, Eye, Globe, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SettingsDialog } from '@/components/homepage/editor/SettingsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { homepageApi } from '@/lib/api/client';
import { useTalentStore } from '@/stores/talent-store';

// Homepage status interface
interface HomepageStatus {
  isPublished: boolean;
  lastPublishedAt?: string;
  publishedAt?: string;
  pageViews?: number;
  customDomain?: string | null;
  hasDraftChanges?: boolean;
  draftUpdatedAt?: string;
  homepagePath?: string | null;
}

export default function HomepagePage() {
  const { currentTalent } = useTalentStore();
  const t = useTranslations('homepageAdmin');
  const te = useTranslations('errors');
  const router = useRouter();
  const [homepageStatus, setHomepageStatus] = useState<HomepageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch homepage data
  const fetchHomepage = useCallback(async () => {
    if (!currentTalent?.id) return;
    
    setIsLoading(true);
    try {
      const response = await homepageApi.get(currentTalent.id);
      if (response.success && response.data) {
        const data = response.data;
        setHomepageStatus({
          isPublished: data.isPublished || false,
          lastPublishedAt: data.publishedAt || data.lastPublishedAt,
          publishedAt: data.publishedAt,
          pageViews: data.pageViews || 0,
          customDomain: data.customDomain,
          hasDraftChanges: data.hasDraftChanges || (data.draftVersion && !data.publishedVersion),
          draftUpdatedAt: data.draftUpdatedAt,
          homepagePath: data.homepagePath,
        });
      }
    } catch (error) {
      // If homepage doesn't exist, show empty state
      setHomepageStatus({
        isPublished: false,
        pageViews: 0,
        customDomain: null,
        hasDraftChanges: false,
        homepagePath: currentTalent?.path || null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentTalent?.id]);

  useEffect(() => {
    fetchHomepage();
  }, [fetchHomepage]);

  // Helper to invalidate ISR cache for the homepage
  const revalidateHomepage = async (path: string) => {
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    } catch (error) {
      // Revalidation failure is non-critical, log but don't block
      console.warn('Failed to revalidate cache:', error);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!currentTalent?.id) return;
    try {
      const response = await homepageApi.publish(currentTalent.id);
      // Update UI directly from response instead of refetching
      if (response.success && response.data) {
        const data = response.data;
        const path = data.homepagePath || homepageStatus?.homepagePath;
        setHomepageStatus(prev => ({
          ...prev,
          isPublished: true,
          lastPublishedAt: data.publishedAt || new Date().toISOString(),
          publishedAt: data.publishedAt || new Date().toISOString(),
          hasDraftChanges: false,
          homepagePath: data.homepagePath || prev?.homepagePath,
        }));
        // Invalidate ISR cache so visitors see the new content immediately
        if (path) {
          await revalidateHomepage(path);
        }
      }
      toast.success(t('publishSuccess'));
    } catch (error: any) {
      const errorCode = error?.code;
      if (errorCode && typeof errorCode === 'string') {
        const translated = te(errorCode as any);
        if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
          toast.error(translated);
        } else {
          toast.error(error?.message || te('generic'));
        }
      } else {
        toast.error(error?.message || te('generic'));
      }
    }
  };

  // Handle unpublish
  const handleUnpublish = async () => {
    if (!currentTalent?.id) return;
    try {
      const path = homepageStatus?.homepagePath;
      const response = await homepageApi.unpublish(currentTalent.id);
      // Update UI directly from response instead of refetching
      if (response.success) {
        setHomepageStatus(prev => ({
          ...prev,
          isPublished: false,
          lastPublishedAt: prev?.lastPublishedAt, // Keep the last published time for reference
          hasDraftChanges: true,
        }));
        // Invalidate ISR cache so visitors see the page is unpublished
        if (path) {
          await revalidateHomepage(path);
        }
      }
      toast.success(t('unpublishSuccess'));
    } catch (error: any) {
      const errorCode = error?.code;
      if (errorCode && typeof errorCode === 'string') {
        const translated = te(errorCode as any);
        if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
          toast.error(translated);
        } else {
          toast.error(error?.message || te('generic'));
        }
      } else {
        toast.error(error?.message || te('generic'));
      }
    }
  };

  const handleEdit = () => {
    router.push('/homepage/editor');
  };

  if (!currentTalent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Globe className="h-12 w-12 mb-4 opacity-50" />
        <p>{t('selectTalent')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Dialog */}
      <SettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
        talentId={currentTalent.id}
        onSave={fetchHomepage}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('manageHomepage', { talentName: currentTalent.displayName })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/p/${homepageStatus?.homepagePath || currentTalent.homepagePath || currentTalent.code.toLowerCase()}`} target="_blank">
            <Button variant="outline">
              <Eye size={16} className="mr-2" />
              {t('preview')}
            </Button>
          </Link>
          <Button onClick={handleEdit}>
            <Edit size={16} className="mr-2" />
            {t('editHomepage')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe size={18} />
              {t('status')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('published')}</span>
              <Badge variant={homepageStatus?.isPublished ? 'default' : 'secondary'}>
                {homepageStatus?.isPublished ? t('live') : t('draft')}
              </Badge>
            </div>
            {homepageStatus?.hasDraftChanges && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('draftChanges')}</span>
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  {t('unpublished')}
                </Badge>
              </div>
            )}
            {homepageStatus?.lastPublishedAt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('lastPublished')}</span>
                <span className="text-sm">
                  {new Date(homepageStatus.lastPublishedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('pageViews')}</span>
              <span className="font-medium">{(homepageStatus?.pageViews || 0).toLocaleString()}</span>
            </div>
            <div className="pt-2 flex gap-2">
              {homepageStatus?.isPublished ? (
                <Button variant="outline" size="sm" className="flex-1" onClick={handleUnpublish}>
                  {t('unpublish') || 'Unpublish'}
                </Button>
              ) : (
                <Button size="sm" className="flex-1" onClick={handlePublish}>
                  {t('publish') || 'Publish'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* URL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink size={18} />
              {t('url')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">{t('defaultUrl')}</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm truncate">
                  /p/{homepageStatus?.homepagePath || currentTalent.homepagePath || currentTalent.code.toLowerCase()}
                </code>
                <Link href={`/p/${homepageStatus?.homepagePath || currentTalent.homepagePath || currentTalent.code.toLowerCase()}`} target="_blank">
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <ExternalLink size={14} />
                  </Button>
                </Link>
              </div>
            </div>
            {homepageStatus?.customDomain && (
              <div>
                <label className="text-sm text-muted-foreground">{t('customDomain')}</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm truncate">
                    {homepageStatus.customDomain}
                  </code>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    {t('verified')}
                  </Badge>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t('domainSettingsNote')}</p>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={18} />
              {t('quickSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('seoEnabled')}</span>
              <Badge>{t('enabled')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('analytics')}</span>
              <Badge variant="outline">{t('notConfigured')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('socialSharing')}</span>
              <Badge>{t('enabled')}</Badge>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setSettingsOpen(true)}>
              {t('allSettings')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Editor Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pagePreview')}</CardTitle>
          <CardDescription>
            {t('pagePreviewDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg relative overflow-hidden group">
            {/* Hover overlay with edit button */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors z-10 pointer-events-none">
              <Button 
                onClick={handleEdit} 
                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
              >
                {t('openFullEditor')}
              </Button>
            </div>
            
            {/* Live iframe preview or placeholder */}
            {homepageStatus?.isPublished && (homepageStatus?.homepagePath || currentTalent.homepagePath) ? (
              <iframe
                src={`/p/${homepageStatus?.homepagePath || currentTalent.homepagePath || currentTalent.code.toLowerCase()}`}
                className="w-full h-full border-0 pointer-events-none"
                title="Homepage Preview"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <Globe className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p>{homepageStatus?.isPublished ? t('editorPreviewPlaceholder') : t('notPublishedPreview')}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
