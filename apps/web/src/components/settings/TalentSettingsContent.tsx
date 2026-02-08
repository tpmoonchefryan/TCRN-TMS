// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Copy,
    Database,
    Edit,
    ExternalLink,
    Globe,
    Image,
    Layers,
    Loader2,
    Lock,
    MessageSquareHeart,
    MoreHorizontal,
    Plus,
    Save,
    Search,
    Settings,
    Shield,
    Sparkles,
    Trash2
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { BlocklistManager } from '@/components/security/BlocklistManager';
import { ExternalBlocklistManager } from '@/components/security/ExternalBlocklistManager';
import { CustomDomainDialog } from '@/components/settings/CustomDomainDialog';
import { HierarchicalSettingsPanel } from '@/components/settings/HierarchicalSettingsPanel';
import { UnifiedCustomDomainCard } from '@/components/settings/UnifiedCustomDomainCard';
import {
    CONFIG_ENTITY_TYPES,
    ConfigEntity,
    DICTIONARY_TYPES,
    DictionaryRecord,
} from '@/components/shared/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { configEntityApi, dictionaryApi, talentApi, talentDomainApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// NOTE: CONFIG_ENTITY_TYPES, DICTIONARY_TYPES, ConfigEntity, DictionaryRecord
// are now imported from @/components/shared/constants

interface SocialLink {
  platform: string;
  url: string;
}

interface ExternalPageDomainConfig {
  isPublished?: boolean;
  isEnabled?: boolean;
  path?: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
}

interface ProfileStoreInfo {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  isDefault: boolean;
  piiProxyUrl: string | null;
}

