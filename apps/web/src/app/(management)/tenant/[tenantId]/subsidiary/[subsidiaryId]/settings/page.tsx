// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    ArrowLeft,
    BookOpen,
    Clock,
    Copy,
    Database,
    Edit,
    FolderTree,
    Globe,
    Layers,
    Loader2,
    Lock,
    MoreHorizontal,
    Plus,
    Save,
    Search,
    Settings,
    Shield,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { HierarchicalSettingsPanel } from '@/components/settings/HierarchicalSettingsPanel';
import { BlocklistManager } from '@/components/security/BlocklistManager';
import { ExternalBlocklistManager } from '@/components/security/ExternalBlocklistManager';
import { configEntityApi, dictionaryApi, subsidiaryApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// Configuration Entity Types (using singular kebab-case format to match backend API)
const CONFIG_ENTITY_TYPES = [
  { code: 'customer-status', name: 'Customer Status', nameZh: '客户状态', description: 'Customer lifecycle status definitions', icon: '👤' },
  { code: 'business-segment', name: 'Business Segment', nameZh: '业务分类', description: 'Business segment definitions', icon: '📊' },
  { code: 'reason-category', name: 'Reason Category', nameZh: '原因分类', description: 'Reason category definitions', icon: '📋' },
  { code: 'inactivation-reason', name: 'Inactivation Reason', nameZh: '停用原因', description: 'Customer inactivation reasons', icon: '🚫' },
  { code: 'membership-class', name: 'Membership Class', nameZh: '会籍等级', description: 'Membership tier definitions', icon: '🎫' },
  { code: 'membership-type', name: 'Membership Type', nameZh: '会籍类型', description: 'Platform-specific membership types', icon: '🎭' },
  { code: 'membership-level', name: 'Membership Level', nameZh: '会籍级别', description: 'Tier levels within membership types', icon: '⭐' },
  { code: 'consent', name: 'Consent', nameZh: '同意声明', description: 'Customer consent definitions', icon: '✅' },
  { code: 'blocklist-entry', name: 'Blocklist Entry', nameZh: '屏蔽词条', description: 'Content blocklist patterns', icon: '🛡️' },
];

// System Dictionary Types
const DICTIONARY_TYPES = [
  { code: 'countries', name: 'Countries', nameZh: '国家/地区', icon: '🌍' },
  { code: 'languages', name: 'Languages', nameZh: '语言', icon: '🗣️' },
  { code: 'timezones', name: 'Timezones', nameZh: '时区', icon: '🕐' },
  { code: 'currencies', name: 'Currencies', nameZh: '货币', icon: '💰' },
  { code: 'genders', name: 'Genders', nameZh: '性别', icon: '⚧️' },
  { code: 'profile_types', name: 'Profile Types', nameZh: '档案类型', icon: '📋' },
  { code: 'social_platforms', name: 'Social Platforms', nameZh: '社交平台', icon: '📱' },
];

// Type definitions
interface ConfigEntity {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  ownerType: 'tenant' | 'subsidiary' | 'talent';
  ownerLevel: string;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  sortOrder: number;
  inheritedFrom?: string;
}

interface DictionaryRecord {
  code: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  isActive: boolean;
}

interface SubsidiaryData {
  id: string;
  code: string;
  displayName: string;
  path: string;
  parentId: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  talentCount: number;
  version: number;
  settings: {
    inheritTimezone: boolean;
    allowCustomHomepage: boolean;
    allowMarshmallow: boolean;
  };
}

export default function SubsidiarySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('settingsPage');
  const tc = useTranslations('common');
  const tForms = useTranslations('forms');
  const tSubsidiary = useTranslations('subsidiarySettings');
  const tenantId = params.tenantId as string;
  const subsidiaryId = params.subsidiaryId as string;

  const [activeTab, setActiveTab] = useState('details');
  const [subsidiary, setSubsidiary] = useState<SubsidiaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Config Entity state
  const [configEntities, setConfigEntities] = useState<Record<string, ConfigEntity[]>>({});
  const [selectedEntityType, setSelectedEntityType] = useState(CONFIG_ENTITY_TYPES[0].code);
  const [entitySearch, setEntitySearch] = useState('');
  const [editingEntity, setEditingEntity] = useState<ConfigEntity | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Dictionary state
  const [dictionaryRecords, setDictionaryRecords] = useState<Record<string, DictionaryRecord[]>>({});
  const [selectedDictType, setSelectedDictType] = useState(DICTIONARY_TYPES[0].code);
  const [dictSearch, setDictSearch] = useState('');
  const [isLoadingDict, setIsLoadingDict] = useState(false);
  const [dictCounts, setDictCounts] = useState<Record<string, number>>({});

  // Fetch subsidiary data
  const fetchSubsidiary = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await subsidiaryApi.get(subsidiaryId);
      if (response.success && response.data) {
        const data = response.data;
        setSubsidiary({
          id: data.id,
          code: data.code,
          displayName: data.displayName || data.nameEn || data.code,
          path: data.path || `/${data.code}/`,
          parentId: data.parentId || null,
          timezone: data.timezone || 'UTC',
          isActive: data.isActive ?? true,
          createdAt: data.createdAt,
          talentCount: data._count?.talents || 0,
          version: data.version || 1,
          settings: {
            inheritTimezone: data.inheritTimezone ?? true,
            allowCustomHomepage: data.allowCustomHomepage ?? true,
            allowMarshmallow: data.allowMarshmallow ?? true,
          },
        });
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsLoading(false);
    }
  }, [subsidiaryId, tc]);

  // Fetch config entities for selected type
  const fetchConfigEntities = useCallback(async (entityType: string) => {
    setIsLoadingConfig(true);
    try {
      const response = await configEntityApi.list(entityType, {
        scopeType: 'subsidiary',
        scopeId: subsidiaryId,
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
  }, [subsidiaryId]);

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
    fetchSubsidiary();
  }, [fetchSubsidiary]);

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
    if (!subsidiary) return;
    setIsSaving(true);
    try {
      await subsidiaryApi.update(subsidiaryId, {
        nameEn: subsidiary.displayName,
        version: subsidiary.version,
      });
      toast.success(tc('success'));
      fetchSubsidiary();
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Config entity handlers
  const handleToggleActive = async (entityId: string) => {
    const entity = configEntities[selectedEntityType]?.find(e => e.id === entityId);
    if (!entity || entity.inheritedFrom) return;
    
    try {
      if (entity.isActive) {
        await configEntityApi.deactivate(selectedEntityType, entityId, 1);
      } else {
        await configEntityApi.reactivate(selectedEntityType, entityId, 1);
      }
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleToggleForceUse = async (entityId: string) => {
    const entity = configEntities[selectedEntityType]?.find(e => e.id === entityId);
    if (!entity || entity.isSystem || entity.inheritedFrom) return;
    
    try {
      await configEntityApi.update(selectedEntityType, entityId, {
        isForceUse: !entity.isForceUse,
        version: 1,
      });
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleEditEntity = (entity: ConfigEntity) => {
    setEditingEntity({ ...entity });
    setShowEditDialog(true);
  };

  const handleSaveEntity = async () => {
    if (!editingEntity) return;
    try {
      await configEntityApi.update(selectedEntityType, editingEntity.id, {
        nameEn: editingEntity.nameEn,
        nameZh: editingEntity.nameZh,
        nameJa: editingEntity.nameJa,
        version: 1,
      });
      toast.success(tc('success'));
      setShowEditDialog(false);
      setEditingEntity(null);
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleDuplicateEntity = async (entity: ConfigEntity) => {
    try {
      await configEntityApi.create(selectedEntityType, {
        code: `${entity.code}_COPY`,
        nameEn: `${entity.nameEn} (Copy)`,
        nameZh: entity.nameZh,
        nameJa: entity.nameJa,
        scopeType: 'subsidiary',
        scopeId: subsidiaryId,
      });
      toast.success(tc('success'));
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleDisableEntity = async (entityId: string) => {
    const entity = configEntities[selectedEntityType]?.find(e => e.id === entityId);
    if (!entity || entity.inheritedFrom || entity.isSystem) return;
    
    try {
      await configEntityApi.deactivate(selectedEntityType, entityId, 1);
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
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

  // Get selected entity type info
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

  // Loading state
  if (isLoading || !subsidiary) {
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
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <FolderTree size={24} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{subsidiary.displayName}</h1>
          <p className="text-muted-foreground">{t('subsidiarySettings')}</p>
        </div>
        <Badge variant={subsidiary.isActive ? 'default' : 'secondary'}>
          {subsidiary.isActive ? tc('active') : tc('inactive')}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="details">
            <FolderTree size={14} className="mr-2" />
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
            {tSubsidiary('scope')}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('subsidiaryInfo')}</CardTitle>
              <CardDescription>{t('subsidiaryInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('subsidiaryCode')}</Label>
                  <Input value={subsidiary.code} disabled />
                  <p className="text-xs text-muted-foreground">{tc('cannotChange')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('displayName')}</Label>
                  <Input
                    value={subsidiary.displayName}
                    onChange={(e) =>
                      setSubsidiary({ ...subsidiary, displayName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('path')}</Label>
                  <Input value={subsidiary.path} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock size={14} /> {t('timezone')}
                  </Label>
                  <Select
                    value={subsidiary.timezone}
                    onValueChange={(value) => setSubsidiary({ ...subsidiary, timezone: value })}
                    disabled={subsidiary.settings.inheritTimezone}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="inherit-tz"
                      checked={subsidiary.settings.inheritTimezone}
                      onChange={(e) =>
                        setSubsidiary({
                          ...subsidiary,
                          settings: { ...subsidiary.settings, inheritTimezone: e.target.checked },
                        })
                      }
                      className="rounded"
                    />
                    <label htmlFor="inherit-tz" className="text-sm text-muted-foreground">
                      {tc('inheritFromTenant')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{subsidiary.talentCount}</p>
                  <p className="text-xs text-muted-foreground">{t('talents')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">{t('subDirectories')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {Object.values(configEntities).flat().filter(e => e.ownerType === 'subsidiary').length}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('localConfigs')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {Object.values(configEntities).flat().filter(e => e.inheritedFrom).length}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('inheritedConfigs')}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save size={16} className="mr-2" />
                  {isSaving ? tc('saving') : tc('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Entity Tab - Left/Right Split */}
        <TabsContent value="config" className="mt-6">
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
            {/* Left Panel - Entity Types */}
            <Card className="col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('entityTypes')}</CardTitle>
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
                        <TableHead className="w-[120px]">{tc('code')}</TableHead>
                        <TableHead>{tc('name')}</TableHead>
                        <TableHead className="w-[100px]">{tc('source')}</TableHead>
                        <TableHead className="w-[80px]">{tc('status')}</TableHead>
                        <TableHead className="w-[100px]">{tc('forceUse')}</TableHead>
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
                              {entity.inheritedFrom ? (
                                <Badge variant="secondary" className="text-xs">
                                  {tc('inherited')}
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500 text-xs">
                                  {tc('local')}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => !entity.inheritedFrom && handleToggleActive(entity.id)}
                                disabled={!!entity.inheritedFrom}
                                className="cursor-pointer disabled:cursor-not-allowed"
                              >
                                <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                                  {entity.isActive ? tc('active') : tc('inactive')}
                                </Badge>
                              </button>
                            </TableCell>
                            <TableCell>
                              <Switch 
                                checked={entity.isForceUse} 
                                disabled={entity.isSystem || !!entity.inheritedFrom}
                                onCheckedChange={() => handleToggleForceUse(entity.id)}
                              />
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
                                    <DropdownMenuItem onClick={() => handleEditEntity(entity)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      {tc('edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateEntity(entity)}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      {tc('duplicate')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {!entity.isSystem && entity.isActive && (
                                      <DropdownMenuItem 
                                        className="text-orange-500"
                                        onClick={() => handleDisableEntity(entity.id)}
                                      >
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
                <CardTitle className="text-base">{t('dictionaryTypes')}</CardTitle>
                <CardDescription className="text-xs">
                  {t('inheritedFromTenant')}
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
                      {t('systemDictionaryInherited')}
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
                      <p>{t('noRecordsForType')}</p>
                      <p className="text-sm mt-1">{tSubsidiary('tryDifferentSearch')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">{tc('code')}</TableHead>
                          <TableHead>{tSubsidiary('english')}</TableHead>
                          <TableHead>{tSubsidiary('chinese')}</TableHead>
                          <TableHead>{tSubsidiary('japanese')}</TableHead>
                          <TableHead className="w-[80px]">{tc('status')}</TableHead>
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

        {/* Security Tab - Blocklist Management */}
        <TabsContent value="security" className="mt-6">
          <div className="space-y-8">
            {/* System Blocklist (Internal content filtering) */}
            <BlocklistManager scopeType="subsidiary" scopeId={subsidiary.id} />
            
            {/* External Blocklist (URL/Domain filtering for Marshmallow) */}
            <ExternalBlocklistManager scopeType="subsidiary" scopeId={subsidiary.id} />
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('featureSettings')}</CardTitle>
              <CardDescription>
                {t('subsidiaryFeatureDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Globe size={16} />
                    {t('externalHomepage')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('externalHomepageSubsidiaryDesc')}
                  </p>
                </div>
                <Switch
                  checked={subsidiary.settings.allowCustomHomepage}
                  onCheckedChange={(checked) =>
                    setSubsidiary({
                      ...subsidiary,
                      settings: { ...subsidiary.settings, allowCustomHomepage: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                    {t('marshmallow')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('marshmallowSubsidiaryDesc')}
                  </p>
                </div>
                <Switch
                  checked={subsidiary.settings.allowMarshmallow}
                  onCheckedChange={(checked) =>
                    setSubsidiary({
                      ...subsidiary,
                      settings: { ...subsidiary.settings, allowMarshmallow: checked },
                    })
                  }
                />
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
              <CardTitle>{tSubsidiary('hierarchicalSettings')}</CardTitle>
              <CardDescription>
                {tSubsidiary('hierarchicalSettingsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HierarchicalSettingsPanel
                scopeType="subsidiary"
                scopeId={subsidiaryId}
                scopeName={subsidiary.displayName}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Entity Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc('edit')} {editingEntity?.nameEn}</DialogTitle>
            <DialogDescription>
              {selectedEntityTypeInfo?.description}
            </DialogDescription>
          </DialogHeader>
          {editingEntity && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{tc('code')}</Label>
                <Input value={editingEntity.code} disabled />
              </div>
              <div className="space-y-2">
                <Label>{tSubsidiary('englishName')}</Label>
                <Input 
                  value={editingEntity.nameEn} 
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameEn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tSubsidiary('chineseName')}</Label>
                <Input 
                  value={editingEntity.nameZh} 
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameZh: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tSubsidiary('japaneseName')}</Label>
                <Input 
                  value={editingEntity.nameJa} 
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameJa: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSaveEntity}>
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
