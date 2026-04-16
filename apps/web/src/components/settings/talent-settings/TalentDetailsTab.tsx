// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  AlertCircle,
  Clock3,
  Database,
  Image,
  Loader2,
  Rocket,
  Save,
  Shield,
  ToggleLeft,
  Trash2,
} from 'lucide-react';

import { UnifiedCustomDomainCard } from '@/components/settings/UnifiedCustomDomainCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getTalentBusinessBlockedNotice,
  isTalentBusinessBlockedNotice,
} from '@/lib/talent-lifecycle-routing';

import type { TalentData, TalentReadiness } from './types';

interface TalentDetailsTabProps {
  talentId: string;
  talent: TalentData;
  publishReadiness: TalentReadiness | null;
  notice?: string | null;
  from?: string | null;
  isLoadingReadiness: boolean;
  isLifecycleMutating: boolean;
  isDeletingDraft: boolean;
  isSaving: boolean;
  onTalentChange: (talent: TalentData) => void;
  onPublish: () => Promise<boolean>;
  onDisable: () => Promise<boolean>;
  onReEnable: () => Promise<boolean>;
  onDeleteDraft: () => Promise<boolean>;
  onSave: () => void;
  onDomainChange: () => Promise<void>;
  t: (key: string) => string;
  tc: (key: string) => string;
  tTalent: (key: string) => string;
  tForms: (key: string) => string;
}

const getLifecycleBadgeVariant = (
  lifecycleStatus: TalentData['lifecycleStatus']
): 'default' | 'secondary' | 'warning' => {
  switch (lifecycleStatus) {
    case 'published':
      return 'default';
    case 'disabled':
      return 'secondary';
    case 'draft':
    default:
      return 'warning';
  }
};

const getLifecycleLabel = (
  lifecycleStatus: TalentData['lifecycleStatus'],
  tTalent: (key: string) => string
): string => {
  switch (lifecycleStatus) {
    case 'published':
      return tTalent('lifecyclePublished');
    case 'disabled':
      return tTalent('lifecycleDisabled');
    case 'draft':
    default:
      return tTalent('lifecycleDraft');
  }
};

