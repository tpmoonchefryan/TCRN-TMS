// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Database,
  ExternalLink,
  Image,
  Layers,
  Loader2,
  Plus,
  Save,
  Settings,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { BlocklistManager } from '@/components/security/BlocklistManager';
import { ExternalBlocklistManager } from '@/components/security/ExternalBlocklistManager';
import { HierarchicalSettingsPanel } from '@/components/settings/HierarchicalSettingsPanel';
import { TalentConfigEntitiesTab } from '@/components/settings/talent-settings/TalentConfigEntitiesTab';
import { TalentDictionaryTab } from '@/components/settings/talent-settings/TalentDictionaryTab';
import { TalentFeatureSettingsTab } from '@/components/settings/talent-settings/TalentFeatureSettingsTab';
import type { SocialLink, TalentData } from '@/components/settings/talent-settings/types';
import { UnifiedCustomDomainCard } from '@/components/settings/UnifiedCustomDomainCard';
import {
  CONFIG_ENTITY_TYPES,
  type ConfigEntity,
  DICTIONARY_TYPES,
  type DictionaryRecord,
} from '@/components/shared/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        socialLinks: editedSocialLinks.filter(link => link.platform && link.url),
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
    setEditedSocialLinks([...editedSocialLinks, { platform: '', url: '' }]);
    setSocialLinksChanged(true);
  };

  const handleUpdateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...editedSocialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setEditedSocialLinks(updated);
    setSocialLinksChanged(true);
  };

  const handleRemoveSocialLink = (index: number) => {
    setEditedSocialLinks(editedSocialLinks.filter((_, i) => i !== index));
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft size={20} />
        </Button>
        {talent.avatarUrl ? (
          <img
            src={talent.avatarUrl}
            alt={talent.displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-pink-200"
          />
        ) : (
          <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-full">
            <Sparkles size={24} className="text-pink-500" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{talent.displayName}</h1>
          <p className="text-muted-foreground">
            {t('talentSettings')} {talent.subsidiaryName && `• ${talent.subsidiaryName}`}
          </p>
        </div>
        <Badge variant={talent.isActive ? 'default' : 'secondary'}>
          {talent.isActive ? tc('active') : tc('inactive')}
        </Badge>
      </div>

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('talentInfo')}</CardTitle>
                <CardDescription>{t('talentInfoDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('talentCode')}</Label>
                  <Input value={talent.code} disabled />
                  <p className="text-xs text-muted-foreground">{tTalent('cannotChangeAfterCreation')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('displayName')}</Label>
                  <Input
                    value={talent.displayName}
                    onChange={(e) => setTalent({ ...talent, displayName: e.target.value })}
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
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{talent.profileStore.nameEn}</span>
                          {talent.profileStore.isDefault && (
                            <Badge variant="secondary" className="text-xs">{tc('default')}</Badge>
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
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                        <AlertCircle size={14} />
                        <span>{tTalent('noProfileStore')}</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{tTalent('profileStoreDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image size={14} /> Avatar URL
                  </Label>
                  <Input
                    value={talent.avatarUrl || ''}
                    onChange={(e) => setTalent({ ...talent, avatarUrl: e.target.value || null })}
                    placeholder={tForms('placeholders.url')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Unified Custom Domain Card */}
            <UnifiedCustomDomainCard
              talentId={talentId}
              talentCode={talent.code}
              onDomainChange={fetchTalent}
            />

            {/* Social Links Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{tTalent('socialLinks')}</span>
                  {socialLinksChanged && (
                    <Badge variant="outline" className="text-xs">{tc('unsaved')}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {editedSocialLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={link.platform}
                        onChange={(e) => handleUpdateSocialLink(index, 'platform', e.target.value)}
                        placeholder={tTalent('platformPlaceholder')}
                        className="w-32"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => handleUpdateSocialLink(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenSocialLink(link.url)}
                        disabled={!link.url}
                      >
                        <ExternalLink size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSocialLink(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddSocialLink}>
                    <Plus size={14} className="mr-2" />
                    {tTalent('addLink')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save size={16} className="mr-2" />
              {isSaving ? tc('saving') : tc('saveChanges')}
            </Button>
          </div>
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
