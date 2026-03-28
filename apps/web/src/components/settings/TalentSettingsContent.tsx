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
import { useParams, useRouter } from 'next/navigation';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Props for the shared component
interface TalentSettingsContentProps {
  // Optional subsidiaryId for nested talent routes
  subsidiaryId?: string;
}

export function TalentSettingsContent({ subsidiaryId }: TalentSettingsContentProps) {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('settingsPage');
  const tTalent = useTranslations('talentSettings');
  const tc = useTranslations('common');
  const tForms = useTranslations('forms');
  const tenantId = params.tenantId as string;
  const talentId = params.talentId as string;

  const {
    activeTab,
    configEntities,
    dictCounts,
    dictSearch,
    dictionaryRecords,
    editedSocialLinks,
    entitySearch,
    fetchTalent,
    handleAddSocialLink,
    handleOpenSocialLink,
    handleRemoveSocialLink,
    handleUpdateSocialLink,
    isLoading,
    isLoadingConfig,
    isLoadingDict,
    isSaving,
    saveTalent,
    selectedDictType,
    selectedEntityType,
    setActiveTab,
    setDictSearch,
    setSelectedDictType,
    setSelectedEntityType,
    setTalent,
    setEntitySearch,
    socialLinksChanged,
    talent,
  } = useTalentSettingsData({
    talentId,
    subsidiaryId,
    tc,
  });

  const handleBack = () => {
    router.push(`/tenant/${tenantId}/organization-structure`);
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
      <TalentSettingsHeader talent={talent} onBack={handleBack} t={t} tc={tc} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TalentSettingsTab)}>
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
            {t('security') || 'Security'}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings size={14} className="mr-2" />
            {t('featureSettings')}
          </TabsTrigger>
          <TabsTrigger value="scope">
            <Layers size={14} className="mr-2" />
            {t('scope') || 'Scope'}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <TalentDetailsTab
            talentId={talentId}
            talent={talent}
            editedSocialLinks={editedSocialLinks}
            socialLinksChanged={socialLinksChanged}
            isSaving={isSaving}
            onTalentChange={setTalent}
            onAddSocialLink={handleAddSocialLink}
            onUpdateSocialLink={handleUpdateSocialLink}
            onRemoveSocialLink={handleRemoveSocialLink}
            onOpenSocialLink={handleOpenSocialLink}
            onSave={saveTalent}
            onDomainChange={fetchTalent}
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
            onSelectedEntityTypeChange={setSelectedEntityType}
            onEntitySearchChange={setEntitySearch}
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
            onSelectedDictTypeChange={setSelectedDictType}
            onDictSearchChange={setDictSearch}
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