export function TalentDetailsTab({
  talentId,
  talent,
  publishReadiness,
  notice,
  from,
  isLoadingReadiness,
  isLifecycleMutating,
  isDeletingDraft,
  isSaving,
  onTalentChange,
  onPublish,
  onDisable,
  onReEnable,
  onDeleteDraft,
  onSave,
  onDomainChange,
  t,
  tc,
  tTalent,
  tForms,
}: TalentDetailsTabProps) {
  const actionConfig =
    talent.lifecycleStatus === 'draft'
      ? {
          label: tTalent('publishTalent'),
          pendingLabel: tTalent('publishingTalent'),
          onClick: onPublish,
          variant: 'default' as const,
          requiresReadiness: true,
          effectSummary: tTalent('publishEffectSummary'),
        }
      : talent.lifecycleStatus === 'disabled'
        ? {
            label: tTalent('reEnableTalent'),
            pendingLabel: tTalent('reEnablingTalent'),
            onClick: onReEnable,
            variant: 'default' as const,
            requiresReadiness: true,
            effectSummary: tTalent('reEnableEffectSummary'),
          }
        : {
            label: tTalent('disableTalent'),
            pendingLabel: tTalent('disablingTalent'),
            onClick: onDisable,
            variant: 'destructive' as const,
            requiresReadiness: false,
            effectSummary: tTalent('disableEffectSummary'),
          };

  const isPrimaryActionDisabled =
    isLifecycleMutating ||
    (actionConfig.requiresReadiness &&
      (!!isLoadingReadiness || !publishReadiness || !publishReadiness.canEnterPublishedState));

  const formattedPublishedAt = talent.publishedAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(talent.publishedAt))
    : null;
  const activeBlockedNotice =
    notice &&
    isTalentBusinessBlockedNotice(notice) &&
    notice === getTalentBusinessBlockedNotice(talent.lifecycleStatus)
      ? notice
      : null;
  const blockedNoticeCopy =
    activeBlockedNotice === 'publish-required'
      ? {
          title: tTalent('publishRequiredTitle'),
          body: tTalent('publishRequiredBody'),
        }
      : activeBlockedNotice === 're-enable-required'
        ? {
            title: tTalent('reEnableRequiredTitle'),
            body: tTalent('reEnableRequiredBody'),
          }
        : null;

  return (
    <>
      <div className="space-y-6">
        {blockedNoticeCopy && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{blockedNoticeCopy.title}</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>{blockedNoticeCopy.body}</p>
                {from ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    {tTalent('blockedRoutePrefix')}: {from}
                  </p>
                ) : null}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle>{tTalent('publishReadiness')}</CardTitle>
                <p className="text-sm text-muted-foreground">{tTalent('talentLifecycleDesc')}</p>
              </div>
              <Badge variant={getLifecycleBadgeVariant(talent.lifecycleStatus)}>
                {getLifecycleLabel(talent.lifecycleStatus, tTalent)}
              </Badge>
            </div>
            {formattedPublishedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 size={14} />
                <span>
                  {tTalent('publishedAt')}: {formattedPublishedAt}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingReadiness ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                <span>{tTalent('checkingPublishReadiness')}</span>
              </div>
            ) : publishReadiness ? (
              <>
                {publishReadiness.blockers.length > 0 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{tTalent('blockers')}</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc space-y-1 pl-4">
                        {publishReadiness.blockers.map((issue) => (
                          <li key={issue.code}>{issue.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="success">
                    <Rocket className="h-4 w-4" />
                    <AlertTitle>
                      {talent.lifecycleStatus === 'published'
                        ? tTalent('publishedStateInfo')
                        : tTalent('readyToPublish')}
                    </AlertTitle>
                    <AlertDescription>
                      {talent.lifecycleStatus === 'published'
                        ? tTalent('publishedWorkspaceOpen')
                        : tTalent('readyToPublishDesc')}
                    </AlertDescription>
                  </Alert>
                )}

                {publishReadiness.warnings.length > 0 && (
                  <Alert variant="warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{tTalent('warnings')}</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc space-y-1 pl-4">
                        {publishReadiness.warnings.map((issue) => (
                          <li key={issue.code}>{issue.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : null}

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ToggleLeft size={16} />
                <span>{tTalent('effectSummary')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{actionConfig.effectSummary}</p>
            </div>

            {talent.lifecycleStatus === 'draft' && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
                  <Trash2 size={16} />
                  <span>{tTalent('deleteDraftTalent')}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tTalent('deleteDraftTalentDesc')}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant={actionConfig.variant}
                onClick={() => {
                  void actionConfig.onClick();
                }}
                disabled={isPrimaryActionDisabled}
              >
                {isLifecycleMutating ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    {actionConfig.pendingLabel}
                  </>
                ) : (
                  actionConfig.label
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('talentInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('talentCode')}</Label>
                <Input value={talent.code} disabled />
                <p className="text-xs text-muted-foreground">
                  {tTalent('cannotChangeAfterCreation')}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('displayName')}</Label>
                <Input
                  value={talent.displayName}
                  onChange={(event) =>
                    onTalentChange({ ...talent, displayName: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('path')}</Label>
                <Input value={talent.path} disabled />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Database size={14} /> {tTalent('profileStore')}
                </Label>
                {talent.profileStore ? (
                  <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{talent.profileStore.nameEn}</span>
                        {talent.profileStore.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            {tc('default')}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {talent.profileStore.code}
                      </Badge>
                    </div>
                    {talent.profileStore.piiProxyUrl && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield size={12} />
                        <span>{tTalent('piiEnabled')}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle size={14} />
                      <span>{tTalent('noProfileStore')}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{tTalent('profileStoreDesc')}</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image size={14} /> {tTalent('avatarUrl')}
                </Label>
                <Input
                  value={talent.avatarUrl || ''}
                  onChange={(event) =>
                    onTalentChange({
                      ...talent,
                      avatarUrl: event.target.value || null,
                    })
                  }
                  placeholder={tForms('placeholders.url')}
                />
              </div>
            </CardContent>
          </Card>

          <UnifiedCustomDomainCard
            talentId={talentId}
            talentCode={talent.code}
            onDomainChange={onDomainChange}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {talent.lifecycleStatus === 'draft' ? (
          <Button
            variant="destructive"
            disabled={isDeletingDraft || isLifecycleMutating || isSaving}
            onClick={() => {
              if (!window.confirm(tTalent('deleteDraftTalentConfirm'))) {
                return;
              }

              void onDeleteDraft();
            }}
          >
            {isDeletingDraft ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                {tTalent('deletingDraftTalent')}
              </>
            ) : (
              <>
                <Trash2 size={16} className="mr-2" />
                {tTalent('deleteDraftTalent')}
              </>
            )}
          </Button>
        ) : (
          <div />
        )}

        <Button onClick={onSave} disabled={isSaving || isDeletingDraft}>
          <Save size={16} className="mr-2" />
          {isSaving ? tc('saving') : tc('saveChanges')}
        </Button>
      </div>
    </>
  );
}
