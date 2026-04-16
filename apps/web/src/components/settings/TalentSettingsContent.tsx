// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  BookOpen,
  Database,
  Layers,
  Loader2,
  Settings,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { BlocklistManager } from '@/components/security/BlocklistManager';
import { ExternalBlocklistManager } from '@/components/security/ExternalBlocklistManager';
import { HierarchicalSettingsPanel } from '@/components/settings/HierarchicalSettingsPanel';
import { TalentConfigEntitiesTab } from '@/components/settings/talent-settings/TalentConfigEntitiesTab';
import { TalentDetailsTab } from '@/components/settings/talent-settings/TalentDetailsTab';
import { TalentDictionaryTab } from '@/components/settings/talent-settings/TalentDictionaryTab';
import { TalentFeatureSettingsTab } from '@/components/settings/talent-settings/TalentFeatureSettingsTab';
import { TalentSettingsHeader } from '@/components/settings/talent-settings/TalentSettingsHeader';
import type { TalentSettingsTab } from '@/components/settings/talent-settings/types';
import { useTalentSettingsData } from '@/components/settings/talent-settings/useTalentSettingsData';
import {
  CONFIG_ENTITY_TYPES,
  DICTIONARY_TYPES,
} from '@/components/shared/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getQueryString, replaceQueryState } from '@/platform/routing/query-state';

// Props for the shared component
interface TalentSettingsContentProps {
  // Optional subsidiaryId for nested talent routes
  subsidiaryId?: string;
}

