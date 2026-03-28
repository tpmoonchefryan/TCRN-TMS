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
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { BlocklistManager } from '@/components/security/BlocklistManager';
import { ExternalBlocklistManager } from '@/components/security/ExternalBlocklistManager';
import { HierarchicalSettingsPanel } from '@/components/settings/HierarchicalSettingsPanel';
import { TalentConfigEntitiesTab } from '@/components/settings/talent-settings/TalentConfigEntitiesTab';
import { TalentDetailsTab } from '@/components/settings/talent-settings/TalentDetailsTab';
import { TalentDictionaryTab } from '@/components/settings/talent-settings/TalentDictionaryTab';
import { TalentFeatureSettingsTab } from '@/components/settings/talent-settings/TalentFeatureSettingsTab';
import { TalentSettingsHeader } from '@/components/settings/talent-settings/TalentSettingsHeader';
import type { SocialLink, TalentData } from '@/components/settings/talent-settings/types';
import {
  addSocialLink,
  normalizeSocialLinksForSave,
  removeSocialLink,
  updateSocialLink,
} from '@/components/settings/talent-settings/utils';
import {
  CONFIG_ENTITY_TYPES,
  type ConfigEntity,
  DICTIONARY_TYPES,
  type DictionaryRecord,
} from '@/components/shared/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { configEntityApi, dictionaryApi } from '@/lib/api/modules/configuration';
import { talentApi } from '@/lib/api/modules/talent';

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

  const [activeTab, setActiveTab] = useState('details');
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Config Entity state
  const [configEntities, setConfigEntities] = useState<Record<string, ConfigEntity[]>>({});
  const [selectedEntityType, setSelectedEntityType] = useState<string>(CONFIG_ENTITY_TYPES[0].code);
  const [entitySearch, setEntitySearch] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Dictionary state
  const [dictionaryRecords, setDictionaryRecords] = useState<Record<string, DictionaryRecord[]>>({});
  const [selectedDictType, setSelectedDictType] = useState<string>(DICTIONARY_TYPES[0].code);
  const [dictSearch, setDictSearch] = useState('');
  const [isLoadingDict, setIsLoadingDict] = useState(false);
  const [dictCounts, setDictCounts] = useState<Record<string, number>>({});

  // Social links editing state
  const [editedSocialLinks, setEditedSocialLinks] = useState<SocialLink[]>([]);
  const [socialLinksChanged, setSocialLinksChanged] = useState(false);

  // Fetch talent data
  const fetchTalent = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await talentApi.get(talentId);
      if (response.success && response.data) {
        const data = response.data;
        setTalent({
          id: data.id,
          code: data.code,
          displayName: data.displayName || data.nameEn || data.code,
          avatarUrl: data.avatarUrl || null,
          path: data.path || `/${data.code}/`,
          subsidiaryId: data.subsidiaryId || subsidiaryId || null,
          subsidiaryName: data.subsidiary?.displayName || null,
          profileStoreId: data.profileStoreId || null,
          profileStore: data.profileStore || null,
          homepagePath: data.homepagePath || data.code.toLowerCase(),
          timezone: data.timezone || 'UTC',
          isActive: data.isActive ?? true,
          createdAt: data.createdAt,
          customerCount: data._count?.customers || data.stats?.customerCount || 0,
          version: data.version || 1,
          settings: {
            inheritTimezone: data.inheritTimezone ?? true,
            homepageEnabled: data.homepageEnabled ?? true,
            marshmallowEnabled: data.marshmallowEnabled ?? true,
          },
          socialLinks: data.socialLinks || [],
          externalPagesDomain: {
            homepage: data.externalPagesDomain?.homepage || null,
            marshmallow: data.externalPagesDomain?.marshmallow || null,
          },
        });
        // Initialize editable social links
        setEditedSocialLinks(data.socialLinks || []);
        setSocialLinksChanged(false);
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsLoading(false);
    }
  }, [talentId, tc, subsidiaryId]);

  // Fetch config entities for selected type
  const fetchConfigEntities = useCallback(async (entityType: string) => {
    setIsLoadingConfig(true);
    try {
      const response = await configEntityApi.list(entityType, {
        scopeType: 'talent',
        scopeId: talentId,
        includeInherited: true,
      });
      if (response.success && response.data) {
        const data = response.data;
        setConfigEntities(prev => ({
          ...prev,
          [entityType]: data.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            code: item.code as string,
            nameEn: item.nameEn as string || '',
            nameZh: item.nameZh as string || '',
            nameJa: item.nameJa as string || '',
            ownerType: item.ownerType as 'tenant' | 'subsidiary' | 'talent' || 'tenant',
            ownerLevel: item.ownerLevel as string || 'Tenant',
            isActive: item.isActive as boolean ?? true,
            isForceUse: item.isForceUse as boolean ?? false,
            isSystem: item.isSystem as boolean ?? false,
            sortOrder: item.sortOrder as number || 0,
            inheritedFrom: item.inheritedFrom as string || undefined,
          })),
        }));
      }
    } catch {
      // Keep empty array on error
    } finally {
      setIsLoadingConfig(false);
    }
  }, [talentId]);

  // Fetch dictionary records for selected type
  const fetchDictionaryRecords = useCallback(async (dictType: string) => {
    setIsLoadingDict(true);
    try {
      const response = await dictionaryApi.getByType(dictType);
      if (response.success && response.data) {
        const records = response.data.map((item: Record<string, unknown>) => ({
          code: item.code as string,
          nameEn: item.nameEn as string || '',
          nameZh: item.nameZh as string || '',
          nameJa: item.nameJa as string || '',
          isActive: item.isActive as boolean ?? true,
        }));
        setDictionaryRecords(prev => ({
          ...prev,
          [dictType]: records,
        }));
        setDictCounts(prev => ({
          ...prev,
          [dictType]: records.length,
        }));
      }
    } catch {
      // Keep empty array on error
    } finally {
      setIsLoadingDict(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchTalent();
  }, [fetchTalent]);

  // Fetch config entities when type changes
  useEffect(() => {
    if (activeTab === 'config') {
      fetchConfigEntities(selectedEntityType);
    }
  }, [activeTab, selectedEntityType, fetchConfigEntities]);

  // Fetch dictionary records when type changes
  useEffect(() => {
    if (activeTab === 'dictionary') {
      fetchDictionaryRecords(selectedDictType);
    }
  }, [activeTab, selectedDictType, fetchDictionaryRecords]);

  const handleBack = () => {
    router.push(`/tenant/${tenantId}/organization-structure`);
  };

  const handleSave = async () => {
    if (!talent) return;
    setIsSaving(true);
    try {
      await talentApi.update(talentId, {
        displayName: talent.displayName,
        homepagePath: talent.homepagePath,
        timezone: talent.timezone,
        version: talent.version,
        socialLinks: normalizeSocialLinksForSave(editedSocialLinks),
      });
      setSocialLinksChanged(false);
      toast.success(tc('success'));
      fetchTalent();
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Social Links handlers
  const handleAddSocialLink = () => {
    setEditedSocialLinks(addSocialLink(editedSocialLinks));
    setSocialLinksChanged(true);
  };

  const handleUpdateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    setEditedSocialLinks(updateSocialLink(editedSocialLinks, index, field, value));
    setSocialLinksChanged(true);
  };

  const handleRemoveSocialLink = (index: number) => {
    setEditedSocialLinks(removeSocialLink(editedSocialLinks, index));
    setSocialLinksChanged(true);
  };

  const handleOpenSocialLink = (url: string) => {
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
    }
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            onSave={handleSave}
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
            onSave={handleSave}
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
