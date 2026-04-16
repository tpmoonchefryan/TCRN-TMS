// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Edit, ExternalLink, Eye, Globe, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SettingsDialog } from '@/components/homepage/editor/SettingsDialog';
import {
  buildHomepagePreviewPath,
  createHomepageAdminStatusFallback,
  homepageAdminApi,
  type HomepageAdminStatus,
} from '@/domains/homepage-public/api/homepage-admin.api';
import { getTranslatedApiErrorMessage } from '@/platform/http/error-message';
import { buildTalentSettingsUrl } from '@/platform/routing/talent-workspace';
import { useTalentStore } from '@/platform/state/talent-store';
import { useUIMode } from '@/platform/state/ui-mode';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/platform/ui';

export function HomepageAdminScreen() {
  const { currentTalent } = useTalentStore();
  const t = useTranslations('homepageAdmin');
  const te = useTranslations('errors');
  const router = useRouter();
  const [homepageStatus, setHomepageStatus] = useState<HomepageAdminStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { switchToManagementUI, currentTenantId } = useUIMode();

  const handleDomainSettingsClick = () => {
    if (currentTenantId && currentTalent) {
      switchToManagementUI();
      router.push(
        buildTalentSettingsUrl({
          tenantId: currentTenantId,
          talentId: currentTalent.id,
          subsidiaryId: currentTalent.subsidiaryId,
        }),
      );
    }
  };

  const fetchHomepage = useCallback(async () => {
    if (!currentTalent?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const nextStatus = await homepageAdminApi.getStatus(currentTalent.id);
      setHomepageStatus(nextStatus);
    } catch {
      setHomepageStatus(createHomepageAdminStatusFallback(currentTalent));
    } finally {
      setIsLoading(false);
    }
  }, [currentTalent]);

  useEffect(() => {
    void fetchHomepage();
  }, [fetchHomepage]);

  const handlePublish = async () => {
    if (!currentTalent?.id) {
      return;
    }

    try {
      const response = await homepageAdminApi.publish(currentTalent.id);
      if (response.success && response.data) {
        const publishedHomepage = response.data;
        const path = homepageStatus?.homepagePath || currentTalent.homepagePath || null;
        setHomepageStatus((previousStatus) =>
          homepageAdminApi.applyPublishedState(
            previousStatus,
            currentTalent.homepagePath,
            publishedHomepage,
          ),
        );
        if (path) {
          await homepageAdminApi.revalidateHomepage(path);
        }
      }
      toast.success(t('publishSuccess'));
    } catch (error: unknown) {
      toast.error(getTranslatedApiErrorMessage(error, te, te('generic')));
    }
  };

  const handleUnpublish = async () => {
    if (!currentTalent?.id) {
      return;
    }

    try {
      const path = homepageStatus?.homepagePath;
      const response = await homepageAdminApi.unpublish(currentTalent.id);
      if (response.success) {
        setHomepageStatus((previousStatus) =>
          homepageAdminApi.applyUnpublishedState(previousStatus),
        );
        if (path) {
          await homepageAdminApi.revalidateHomepage(path);
        }
      }
      toast.success(t('unpublishSuccess'));
    } catch (error: unknown) {
      toast.error(getTranslatedApiErrorMessage(error, te, te('generic')));
    }
  };

  const handleEdit = () => {
    router.push('/homepage/editor');
  };

  if (!currentTalent) {
    return (
      <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
        <Globe className="mb-4 h-12 w-12 opacity-50" />
        <p>{t('selectTalent')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const previewPath = buildHomepagePreviewPath(
    homepageStatus?.homepagePath || currentTalent.homepagePath,
    currentTalent.code,
  );

  return (
    <div className="space-y-6">
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        talentId={currentTalent.id}
        onSave={() => {
          void fetchHomepage();
        }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('manageHomepage', { talentName: currentTalent.displayName })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/p/${previewPath}`} target="_blank">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                <Badge variant="outline" className="border-orange-200 text-orange-600">
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
            <div className="flex gap-2 pt-2">
              {homepageStatus?.isPublished ? (
                <Button variant="outline" size="sm" className="flex-1" onClick={handleUnpublish}>
                  {t('unpublish')}
                </Button>
              ) : (
                <Button size="sm" className="flex-1" onClick={handlePublish}>
                  {t('publish')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink size={18} />
              {t('url')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm">{t('defaultUrl')}</label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
                  /p/{previewPath}
                </code>
                <Link href={`/p/${previewPath}`} target="_blank">
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <ExternalLink size={14} />
                  </Button>
                </Link>
              </div>
            </div>
            {homepageStatus?.customDomain ? (
              <div>
                <label className="text-muted-foreground text-sm">{t('customDomain')}</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
                    {homepageStatus.customDomain}
                  </code>
                  {homepageStatus.customDomainVerified ? (
                    <Badge variant="outline" className="border-green-200 text-green-600">
                      {t('verified')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-200 text-amber-600">
                      {t('notVerified')}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-muted-foreground text-sm">{t('customDomain')}</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">{t('notConfigured')}</span>
                </div>
              </div>
            )}
            <button
              onClick={handleDomainSettingsClick}
              className="text-primary text-xs hover:underline"
            >
              {t('manageDomainInSettings')}
            </button>
          </CardContent>
        </Card>

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
            <Button variant="outline" className="mt-4 w-full" onClick={() => setSettingsOpen(true)}>
              {t('allSettings')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('pagePreview')}</CardTitle>
          <CardDescription>{t('pagePreviewDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="group relative aspect-video overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <Button
                onClick={handleEdit}
                className="pointer-events-auto opacity-0 transition-opacity group-hover:opacity-100"
              >
                {t('openFullEditor')}
              </Button>
            </div>

            {homepageStatus?.isPublished && (homepageStatus?.homepagePath || currentTalent.homepagePath) ? (
              <iframe
                src={`/p/${homepageStatus?.homepagePath || currentTalent.homepagePath || currentTalent.code.toLowerCase()}`}
                className="h-full w-full border-0 pointer-events-none"
                title={t('pagePreview')}
                loading="lazy"
              />
            ) : (
              <div className="text-muted-foreground flex h-full w-full items-center justify-center text-center">
                <div>
                  <Globe className="mx-auto mb-4 h-16 w-16 opacity-30" />
                  <p>
                    {homepageStatus?.isPublished
                      ? t('editorPreviewPlaceholder')
                      : t('notPublishedPreview')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