export function TalentSettingsContent({ subsidiaryId }: TalentSettingsContentProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('settingsPage');
  const tTalent = useTranslations('talentSettings');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const tForms = useTranslations('forms');
  const tenantId = params.tenantId as string;
  const talentId = params.talentId as string;
  const rawActiveTab = getQueryString(searchParams, 'tab', 'details');
  const activeTab: TalentSettingsTab =
    rawActiveTab === 'config' ||
    rawActiveTab === 'dictionary' ||
    rawActiveTab === 'security' ||
    rawActiveTab === 'settings' ||
    rawActiveTab === 'scope'
      ? rawActiveTab
      : 'details';
  const defaultEntityType = CONFIG_ENTITY_TYPES[0].code;
  const defaultDictType = DICTIONARY_TYPES[0].code;
  const rawSelectedEntityType = getQueryString(searchParams, 'entity', defaultEntityType);
  const rawSelectedDictType = getQueryString(searchParams, 'dict', defaultDictType);
  const selectedEntityType = CONFIG_ENTITY_TYPES.some((entry) => entry.code === rawSelectedEntityType)
    ? rawSelectedEntityType
    : defaultEntityType;
  const selectedDictType = DICTIONARY_TYPES.some((entry) => entry.code === rawSelectedDictType)
    ? rawSelectedDictType
    : defaultDictType;
  const entitySearch = getQueryString(searchParams, 'entitySearch');
  const dictSearch = getQueryString(searchParams, 'dictSearch');

  const replaceTalentSettingsQuery = (
    updates: Record<string, string | number | null | undefined>,
  ) => {
    replaceQueryState({
      router,
      pathname,
      searchParams,
      updates,
    });
  };

  const {
    configEntities,
    deleteTalent,
    dictCounts,
    dictionaryRecords,
    isLoading,
    isLoadingConfig,
    isLoadingDict,
    isLoadingReadiness,
    isDeleting,
    isLifecycleMutating,
    isSaving,
    publishReadiness,
    publishTalent,
    disableTalent,
    reEnableTalent,
    refreshTalentContext,
    saveTalent,
    setTalent,
    talent,
  } = useTalentSettingsData({
    talentId,
    subsidiaryId,
    tc,
    te,
    activeTab,
    selectedEntityType,
    entitySearch,
    selectedDictType,
    dictSearch,
  });

  const handleBack = () => {
    router.push(`/tenant/${tenantId}/organization-structure`);
  };

  const handleDeleteDraftTalent = async () => {
    const deleted = await deleteTalent();

    if (deleted) {
      router.push(`/tenant/${tenantId}/organization-structure`);
    }

    return deleted;
  };

  // Loading state
  if (isLoading || !talent) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TalentSettingsHeader talent={talent} onBack={handleBack} t={t} tTalent={tTalent} />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          replaceTalentSettingsQuery({
            tab: value === 'details' ? null : value,
          })
        }
      >
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="details">
            <Sparkles size={14} className="mr-2" />
            {t('details')}
          </TabsTrigger>
          <TabsTrigger value="config">
            <Database size={14} className="mr-2" />
            {t('configEntity')}
          </TabsTrigger>
          <TabsTrigger value="dictionary">
            <BookOpen size={14} className="mr-2" />
            {t('dictionary')}
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield size={14} className="mr-2" />
            {t('security')}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings size={14} className="mr-2" />
            {t('featureSettings')}
          </TabsTrigger>
          <TabsTrigger value="scope">
            <Layers size={14} className="mr-2" />
            {t('scope')}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <TalentDetailsTab
            talentId={talentId}
            talent={talent}
            publishReadiness={publishReadiness}
            notice={searchParams.get('notice')}
            from={searchParams.get('from')}
            isLoadingReadiness={isLoadingReadiness}
            isLifecycleMutating={isLifecycleMutating}
            isDeletingDraft={isDeleting}
            isSaving={isSaving}
            onTalentChange={setTalent}
            onPublish={publishTalent}
            onDisable={disableTalent}
            onReEnable={reEnableTalent}
            onDeleteDraft={handleDeleteDraftTalent}
            onSave={saveTalent}
            onDomainChange={refreshTalentContext}
            t={t}
            tc={tc}
            tTalent={tTalent}
            tForms={tForms}
          />
        </TabsContent>

        {/* Config Entity Tab - Left/Right Split */}
        <TabsContent value="config" className="mt-6">
          <TalentConfigEntitiesTab
            configEntities={configEntities}
            selectedEntityType={selectedEntityType}
            entitySearch={entitySearch}
            isLoadingConfig={isLoadingConfig}
            onSelectedEntityTypeChange={(value) =>
              replaceTalentSettingsQuery({
                entity: value === defaultEntityType ? null : value,
              })
            }
            onEntitySearchChange={(value) =>
              replaceTalentSettingsQuery({
                entitySearch: value || null,
              })
            }
            t={t}
            tc={tc}
            tTalent={tTalent}
          />
        </TabsContent>

        {/* Dictionary Tab - Left/Right Split */}
        <TabsContent value="dictionary" className="mt-6">
          <TalentDictionaryTab
            dictionaryRecords={dictionaryRecords}
            dictCounts={dictCounts}
            selectedDictType={selectedDictType}
            dictSearch={dictSearch}
            isLoadingDict={isLoadingDict}
            onSelectedDictTypeChange={(value) =>
              replaceTalentSettingsQuery({
                dict: value === defaultDictType ? null : value,
              })
            }
            onDictSearchChange={(value) =>
              replaceTalentSettingsQuery({
                dictSearch: value || null,
              })
            }
            t={t}
            tc={tc}
            tTalent={tTalent}
          />
        </TabsContent>

        {/* Security Tab - Blocklist with Inheritance */}
        <TabsContent value="security" className="mt-6">
          <div className="space-y-8">
            {/* System Blocklist (Internal content filtering) */}
            <BlocklistManager scopeType="talent" scopeId={talentId} />
            
            {/* External Blocklist (URL/Domain filtering for Marshmallow) */}
            <ExternalBlocklistManager scopeType="talent" scopeId={talentId} />
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <TalentFeatureSettingsTab
            talent={talent}
            configEntities={configEntities}
            isSaving={isSaving}
            onTalentChange={setTalent}
            onSave={saveTalent}
            tc={tc}
            tTalent={tTalent}
          />
        </TabsContent>

        {/* Scope Settings Tab - Hierarchical Settings with Inheritance */}
        <TabsContent value="scope" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{tTalent('hierarchicalSettings')}</CardTitle>
              <CardDescription>
                {tTalent('hierarchicalSettingsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HierarchicalSettingsPanel
                scopeType="talent"
                scopeId={talentId}
                scopeName={talent.displayName}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