interface TalentData {
  id: string;
  code: string;
  displayName: string;
  avatarUrl: string | null;
  path: string;
  subsidiaryId: string | null;
  subsidiaryName: string | null;
  profileStoreId: string | null;
  profileStore: ProfileStoreInfo | null;
  homepagePath: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  customerCount: number;
  version: number;
  settings: {
    inheritTimezone: boolean;
    homepageEnabled: boolean;
    marshmallowEnabled: boolean;
  };
  socialLinks: SocialLink[];
  externalPagesDomain: {
    homepage: ExternalPageDomainConfig | null;
    marshmallow: ExternalPageDomainConfig | null;
  };
}

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

  // Custom domain dialog state
  const [homepageDomainDialogOpen, setHomepageDomainDialogOpen] = useState(false);
  const [marshmallowDomainDialogOpen, setMarshmallowDomainDialogOpen] = useState(false);

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

  // Domain handlers
  const handleSaveHomepageDomain = async (domain: string | null): Promise<{ token?: string; txtRecord?: string } | void> => {
    const response = await talentDomainApi.setHomepageDomain(talentId, domain);
    if (response.success) {
      await fetchTalent();
      return {
        token: response.data?.token ?? undefined,
        txtRecord: response.data?.txtRecord ?? undefined,
      };
    }
    throw new Error('Failed to save domain');
  };

  const handleVerifyHomepageDomain = async (): Promise<{ verified: boolean; message: string }> => {
    const response = await talentDomainApi.verifyHomepageDomain(talentId);
    if (response.success && response.data) {
      await fetchTalent();
      return { verified: response.data.verified, message: response.data.message || 'Verification complete' };
    }
    return { verified: false, message: 'Verification failed' };
  };

  const handleSaveMarshmallowDomain = async (domain: string | null): Promise<{ token?: string; txtRecord?: string } | void> => {
    const response = await talentDomainApi.setMarshmallowDomain(talentId, domain);
    if (response.success) {
      await fetchTalent();
      return {
        token: response.data?.token ?? undefined,
        txtRecord: response.data?.txtRecord ?? undefined,
      };
    }
    throw new Error('Failed to save domain');
  };

  const handleVerifyMarshmallowDomain = async (): Promise<{ verified: boolean; message: string }> => {
    const response = await talentDomainApi.verifyMarshmallowDomain(talentId);
    if (response.success && response.data) {
      await fetchTalent();
      return { verified: response.data.verified, message: response.data.message || 'Verification complete' };
    }
    return { verified: false, message: 'Verification failed' };
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

  // Filter config entities
  const filteredEntities = useMemo(() => {
    const entities = configEntities[selectedEntityType] || [];
    if (!entitySearch) return entities;
    const search = entitySearch.toLowerCase();
    return entities.filter(e => 
      e.code.toLowerCase().includes(search) ||
      e.nameEn.toLowerCase().includes(search) ||
      e.nameZh.includes(search)
    );
  }, [selectedEntityType, entitySearch, configEntities]);

  const selectedEntityTypeInfo = CONFIG_ENTITY_TYPES.find(t => t.code === selectedEntityType);

  // Filter dictionary records
  const filteredDictRecords = useMemo(() => {
    const records = dictionaryRecords[selectedDictType] || [];
    if (!dictSearch) return records;
    const search = dictSearch.toLowerCase();
    return records.filter(r =>
      r.code.toLowerCase().includes(search) ||
      r.nameEn.toLowerCase().includes(search) ||
      r.nameZh.includes(search)
    );
  }, [selectedDictType, dictSearch, dictionaryRecords]);

  const selectedDictInfo = DICTIONARY_TYPES.find(t => t.code === selectedDictType);

  const getSourceBadge = (entity: ConfigEntity) => {
    if (entity.inheritedFrom === 'Tenant') {
      return <Badge variant="secondary" className="text-xs">{tc('tenant')}</Badge>;
    } else if (entity.inheritedFrom === 'Subsidiary') {
      return <Badge className="bg-amber-500 text-xs">{tc('subsidiary')}</Badge>;
    } else {
      return <Badge className="bg-pink-500 text-xs">{tc('local')}</Badge>;
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
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
            {/* Left Panel - Entity Types */}
            <Card className="col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{tTalent('entityTypes')}</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-420px)]">
                  <div className="space-y-1">
                    {CONFIG_ENTITY_TYPES.map((type) => {
                      const count = (configEntities[type.code] || []).length;
                      return (
                        <button
                          key={type.code}
                          onClick={() => setSelectedEntityType(type.code)}
                          className={cn(
                            'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                            selectedEntityType === type.code
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{type.icon}</span>
                            <div>
                              <p className="font-medium text-sm">{type.name}</p>
                              <p className="text-xs text-muted-foreground">{type.nameZh}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Panel - Entity Records */}
            <Card className="col-span-9">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">{selectedEntityTypeInfo?.icon}</span>
                      {selectedEntityTypeInfo?.name}
                    </CardTitle>
                    <CardDescription>{selectedEntityTypeInfo?.description}</CardDescription>
                  </div>
                  <Button>
                    <Plus size={16} className="mr-2" />
                    {t('addRecord')}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      placeholder={t('searchRecords')}
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[calc(100vh-500px)]">
                  {isLoadingConfig ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[100px]">Source</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                        <TableHead className="w-[100px]">Force Use</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {t('noRecordsClickAdd')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntities.map((entity) => (
                          <TableRow key={entity.id} className="group">
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-2">
                                {entity.code}
                                {entity.isSystem && (
                                  <Lock size={12} className="text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{entity.nameEn}</p>
                                <p className="text-xs text-muted-foreground">{entity.nameZh}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getSourceBadge(entity)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                                {entity.isActive ? tc('active') : tc('inactive')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch checked={entity.isForceUse} disabled={entity.isSystem || !!entity.inheritedFrom} />
                            </TableCell>
                            <TableCell>
                              {!entity.inheritedFrom ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="opacity-0 group-hover:opacity-100"
                                    >
                                      <MoreHorizontal size={16} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Edit className="mr-2 h-4 w-4" />
                                      {tc('edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Copy className="mr-2 h-4 w-4" />
                                      {tc('duplicate')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {!entity.isSystem && (
                                      <DropdownMenuItem className="text-orange-500">
                                        <Lock className="mr-2 h-4 w-4" />
                                        {tc('disabled')}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-xs text-muted-foreground">{tc('inherited')}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dictionary Tab - Left/Right Split */}
        <TabsContent value="dictionary" className="mt-6">
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
            {/* Left Panel - Dictionary Types */}
            <Card className="col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{tTalent('dictionaryTypes')}</CardTitle>
                <CardDescription className="text-xs">
                  {tTalent('inheritedFromTenant')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-450px)]">
                  <div className="space-y-1">
                    {DICTIONARY_TYPES.map((type) => (
                      <button
                        key={type.code}
                        onClick={() => setSelectedDictType(type.code)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                          selectedDictType === type.code
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{type.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{type.name}</p>
                            <p className="text-xs text-muted-foreground">{type.nameZh}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {dictCounts[type.code] ?? '-'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Panel - Dictionary Records */}
            <Card className="col-span-9">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">{selectedDictInfo?.icon}</span>
                      {selectedDictInfo?.name}
                    </CardTitle>
                    <CardDescription>
                      {tTalent('systemDictReadOnly')}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    <Lock size={12} className="mr-1" />
                    {tc('readOnly')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      placeholder={t('searchDictionary')}
                      value={dictSearch}
                      onChange={(e) => setDictSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[calc(100vh-500px)]">
                  {isLoadingDict ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredDictRecords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No records found for this dictionary type.</p>
                      <p className="text-sm mt-1">Try a different search term.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Code</TableHead>
                          <TableHead>English</TableHead>
                          <TableHead>Chinese</TableHead>
                          <TableHead>Japanese</TableHead>
                          <TableHead className="w-[80px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDictRecords.map((record) => (
                          <TableRow key={record.code}>
                            <TableCell className="font-mono text-sm">{record.code}</TableCell>
                            <TableCell>{record.nameEn}</TableCell>
                            <TableCell>{record.nameZh}</TableCell>
                            <TableCell>{record.nameJa}</TableCell>
                            <TableCell>
                              {record.isActive ? (
                                <Badge variant="default" className="text-xs">{tc('active')}</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">{tc('inactive')}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
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
          <Card>
            <CardHeader>
              <CardTitle>{tTalent('featureSettings')}</CardTitle>
              <CardDescription>{tTalent('featureSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Globe size={16} />
                    {tTalent('homepage')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {tTalent('enablePublicHomepage')}
                  </p>
                </div>
                <Switch
                  checked={talent.settings.homepageEnabled}
                  onCheckedChange={(checked) =>
                    setTalent({
                      ...talent,
                      settings: { ...talent.settings, homepageEnabled: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquareHeart size={16} />
                    {tTalent('marshmallow')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {tTalent('enableAnonymousMessages')}
                  </p>
                </div>
                <Switch
                  checked={talent.settings.marshmallowEnabled}
                  onCheckedChange={(checked) =>
                    setTalent({
                      ...talent,
                      settings: { ...talent.settings, marshmallowEnabled: checked },
                    })
                  }
                />
              </div>

              {/* Stats */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">{tTalent('statistics')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-2xl font-bold">{talent.customerCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{tTalent('customers')}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-2xl font-bold">
                      {Object.values(configEntities).flat().filter(e => e.ownerType === 'talent').length}
                    </p>
                    <p className="text-xs text-muted-foreground">{tTalent('localConfigs')}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-2xl font-bold">
                      {Object.values(configEntities).flat().filter(e => e.inheritedFrom).length}
                    </p>
                    <p className="text-xs text-muted-foreground">{tTalent('inheritedConfigs')}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-2xl font-bold">{talent.socialLinks.length}</p>
                    <p className="text-xs text-muted-foreground">{tTalent('socialLinks')}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save size={16} className="mr-2" />
                  {isSaving ? tc('saving') : tc('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
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

      {/* Homepage Domain Dialog */}
      <CustomDomainDialog
        open={homepageDomainDialogOpen}
        onOpenChange={setHomepageDomainDialogOpen}
        type="homepage"
        currentDomain={talent.externalPagesDomain.homepage?.customDomain || null}
        verified={talent.externalPagesDomain.homepage?.customDomainVerified || false}
        verificationToken={talent.externalPagesDomain.homepage?.customDomainVerificationToken || null}
        onSave={handleSaveHomepageDomain}
        onVerify={handleVerifyHomepageDomain}
      />

      {/* Marshmallow Domain Dialog */}
      <CustomDomainDialog
        open={marshmallowDomainDialogOpen}
        onOpenChange={setMarshmallowDomainDialogOpen}
        type="marshmallow"
        currentDomain={talent.externalPagesDomain.marshmallow?.customDomain || null}
        verified={talent.externalPagesDomain.marshmallow?.customDomainVerified || false}
        verificationToken={talent.externalPagesDomain.marshmallow?.customDomainVerificationToken || null}
        onSave={handleSaveMarshmallowDomain}
        onVerify={handleVerifyMarshmallowDomain}
      />
    </div>
  );
}
