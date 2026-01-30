// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    BookOpen,
    Building2,
    CheckCircle,
    Clock,
    Copy,
    Database,
    Edit,
    Languages,
    Layers,
    Lock,
    MoreHorizontal,
    Network,
    Plus,
    Save,
    Search,
    Settings,
    Shield,
    Trash2,
    XCircle
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AdapterManager } from '@/components/integration/AdapterManager';
import { WebhookManager } from '@/components/integration/WebhookManager';
import { BlocklistManager } from '@/components/security/BlocklistManager';
import { ExternalBlocklistManager } from '@/components/security/ExternalBlocklistManager';
import { IpRuleManager } from '@/components/security/IpRuleManager';
import { HierarchicalSettingsPanel } from '@/components/settings/HierarchicalSettingsPanel';
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
import { configEntityApi, dictionaryApi, tenantApi, profileStoreApi, piiServiceConfigApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

// Configuration Entity Types (using singular kebab-case format to match backend API)
const CONFIG_ENTITY_TYPES = [
  { 
    code: 'customer-status', 
    name: 'Customer Status',
    nameZh: '客户状态',
    description: 'Customer lifecycle status definitions',
    icon: '👤',
  },
  { 
    code: 'business-segment', 
    name: 'Business Segment',
    nameZh: '业务分类',
    description: 'Business segment definitions',
    icon: '📊',
  },
  { 
    code: 'reason-category', 
    name: 'Reason Category',
    nameZh: '原因分类',
    description: 'Reason category definitions',
    icon: '📋',
  },
  { 
    code: 'inactivation-reason', 
    name: 'Inactivation Reason',
    nameZh: '停用原因',
    description: 'Customer inactivation reasons',
    icon: '🚫',
  },
  { 
    code: 'membership-class', 
    name: 'Membership Class',
    nameZh: '会籍大类',
    description: 'Membership tier definitions',
    icon: '🎫',
  },
  { 
    code: 'membership-type', 
    name: 'Membership Type',
    nameZh: '会籍类型',
    description: 'Platform-specific membership types (e.g., YouTube, Bilibili)',
    icon: '🎭',
  },
  { 
    code: 'membership-level', 
    name: 'Membership Level',
    nameZh: '会籍级别',
    description: 'Tier levels within membership types (e.g., Captain, Admiral)',
    icon: '⭐',
  },
  { 
    code: 'consent', 
    name: 'Consent',
    nameZh: '同意声明',
    description: 'Customer consent definitions',
    icon: '✅',
  },
  { 
    code: 'blocklist-entry', 
    name: 'Blocklist Entry',
    nameZh: '屏蔽词条',
    description: 'Content blocklist patterns',
    icon: '🛡️',
  },
  { 
    code: 'profile-store', 
    name: 'Profile Store',
    nameZh: '档案存储库',
    description: 'Customer PII storage configuration',
    icon: '🔐',
  },
  { 
    code: 'pii-service-config', 
    name: 'PII Service Config',
    nameZh: 'PII服务配置',
    description: 'PII proxy service configuration',
    icon: '🔒',
  },
];

// Config entity base interface
interface ConfigEntityBase {
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

// Extended interface for membership type (has classId)
interface MembershipTypeEntity extends ConfigEntityBase {
  classId: string;
  className?: string;
}

// Extended interface for membership level (has classId and typeId)
interface MembershipLevelEntity extends ConfigEntityBase {
  classId: string;
  className?: string;
  typeId: string;
  typeName?: string;
  rank: number;
  color?: string;
}

// Extended interface for Profile Store
interface ProfileStoreEntity extends ConfigEntityBase {
  piiServiceConfig: {
    id: string;
    code: string;
    name: string;
    isHealthy: boolean;
  } | null;
  talentCount: number;
  customerCount: number;
  isDefault: boolean;
  version: number;
}

// Extended interface for PII Service Config
interface PiiServiceConfigEntity extends ConfigEntityBase {
  apiUrl: string;
  authType: 'mtls' | 'api_key';
  isHealthy: boolean;
  lastHealthCheckAt: string | null;
  profileStoreCount: number;
  version: number;
}

// Initial empty config entities (loaded from API)
const INITIAL_CONFIG_ENTITIES: Record<string, ConfigEntityBase[]> = {
  'customer-status': [],
  'business-segment': [],
  'reason-category': [],
  'inactivation-reason': [],
  'membership-class': [],
  'membership-type': [],
  'membership-level': [],
  'consent': [],
  'blocklist-entry': [],
};

// Initial empty membership data (loaded from API)
const INITIAL_MEMBERSHIP_TYPES: MembershipTypeEntity[] = [];
const INITIAL_MEMBERSHIP_LEVELS: MembershipLevelEntity[] = [];

// System Dictionary Types (counts are loaded from API)
const DICTIONARY_TYPES = [
  { code: 'countries', name: 'Countries/Regions', nameZh: '国家/地区', count: 0, icon: '🌍' },
  { code: 'languages', name: 'Languages', nameZh: '语言', count: 0, icon: '🗣️' },
  { code: 'timezones', name: 'Timezones', nameZh: '时区', count: 0, icon: '🕐' },
  { code: 'currencies', name: 'Currencies', nameZh: '货币', count: 0, icon: '💰' },
  { code: 'genders', name: 'Genders', nameZh: '性别', count: 0, icon: '⚧️' },
  { code: 'profile_types', name: 'Profile Types', nameZh: '档案类型', count: 0, icon: '📋' },
  { code: 'social_platforms', name: 'Social Platforms', nameZh: '社交平台', count: 0, icon: '📱' },
  { code: 'adapter_types', name: 'Adapter Types', nameZh: '适配器类型', count: 0, icon: '🔌' },
  { code: 'webhook_events', name: 'Webhook Events', nameZh: 'Webhook事件', count: 0, icon: '🔔' },
];

// Dictionary records are loaded from API - no mock data needed

interface TenantState {
  id: string;
  code: string;
  name: string;
  tier: 'standard' | 'premium' | 'enterprise';
  timezone: string;
  defaultLanguage: string;
  isActive: boolean;
  createdAt: string;
  features: {
    pii_encryption: boolean;
    totp_2fa: boolean;
    external_homepage: boolean;
    marshmallow: boolean;
  };
  stats?: {
    subsidiaryCount: number;
    talentCount: number;
    userCount: number;
  };
}

export default function TenantSettingsPage() {
  const params = useParams();
  const t = useTranslations('settingsPage');
  const te = useTranslations('errors');
  const tenantId = params.tenantId as string;

  const [activeTab, setActiveTab] = useState('details');
  const [tenant, setTenant] = useState<TenantState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, setIsLoadingConfig] = useState(false);
  const [, setIsLoadingDict] = useState(false);

  // Config Entity state
  const [selectedEntityType, setSelectedEntityType] = useState(CONFIG_ENTITY_TYPES[0].code);
  const [entitySearch, setEntitySearch] = useState('');
  const [configEntities, setConfigEntities] = useState<Record<string, ConfigEntityBase[]>>(INITIAL_CONFIG_ENTITIES);
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeEntity[]>(INITIAL_MEMBERSHIP_TYPES);
  const [membershipLevels, setMembershipLevels] = useState<MembershipLevelEntity[]>(INITIAL_MEMBERSHIP_LEVELS);
  const [profileStores, setProfileStores] = useState<ProfileStoreEntity[]>([]);
  const [piiServiceConfigs, setPiiServiceConfigs] = useState<PiiServiceConfigEntity[]>([]);
  
  // Add Entity Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntity, setNewEntity] = useState<Record<string, any>>({
    code: '',
    nameEn: '',
    nameZh: '',
    nameJa: '',
    // Membership fields
    classId: '',
    typeId: '',
    rank: 1,
    // Customer status fields
    color: '#808080',
    // Inactivation reason fields
    reasonCategoryId: '',
    // Membership type fields
    externalControl: false,
    defaultRenewalDays: 30,
    // Consent fields
    consentVersion: '1.0',
    effectiveFrom: '',
    expiresAt: '',
    contentUrl: '',
    isRequired: true,
    // Blocklist fields
    pattern: '',
    patternType: 'keyword',
    action: 'reject',
    replacement: '***',
    severity: 'medium',
    category: '',
    // Profile Store fields
    piiServiceConfigCode: '',
    isDefault: false,
    descriptionEn: '',
    // PII Service Config fields
    apiUrl: '',
    authType: 'api_key',
    apiKey: '',
    healthCheckUrl: '',
    healthCheckIntervalSec: 300,
  });
  
  // Edit Entity Dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);

  // Dictionary state
  const [selectedDictType, setSelectedDictType] = useState(DICTIONARY_TYPES[0].code);
  const [dictSearch, setDictSearch] = useState('');
  const [dictionaryRecords, setDictionaryRecords] = useState<Record<string, Array<{code: string; nameEn: string; nameZh: string; nameJa: string; isActive: boolean; extra?: Record<string, unknown>}>>>({});

  // Fetch config entities from API
  const fetchConfigEntities = useCallback(async (entityType: string) => {
    setIsLoadingConfig(true);
    try {
      // Special handling for profile-store which uses a dedicated API
      if (entityType === 'profile-store') {
        const response = await profileStoreApi.list({ pageSize: 100, includeInactive: true });
        if (response.success && response.data?.items) {
          setProfileStores(response.data.items.map((item: any) => ({
            id: item.id,
            code: item.code,
            nameEn: item.name || item.nameEn,
            nameZh: item.nameZh || '',
            nameJa: item.nameJa || '',
            ownerType: 'tenant' as const,
            ownerLevel: 'Tenant',
            isActive: item.isActive ?? true,
            isForceUse: false,
            isSystem: false,
            sortOrder: 0,
            piiServiceConfig: item.piiServiceConfig,
            talentCount: item.talentCount || 0,
            customerCount: item.customerCount || 0,
            isDefault: item.isDefault ?? false,
            version: item.version || 1,
          })));
        }
        setIsLoadingConfig(false);
        return;
      }
      
      // Special handling for pii-service-config which uses a dedicated API
      if (entityType === 'pii-service-config') {
        const response = await piiServiceConfigApi.list({ pageSize: 100, includeInactive: true });
        if (response.success && response.data?.items) {
          setPiiServiceConfigs(response.data.items.map((item: any) => ({
            id: item.id,
            code: item.code,
            nameEn: item.name || item.nameEn,
            nameZh: item.nameZh || '',
            nameJa: item.nameJa || '',
            ownerType: 'tenant' as const,
            ownerLevel: 'Tenant',
            isActive: item.isActive ?? true,
            isForceUse: false,
            isSystem: false,
            sortOrder: 0,
            apiUrl: item.apiUrl || '',
            authType: item.authType || 'api_key',
            isHealthy: item.isHealthy ?? false,
            lastHealthCheckAt: item.lastHealthCheckAt || null,
            profileStoreCount: item.profileStoreCount || 0,
            version: item.version || 1,
          })));
        }
        setIsLoadingConfig(false);
        return;
      }
      
      const response = await configEntityApi.list(entityType, {
        includeInherited: true,
        includeInactive: false,
        pageSize: 100,
      });
      if (response.success && response.data) {
        // Update the appropriate state based on entity type
        if (entityType === 'membership-type') {
          setMembershipTypes(response.data.map((item: any) => ({
            id: item.id,
            code: item.code,
            nameEn: item.nameEn || item.name_en,
            nameZh: item.nameZh || item.name_zh || '',
            nameJa: item.nameJa || item.name_ja || '',
            ownerType: item.ownerType || item.owner_type || 'tenant',
            ownerLevel: item.ownerLevel || 'Tenant',
            isActive: item.isActive ?? item.is_active ?? true,
            isForceUse: item.isForceUse ?? item.is_force_use ?? false,
            isSystem: item.isSystem ?? item.is_system ?? false,
            sortOrder: item.sortOrder ?? item.sort_order ?? 0,
            classId: item.classId || item.class_id || '',
            className: item.className || item.class_name,
          })));
        } else if (entityType === 'membership-level') {
          setMembershipLevels(response.data.map((item: any) => ({
            id: item.id,
            code: item.code,
            nameEn: item.nameEn || item.name_en,
            nameZh: item.nameZh || item.name_zh || '',
            nameJa: item.nameJa || item.name_ja || '',
            ownerType: item.ownerType || item.owner_type || 'tenant',
            ownerLevel: item.ownerLevel || 'Tenant',
            isActive: item.isActive ?? item.is_active ?? true,
            isForceUse: item.isForceUse ?? item.is_force_use ?? false,
            isSystem: item.isSystem ?? item.is_system ?? false,
            sortOrder: item.sortOrder ?? item.sort_order ?? 0,
            classId: item.classId || item.class_id || '',
            className: item.className || item.class_name,
            typeId: item.typeId || item.type_id || '',
            typeName: item.typeName || item.type_name,
            rank: item.rank || 0,
            color: item.color,
          })));
        } else {
          // General config entities
          const mappedEntities = response.data.map((item: any) => ({
            id: item.id,
            code: item.code,
            nameEn: item.nameEn || item.name_en,
            nameZh: item.nameZh || item.name_zh || '',
            nameJa: item.nameJa || item.name_ja || '',
            ownerType: item.ownerType || item.owner_type || 'tenant',
            ownerLevel: item.ownerLevel || 'Tenant',
            isActive: item.isActive ?? item.is_active ?? true,
            isForceUse: item.isForceUse ?? item.is_force_use ?? false,
            isSystem: item.isSystem ?? item.is_system ?? false,
            sortOrder: item.sortOrder ?? item.sort_order ?? 0,
          }));
          setConfigEntities(prev => ({
            ...prev,
            [entityType]: mappedEntities,
          }));
        }
      }
    } catch (_error) {
      // API may fail for new tenants without data - silently use empty state
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);
  
  // Fetch PII service configs for profile-store creation (uses same mapping as fetchConfigEntities)
  const fetchPiiServiceConfigs = useCallback(async () => {
    try {
      const response = await piiServiceConfigApi.list({ pageSize: 100, includeInactive: true });
      if (response.success && response.data?.items) {
        setPiiServiceConfigs(response.data.items.map((item: any) => ({
          id: item.id,
          code: item.code,
          nameEn: item.name || item.nameEn,
          nameZh: item.nameZh || '',
          nameJa: item.nameJa || '',
          ownerType: 'tenant' as const,
          ownerLevel: 'Tenant',
          isActive: item.isActive ?? true,
          isForceUse: false,
          isSystem: false,
          sortOrder: 0,
          apiUrl: item.apiUrl || '',
          authType: item.authType || 'api_key',
          isHealthy: item.isHealthy ?? false,
          lastHealthCheckAt: item.lastHealthCheckAt || null,
          profileStoreCount: item.profileStoreCount || 0,
          version: item.version || 1,
        })));
      }
    } catch (_error) {
      // Silently fail
    }
  }, []);

  // Fetch dictionary records from API
  const fetchDictionaryRecords = useCallback(async (dictType: string) => {
    setIsLoadingDict(true);
    try {
      const response = await dictionaryApi.getByType(dictType);
      if (response.success && response.data) {
        const data = response.data;
        setDictionaryRecords(prev => ({
          ...prev,
          [dictType]: data.map((item: any) => ({
            code: item.code,
            nameEn: item.nameEn || item.name_en || item.name,
            nameZh: item.nameZh || item.name_zh || '',
            nameJa: item.nameJa || item.name_ja || '',
            isActive: item.isActive ?? item.is_active ?? true,
            extra: item.extra,
          })),
        }));
      }
    } catch (_error) {
      // API may fail for new tenants without data - silently use empty state
    } finally {
      setIsLoadingDict(false);
    }
  }, []);

  // Fetch tenant details - AC tenants use tenantApi, normal tenants use auth store
  const fetchTenant = useCallback(async () => {
    const authState = useAuthStore.getState();
    const isAcTenant = authState.isAcTenant;

    if (isAcTenant) {
      // AC tenant can fetch any tenant's details
      try {
        const response = await tenantApi.get(tenantId);
        if (response.success && response.data) {
          const data = response.data;
          setTenant({
            id: data.id,
            code: data.code,
            name: data.name || data.displayName,
            tier: data.tier || 'standard',
            timezone: data.timezone || 'Asia/Tokyo',
            defaultLanguage: data.defaultLanguage || 'en',
            isActive: data.isActive ?? true,
            createdAt: data.createdAt,
            features: data.features || { pii_encryption: false, totp_2fa: false, external_homepage: false, marshmallow: false },
            stats: data.stats || { subsidiaryCount: 0, talentCount: 0, userCount: 0 },
          });
          return;
        }
      } catch (error) {
        console.error('Failed to fetch tenant (AC):', error);
      }
    }

    // For normal tenants, use auth store info with defaults
    setTenant({
      id: tenantId,
      code: authState.tenantCode || 'TENANT',
      name: authState.tenantCode || 'Current Tenant',
      tier: 'standard',
      timezone: 'Asia/Tokyo',
      defaultLanguage: 'en',
      isActive: true,
      createdAt: new Date().toISOString(),
      features: { pii_encryption: false, totp_2fa: false, external_homepage: false, marshmallow: false },
    });
  }, [tenantId]);

  // Load tenant data on mount
  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Load config entities when selected type changes
  useEffect(() => {
    const apiEntityType = selectedEntityType.replace(/_/g, '-');
    fetchConfigEntities(apiEntityType);
    
    // Pre-load membership-class when viewing membership-type or membership-level
    // (needed for the class selector dropdown in add dialog)
    if (apiEntityType === 'membership-type' || apiEntityType === 'membership-level') {
      fetchConfigEntities('membership-class');
    }
    // Pre-load membership-type when viewing membership-level
    // (needed for the type selector dropdown in add dialog)
    if (apiEntityType === 'membership-level') {
      fetchConfigEntities('membership-type');
    }
    // Pre-load reason-category when viewing inactivation-reason
    // (needed for the category selector dropdown in add dialog)
    if (apiEntityType === 'inactivation-reason') {
      fetchConfigEntities('reason-category');
    }
    // Pre-load PII service configs when viewing profile-store
    // (needed for the PII config selector dropdown in add dialog)
    if (apiEntityType === 'profile-store') {
      fetchPiiServiceConfigs();
    }
  }, [selectedEntityType, fetchConfigEntities, fetchPiiServiceConfigs]);

  // Load dictionary records when selected type changes
  useEffect(() => {
    fetchDictionaryRecords(selectedDictType);
  }, [selectedDictType, fetchDictionaryRecords]);

  const handleSave = async () => {
    if (!tenant) return;
    setIsSaving(true);
    const authState = useAuthStore.getState();
    
    try {
      if (authState.isAcTenant) {
        // AC tenant can update tenant settings via API
        await tenantApi.update(tenantId, {
          name: tenant.name,
          timezone: tenant.timezone,
          defaultLanguage: tenant.defaultLanguage,
        });
        toast.success(t('settingsSaved') || 'Settings saved successfully');
      } else {
        // Non-AC tenants cannot update tenant settings
        toast.info(t('settingsViewOnly') || 'Tenant settings are read-only for non-admin tenants');
      }
    } catch (error) {
      toast.error(t('settingsSaveFailed') || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Get entity count for each type
  const getEntityCount = (typeCode: string): number => {
    if (typeCode === 'membership-type') return membershipTypes.length;
    if (typeCode === 'membership-level') return membershipLevels.length;
    if (typeCode === 'profile-store') return profileStores.length;
    if (typeCode === 'pii-service-config') return piiServiceConfigs.length;
    return (configEntities[typeCode] || []).length;
  };

  // Filter config entities based on type
  const filteredEntities = useMemo(() => {
    let entities: ConfigEntityBase[] = [];
    
    if (selectedEntityType === 'membership-type') {
      entities = membershipTypes as ConfigEntityBase[];
    } else if (selectedEntityType === 'membership-level') {
      entities = membershipLevels as ConfigEntityBase[];
    } else if (selectedEntityType === 'profile-store') {
      entities = profileStores as ConfigEntityBase[];
    } else if (selectedEntityType === 'pii-service-config') {
      entities = piiServiceConfigs as ConfigEntityBase[];
    } else {
      entities = configEntities[selectedEntityType] || [];
    }
    
    if (!entitySearch) return entities;
    const search = entitySearch.toLowerCase();
    return entities.filter(e => 
      e.code.toLowerCase().includes(search) ||
      e.nameEn.toLowerCase().includes(search) ||
      e.nameZh.includes(search)
    );
  }, [selectedEntityType, entitySearch, configEntities, membershipTypes, membershipLevels, profileStores, piiServiceConfigs]);

  // Get selected entity type info
  const selectedEntityTypeInfo = CONFIG_ENTITY_TYPES.find(t => t.code === selectedEntityType);
  
  // Handle add entity
  const handleAddEntity = () => {
    setNewEntity({
      code: '',
      nameEn: '',
      nameZh: '',
      nameJa: '',
      // Membership fields
      classId: '',
      typeId: '',
      rank: 1,
      // Customer status fields
      color: '#808080',
      // Inactivation reason fields
      reasonCategoryId: '',
      // Membership type fields
      externalControl: false,
      defaultRenewalDays: 30,
      // Consent fields
      consentVersion: '1.0',
      effectiveFrom: '',
      expiresAt: '',
      contentUrl: '',
      isRequired: true,
      // Blocklist fields
      pattern: '',
      patternType: 'keyword',
      action: 'reject',
      replacement: '***',
      severity: 'medium',
      category: '',
      // Profile Store fields
      piiServiceConfigCode: '',
      isDefault: false,
      descriptionEn: '',
      // PII Service Config fields
      apiUrl: '',
      authType: 'api_key',
      apiKey: '',
      healthCheckUrl: '',
      healthCheckIntervalSec: 300,
    });
    setShowAddDialog(true);
  };
  
  // Helper to get translated error message from API error
  const getErrorMessage = useCallback((error: any): string => {
    const errorCode = error?.code;
    if (errorCode && typeof errorCode === 'string') {
      try {
        const translated = te(errorCode as any);
        if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
          return translated;
        }
      } catch {
        // Fall through
      }
    }
    return error?.message || te('generic');
  }, [te]);

  const handleSaveNewEntity = async () => {
    // Validate base required fields (blocklist-entry uses pattern instead of code)
    if (selectedEntityType === 'blocklist-entry') {
      if (!newEntity.pattern || !newEntity.nameEn) {
        toast.error(te('VALIDATION_FIELD_REQUIRED'));
        return;
      }
    } else {
      if (!newEntity.code || !newEntity.nameEn) {
        toast.error(te('VALIDATION_FIELD_REQUIRED'));
        return;
      }
    }
    
    // Validate required fields for specific entity types
    if (selectedEntityType === 'membership-type' && !newEntity.classId) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    if (selectedEntityType === 'membership-level' && (!newEntity.classId || !newEntity.typeId)) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    if (selectedEntityType === 'inactivation-reason' && !newEntity.reasonCategoryId) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    if (selectedEntityType === 'consent' && !newEntity.consentVersion) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    // Note: piiServiceConfigCode is optional for profile-store (local-only mode)
    if (selectedEntityType === 'pii-service-config' && !newEntity.apiUrl) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    
    try {
      // Special handling for pii-service-config which uses dedicated API
      if (selectedEntityType === 'pii-service-config') {
        const response = await piiServiceConfigApi.create({
          code: newEntity.code.toUpperCase().replace(/\s+/g, '_'),
          nameEn: newEntity.nameEn,
          nameZh: newEntity.nameZh || undefined,
          nameJa: newEntity.nameJa || undefined,
          descriptionEn: newEntity.descriptionEn || undefined,
          apiUrl: newEntity.apiUrl,
          authType: newEntity.authType || 'api_key',
          apiKey: newEntity.apiKey || undefined,
          healthCheckUrl: newEntity.healthCheckUrl || undefined,
          healthCheckIntervalSec: newEntity.healthCheckIntervalSec || 300,
        });
        
        if (response.success) {
          await fetchConfigEntities('pii-service-config');
          setShowAddDialog(false);
          toast.success(t('entityAdded'));
        } else {
          toast.error(getErrorMessage(response.error));
        }
        return;
      }
      
      // Special handling for profile-store which uses dedicated API
      if (selectedEntityType === 'profile-store') {
        const response = await profileStoreApi.create({
          code: newEntity.code.toUpperCase().replace(/\s+/g, '_'),
          nameEn: newEntity.nameEn,
          nameZh: newEntity.nameZh || undefined,
          nameJa: newEntity.nameJa || undefined,
          descriptionEn: newEntity.descriptionEn || undefined,
          // piiServiceConfigCode is optional - only send if a valid value is selected
          piiServiceConfigCode: newEntity.piiServiceConfigCode && newEntity.piiServiceConfigCode !== '_none' 
            ? newEntity.piiServiceConfigCode 
            : undefined,
          isDefault: newEntity.isDefault || false,
        });
        
        if (response.success) {
          await fetchConfigEntities('profile-store');
          setShowAddDialog(false);
          toast.success(t('entityAdded'));
        } else {
          toast.error(getErrorMessage(response.error));
        }
        return;
      }
      
      // Build the data for API call based on entity type
      const apiData: Record<string, unknown> = {};
      
      // Base fields (code and names) - blocklist-entry is special
      if (selectedEntityType !== 'blocklist-entry') {
        apiData.code = newEntity.code.toUpperCase().replace(/\s+/g, '_');
      }
      apiData.nameEn = newEntity.nameEn;
      apiData.nameZh = newEntity.nameZh || undefined;
      apiData.nameJa = newEntity.nameJa || undefined;
      
      // Add extra fields based on entity type
      switch (selectedEntityType) {
        case 'customer-status':
          apiData.color = newEntity.color || '#808080';
          break;
        
        case 'inactivation-reason':
          apiData.reasonCategoryId = newEntity.reasonCategoryId;
          break;
        
        case 'membership-type':
          // Backend expects membershipClassId (from membership_class_id via snakeToCamel)
          apiData.membershipClassId = newEntity.classId;
          apiData.externalControl = newEntity.externalControl || false;
          apiData.defaultRenewalDays = newEntity.defaultRenewalDays || 30;
          break;
        
        case 'membership-level':
          // Backend expects membershipTypeId (from membership_type_id via snakeToCamel)
          apiData.membershipTypeId = newEntity.typeId;
          apiData.rank = newEntity.rank || membershipLevels.filter(l => l.typeId === newEntity.typeId).length + 1;
          if (newEntity.color) apiData.color = newEntity.color;
          break;
        
        case 'consent':
          apiData.consentVersion = newEntity.consentVersion;
          if (newEntity.effectiveFrom) apiData.effectiveFrom = newEntity.effectiveFrom;
          if (newEntity.expiresAt) apiData.expiresAt = newEntity.expiresAt;
          if (newEntity.contentUrl) apiData.contentUrl = newEntity.contentUrl;
          apiData.isRequired = newEntity.isRequired ?? true;
          break;
        
        case 'blocklist-entry':
          apiData.pattern = newEntity.pattern;
          apiData.patternType = newEntity.patternType || 'keyword';
          apiData.action = newEntity.action || 'reject';
          apiData.replacement = newEntity.replacement || '***';
          apiData.severity = newEntity.severity || 'medium';
          if (newEntity.category) apiData.category = newEntity.category;
          break;
      }
      
      // Call the API
      const response = await configEntityApi.create(selectedEntityType, apiData as any);
      
      if (response.success) {
        // Refresh the list
        await fetchConfigEntities(selectedEntityType);
        setShowAddDialog(false);
        toast.success(t('entityAdded'));
      } else {
        toast.error(getErrorMessage(response.error));
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };
  
  // Get available types for a class (for membership level creation)
  const getTypesForClass = (classId: string): MembershipTypeEntity[] => {
    return membershipTypes.filter(t => t.classId === classId);
  };

  // Handle toggle entity active status
  const handleToggleEntityActive = async (entity: ConfigEntityBase) => {
    try {
      // Special handling for profile-store which uses dedicated API
      if (selectedEntityType === 'profile-store') {
        const profileStore = entity as ProfileStoreEntity;
        
        // Check if trying to deactivate a store with customers
        if (entity.isActive && profileStore.customerCount > 0) {
          toast.error(`Cannot deactivate profile store with ${profileStore.customerCount} customers`);
          return;
        }
        
        const response = await profileStoreApi.update(entity.id, {
          isActive: !entity.isActive,
          version: profileStore.version,
        });
        
        if (response.success) {
          await fetchConfigEntities('profile-store');
          toast.success(entity.isActive ? t('entityDeactivated') : t('entityActivated'));
        } else {
          toast.error(getErrorMessage(response.error));
        }
        return;
      }
      
      // Special handling for pii-service-config which uses dedicated API
      if (selectedEntityType === 'pii-service-config') {
        const piiConfig = entity as PiiServiceConfigEntity;
        
        // Check if trying to deactivate a config with profile stores
        if (entity.isActive && piiConfig.profileStoreCount > 0) {
          toast.error(`Cannot deactivate PII service config with ${piiConfig.profileStoreCount} profile stores`);
          return;
        }
        
        const response = await piiServiceConfigApi.update(entity.id, {
          isActive: !entity.isActive,
          version: piiConfig.version,
        });
        
        if (response.success) {
          await fetchConfigEntities('pii-service-config');
          toast.success(entity.isActive ? t('entityDeactivated') : t('entityActivated'));
        } else {
          toast.error(getErrorMessage(response.error));
        }
        return;
      }
      
      const response = await configEntityApi.update(selectedEntityType, entity.id, {
        isActive: !entity.isActive,
        version: (entity as any).version || 1,
      });
      
      if (response.success) {
        // Refresh the list
        await fetchConfigEntities(selectedEntityType);
        toast.success(entity.isActive ? t('entityDeactivated') : t('entityActivated'));
      } else {
        toast.error(getErrorMessage(response.error));
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };
  
  // Handle edit entity
  const handleEditEntity = async (entity: ConfigEntityBase) => {
    // For profile-store, fetch full details including PII config
    if (selectedEntityType === 'profile-store') {
      try {
        const response = await profileStoreApi.get(entity.id);
        if (response.success && response.data) {
          setEditingEntity({
            ...response.data,
            nameEn: response.data.name || response.data.nameEn,
            piiServiceConfigCode: response.data.piiServiceConfig?.code || '',
          });
          setShowEditDialog(true);
        }
      } catch (error: any) {
        toast.error(getErrorMessage(error));
      }
      return;
    }
    
    // For pii-service-config, fetch full details
    if (selectedEntityType === 'pii-service-config') {
      try {
        const response = await piiServiceConfigApi.get(entity.id);
        if (response.success && response.data) {
          setEditingEntity({
            ...response.data,
            nameEn: response.data.name || response.data.nameEn,
            descriptionEn: response.data.description || response.data.descriptionEn,
          });
          setShowEditDialog(true);
        }
      } catch (error: any) {
        toast.error(getErrorMessage(error));
      }
      return;
    }
    
    // For other entity types, use basic data
    setEditingEntity(entity);
    setShowEditDialog(true);
  };
  
  // Handle save edited entity
  const handleSaveEditedEntity = async () => {
    if (!editingEntity) return;
    
    try {
      // Special handling for profile-store
      if (selectedEntityType === 'profile-store') {
        const response = await profileStoreApi.update(editingEntity.id, {
          nameEn: editingEntity.nameEn,
          nameZh: editingEntity.nameZh || undefined,
          nameJa: editingEntity.nameJa || undefined,
          descriptionEn: editingEntity.descriptionEn || undefined,
          descriptionZh: editingEntity.descriptionZh || undefined,
          descriptionJa: editingEntity.descriptionJa || undefined,
          piiServiceConfigCode: editingEntity.piiServiceConfigCode || undefined,
          isDefault: editingEntity.isDefault,
          version: editingEntity.version,
        });
        
        if (response.success) {
          await fetchConfigEntities('profile-store');
          setShowEditDialog(false);
          setEditingEntity(null);
          toast.success(t('entityUpdated') || 'Entity updated');
        } else {
          toast.error(getErrorMessage(response.error));
        }
        return;
      }
      
      // Special handling for pii-service-config
      if (selectedEntityType === 'pii-service-config') {
        const response = await piiServiceConfigApi.update(editingEntity.id, {
          nameEn: editingEntity.nameEn,
          nameZh: editingEntity.nameZh || undefined,
          nameJa: editingEntity.nameJa || undefined,
          descriptionEn: editingEntity.descriptionEn || undefined,
          apiUrl: editingEntity.apiUrl || undefined,
          authType: editingEntity.authType || undefined,
          apiKey: editingEntity.apiKey || undefined,
          healthCheckUrl: editingEntity.healthCheckUrl || undefined,
          healthCheckIntervalSec: editingEntity.healthCheckIntervalSec || undefined,
          version: editingEntity.version,
        });
        
        if (response.success) {
          await fetchConfigEntities('pii-service-config');
          setShowEditDialog(false);
          setEditingEntity(null);
          toast.success(t('entityUpdated') || 'Entity updated');
        } else {
          toast.error(getErrorMessage(response.error));
        }
        return;
      }
      
      // For other entity types
      const response = await configEntityApi.update(selectedEntityType, editingEntity.id, {
        nameEn: editingEntity.nameEn,
        nameZh: editingEntity.nameZh || undefined,
        nameJa: editingEntity.nameJa || undefined,
        version: editingEntity.version || 1,
      });
      
      if (response.success) {
        await fetchConfigEntities(selectedEntityType);
        setShowEditDialog(false);
        setEditingEntity(null);
        toast.success(t('entityUpdated') || 'Entity updated');
      } else {
        toast.error(getErrorMessage(response.error));
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

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
  }, [selectedDictType, dictSearch]);

  const selectedDictInfo = DICTIONARY_TYPES.find(t => t.code === selectedDictType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Building2 size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tenant?.name || 'Loading...'}</h1>
            <p className="text-muted-foreground">{t('tenantSettings')}</p>
          </div>
        </div>
        <Badge variant={tenant?.isActive ? 'default' : 'secondary'}>
          {tenant?.tier?.toUpperCase() || 'STANDARD'}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="details">
            <Building2 size={14} className="mr-2" />
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
          <TabsTrigger value="integration">
            <Network size={14} className="mr-2" />
            {t('integration') || 'Integration'}
          </TabsTrigger>
          <TabsTrigger value="scope">
            <Layers size={14} className="mr-2" />
            Scope Settings
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Information</CardTitle>
              <CardDescription>Basic tenant configuration and details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tenant?.stats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                    <div className="text-2xl font-bold">{tenant.stats.subsidiaryCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                      Subsidiaries
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20">
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{tenant.stats.talentCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                      Talents
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tenant.stats.userCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                      Users
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Tenant Code</Label>
                  <Input value={tenant?.code || ''} disabled />
                  <p className="text-xs text-muted-foreground">Cannot be changed after creation</p>
                </div>
                <div className="space-y-2">
                  <Label>Tenant Name</Label>
                  <Input
                    value={tenant?.name || ''}
                    onChange={(e) => tenant && setTenant({ ...tenant, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock size={14} /> Timezone
                  </Label>
                  <Select
                    value={tenant?.timezone || 'UTC'}
                    onValueChange={(value) => tenant && setTenant({ ...tenant, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Languages size={14} /> Default Language
                  </Label>
                  <Select
                    value={tenant?.defaultLanguage || 'en'}
                    onValueChange={(value) => tenant && setTenant({ ...tenant, defaultLanguage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh">Chinese (Simplified)</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save size={16} className="mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
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
                <CardTitle className="text-base">Entity Types</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-420px)]">
                  <div className="space-y-1">
                    {CONFIG_ENTITY_TYPES.map((type) => {
                      const count = getEntityCount(type.code);
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
                  <Button onClick={handleAddEntity}>
                    <Plus size={16} className="mr-2" />
                    Add Record
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Code</TableHead>
                        <TableHead>Name</TableHead>
                        {selectedEntityType === 'membership-type' && (
                          <TableHead className="w-[120px]">Class</TableHead>
                        )}
                        {selectedEntityType === 'membership-level' && (
                          <>
                            <TableHead className="w-[100px]">Class</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                            <TableHead className="w-[60px]">Rank</TableHead>
                          </>
                        )}
                        {selectedEntityType === 'profile-store' && (
                          <>
                            <TableHead className="w-[150px]">PII Service</TableHead>
                            <TableHead className="w-[80px]">Talents</TableHead>
                            <TableHead className="w-[80px]">Customers</TableHead>
                          </>
                        )}
                        {selectedEntityType === 'pii-service-config' && (
                          <>
                            <TableHead className="w-[200px]">API URL</TableHead>
                            <TableHead className="w-[80px]">Auth</TableHead>
                            <TableHead className="w-[80px]">Health</TableHead>
                            <TableHead className="w-[80px]">Stores</TableHead>
                          </>
                        )}
                        <TableHead className="w-[80px]">Status</TableHead>
                        <TableHead className="w-[100px]">Force Use</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={selectedEntityType === 'membership-level' ? 9 : selectedEntityType === 'membership-type' ? 7 : selectedEntityType === 'profile-store' ? 9 : selectedEntityType === 'pii-service-config' ? 10 : 6} className="text-center py-8 text-muted-foreground">
                            No records found. Click "Add Record" to create one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntities.map((entity) => {
                          const membershipType = selectedEntityType === 'membership-type' ? entity as unknown as MembershipTypeEntity : null;
                          const membershipLevel = selectedEntityType === 'membership-level' ? entity as unknown as MembershipLevelEntity : null;
                          const profileStore = selectedEntityType === 'profile-store' ? entity as unknown as ProfileStoreEntity : null;
                          
                          return (
                            <TableRow key={entity.id} className="group">
                              <TableCell className="font-mono text-sm">
                                <div className="flex items-center gap-2">
                                  {entity.code}
                                  {entity.isSystem && (
                                    <Lock size={12} className="text-muted-foreground" />
                                  )}
                                  {profileStore?.isDefault && (
                                    <Badge variant="secondary" className="text-xs">Default</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{entity.nameEn}</p>
                                  <p className="text-xs text-muted-foreground">{entity.nameZh}</p>
                                </div>
                              </TableCell>
                              {selectedEntityType === 'membership-type' && membershipType && (
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {membershipType.className || membershipType.classId}
                                  </Badge>
                                </TableCell>
                              )}
                              {selectedEntityType === 'membership-level' && membershipLevel && (
                                <>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {membershipLevel.className || membershipLevel.classId}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                      {membershipLevel.typeName || membershipLevel.typeId}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      className="text-xs"
                                      style={{ backgroundColor: membershipLevel.color || '#888' }}
                                    >
                                      #{membershipLevel.rank}
                                    </Badge>
                                  </TableCell>
                                </>
                              )}
                              {selectedEntityType === 'profile-store' && profileStore && (
                                <>
                                  <TableCell>
                                    {profileStore.piiServiceConfig ? (
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant={profileStore.piiServiceConfig.isHealthy ? 'default' : 'destructive'} 
                                          className="text-xs"
                                        >
                                          {profileStore.piiServiceConfig.code}
                                        </Badge>
                                        {profileStore.piiServiceConfig.isHealthy ? (
                                          <CheckCircle size={12} className="text-green-500" />
                                        ) : (
                                          <XCircle size={12} className="text-red-500" />
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        Not configured
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{profileStore.talentCount}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{profileStore.customerCount}</span>
                                  </TableCell>
                                </>
                              )}
                              {selectedEntityType === 'pii-service-config' && (entity as PiiServiceConfigEntity) && (
                                <>
                                  <TableCell>
                                    <span className="text-xs font-mono truncate max-w-[180px] block" title={(entity as PiiServiceConfigEntity).apiUrl}>
                                      {(entity as PiiServiceConfigEntity).apiUrl}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {(entity as PiiServiceConfigEntity).authType === 'mtls' ? 'mTLS' : 'API Key'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {(entity as PiiServiceConfigEntity).isHealthy ? (
                                      <CheckCircle size={16} className="text-green-500" />
                                    ) : (
                                      <XCircle size={16} className="text-red-500" />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{(entity as PiiServiceConfigEntity).profileStoreCount}</span>
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                                  {entity.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Switch checked={entity.isForceUse} disabled={entity.isSystem} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {/* Quick toggle active status */}
                                  {!entity.isSystem && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 h-7 px-2 text-xs"
                                      onClick={() => handleToggleEntityActive(entity)}
                                    >
                                      {entity.isActive ? (
                                        <>
                                          <XCircle size={14} className="mr-1 text-orange-500" />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle size={14} className="mr-1 text-green-500" />
                                          Activate
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 h-7 w-7"
                                      >
                                        <MoreHorizontal size={14} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        disabled={entity.isSystem}
                                        onClick={() => handleEditEntity(entity)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
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
                <CardTitle className="text-base">Dictionary Types</CardTitle>
                <CardDescription className="text-xs">
                  System-wide reference data
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
                          {dictionaryRecords[type.code]?.length || 0}
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
                      System dictionary - Read only. These values are shared across all tenants.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    <Lock size={12} className="mr-1" />
                    Read Only
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
                  {filteredDictRecords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No records found for this dictionary type.</p>
                      <p className="text-sm mt-1">This dictionary contains {selectedDictInfo?.count} system entries.</p>
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
                                <Badge variant="default" className="text-xs">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
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

        {/* Security Tab - Blocklist, IP Rules, External Blocklist */}
        <TabsContent value="security" className="mt-6">
          <div className="space-y-8">
            {/* System Blocklist (Internal content filtering) */}
            <BlocklistManager scopeType="tenant" />
            
            {/* IP Access Rules */}
            <IpRuleManager />
            
            {/* External Blocklist (URL/Domain filtering for Marshmallow) */}
            <ExternalBlocklistManager scopeType="tenant" />
          </div>
        </TabsContent>

        {/* Integration Tab - Adapters and Webhooks */}
        <TabsContent value="integration" className="mt-6">
          <div className="space-y-6">
            <AdapterManager ownerType="tenant" />
            <WebhookManager />
          </div>
        </TabsContent>

        {/* Scope Settings Tab - Hierarchical Settings with Inheritance */}
        <TabsContent value="scope" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hierarchical Settings</CardTitle>
              <CardDescription>
                Configure settings that can be inherited by subsidiaries and talents.
                Settings defined here will serve as defaults for all child entities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HierarchicalSettingsPanel
                scopeType="tenant"
                scopeName={tenant?.name}
              />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Add Entity Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add {selectedEntityTypeInfo?.name}</DialogTitle>
            <DialogDescription>
              Create a new {selectedEntityTypeInfo?.name?.toLowerCase()} record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Code field - not for blocklist-entry */}
            {selectedEntityType !== 'blocklist-entry' && (
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={newEntity.code}
                  onChange={(e) => setNewEntity({ ...newEntity, code: e.target.value })}
                  placeholder="e.g., MY_CODE"
                />
                <p className="text-xs text-muted-foreground">Uppercase letters, numbers, and underscores only</p>
              </div>
            )}
            
            {/* Pattern field - for blocklist-entry */}
            {selectedEntityType === 'blocklist-entry' && (
              <div className="space-y-2">
                <Label>Pattern *</Label>
                <Input
                  value={newEntity.pattern}
                  onChange={(e) => setNewEntity({ ...newEntity, pattern: e.target.value })}
                  placeholder="e.g., bad_word or regex pattern"
                />
                <p className="text-xs text-muted-foreground">The pattern to match against content</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>English Name *</Label>
              <Input
                value={newEntity.nameEn}
                onChange={(e) => setNewEntity({ ...newEntity, nameEn: e.target.value })}
                placeholder="English name"
              />
            </div>
            <div className="space-y-2">
              <Label>Chinese Name</Label>
              <Input
                value={newEntity.nameZh}
                onChange={(e) => setNewEntity({ ...newEntity, nameZh: e.target.value })}
                placeholder="中文名称"
              />
            </div>
            <div className="space-y-2">
              <Label>Japanese Name</Label>
              <Input
                value={newEntity.nameJa}
                onChange={(e) => setNewEntity({ ...newEntity, nameJa: e.target.value })}
                placeholder="日本語名"
              />
            </div>
            
            {/* Customer Status: Color field */}
            {selectedEntityType === 'customer-status' && (
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={newEntity.color}
                    onChange={(e) => setNewEntity({ ...newEntity, color: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={newEntity.color}
                    onChange={(e) => setNewEntity({ ...newEntity, color: e.target.value })}
                    placeholder="#808080"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Status badge color (hex format)</p>
              </div>
            )}
            
            {/* Inactivation Reason: Reason Category selector */}
            {selectedEntityType === 'inactivation-reason' && (
              <div className="space-y-2">
                <Label>Reason Category *</Label>
                <Select
                  value={newEntity.reasonCategoryId}
                  onValueChange={(value) => setNewEntity({ ...newEntity, reasonCategoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason category" />
                  </SelectTrigger>
                  <SelectContent>
                    {configEntities['reason-category'].map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nameEn} ({cat.nameZh})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Membership Type: Class selector and extra fields */}
            {selectedEntityType === 'membership-type' && (
              <>
                <div className="space-y-2">
                  <Label>Membership Class *</Label>
                  <Select
                    value={newEntity.classId}
                    onValueChange={(value) => setNewEntity({ ...newEntity, classId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {configEntities['membership-class'].map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.nameEn} ({cls.nameZh})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Renewal Days</Label>
                  <Input
                    type="number"
                    value={newEntity.defaultRenewalDays}
                    onChange={(e) => setNewEntity({ ...newEntity, defaultRenewalDays: parseInt(e.target.value) || 30 })}
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground">Days until membership renewal reminder</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>External Control</Label>
                    <p className="text-xs text-muted-foreground">Managed by external integration</p>
                  </div>
                  <Switch
                    checked={newEntity.externalControl}
                    onCheckedChange={(checked) => setNewEntity({ ...newEntity, externalControl: checked })}
                  />
                </div>
              </>
            )}
            
            {/* Membership Level: Class, Type selectors and extra fields */}
            {selectedEntityType === 'membership-level' && (
              <>
                <div className="space-y-2">
                  <Label>Membership Class *</Label>
                  <Select
                    value={newEntity.classId}
                    onValueChange={(value) => setNewEntity({ ...newEntity, classId: value, typeId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {configEntities['membership-class'].map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.nameEn} ({cls.nameZh})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Membership Type *</Label>
                  <Select
                    value={newEntity.typeId}
                    onValueChange={(value) => setNewEntity({ ...newEntity, typeId: value })}
                    disabled={!newEntity.classId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={newEntity.classId ? "Select a type" : "Select class first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getTypesForClass(newEntity.classId).map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.nameEn} ({type.nameZh})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rank</Label>
                  <Input
                    type="number"
                    value={newEntity.rank}
                    onChange={(e) => setNewEntity({ ...newEntity, rank: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                  <p className="text-xs text-muted-foreground">Tier ranking order (higher = better)</p>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={newEntity.color || '#888888'}
                      onChange={(e) => setNewEntity({ ...newEntity, color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={newEntity.color || ''}
                      onChange={(e) => setNewEntity({ ...newEntity, color: e.target.value })}
                      placeholder="#888888"
                      className="flex-1"
                    />
                  </div>
                </div>
              </>
            )}
            
            {/* Consent: Version and date fields */}
            {selectedEntityType === 'consent' && (
              <>
                <div className="space-y-2">
                  <Label>Consent Version *</Label>
                  <Input
                    value={newEntity.consentVersion}
                    onChange={(e) => setNewEntity({ ...newEntity, consentVersion: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={newEntity.effectiveFrom}
                    onChange={(e) => setNewEntity({ ...newEntity, effectiveFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Input
                    type="date"
                    value={newEntity.expiresAt}
                    onChange={(e) => setNewEntity({ ...newEntity, expiresAt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content URL</Label>
                  <Input
                    value={newEntity.contentUrl}
                    onChange={(e) => setNewEntity({ ...newEntity, contentUrl: e.target.value })}
                    placeholder="https://example.com/consent"
                  />
                  <p className="text-xs text-muted-foreground">Link to full consent document</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Required</Label>
                    <p className="text-xs text-muted-foreground">Must be agreed to</p>
                  </div>
                  <Switch
                    checked={newEntity.isRequired}
                    onCheckedChange={(checked) => setNewEntity({ ...newEntity, isRequired: checked })}
                  />
                </div>
              </>
            )}
            
            {/* Blocklist Entry: Pattern type, action, severity */}
            {selectedEntityType === 'blocklist-entry' && (
              <>
                <div className="space-y-2">
                  <Label>Pattern Type</Label>
                  <Select
                    value={newEntity.patternType}
                    onValueChange={(value) => setNewEntity({ ...newEntity, patternType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Keyword</SelectItem>
                      <SelectItem value="regex">Regex</SelectItem>
                      <SelectItem value="wildcard">Wildcard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={newEntity.action}
                    onValueChange={(value) => setNewEntity({ ...newEntity, action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reject">Reject</SelectItem>
                      <SelectItem value="flag">Flag</SelectItem>
                      <SelectItem value="replace">Replace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={newEntity.severity}
                    onValueChange={(value) => setNewEntity({ ...newEntity, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newEntity.action === 'replace' && (
                  <div className="space-y-2">
                    <Label>Replacement Text</Label>
                    <Input
                      value={newEntity.replacement}
                      onChange={(e) => setNewEntity({ ...newEntity, replacement: e.target.value })}
                      placeholder="***"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={newEntity.category}
                    onChange={(e) => setNewEntity({ ...newEntity, category: e.target.value })}
                    placeholder="e.g., profanity, spam"
                  />
                </div>
              </>
            )}
            
            {/* Profile Store: PII Service Config selector (optional) */}
            {selectedEntityType === 'profile-store' && (
              <>
                <div className="space-y-2">
                  <Label>PII Service Config</Label>
                  <Select
                    value={newEntity.piiServiceConfigCode || '_none'}
                    onValueChange={(value) => setNewEntity({ ...newEntity, piiServiceConfigCode: value === '_none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a PII service config" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Database size={12} />
                          None (Local Only)
                        </div>
                      </SelectItem>
                      {piiServiceConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.code}>
                          <div className="flex items-center gap-2">
                            {config.nameEn} ({config.code})
                            {config.isHealthy ? (
                              <CheckCircle size={12} className="text-green-500" />
                            ) : (
                              <XCircle size={12} className="text-red-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">PII proxy service for customer data encryption (optional for local-only stores)</p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newEntity.descriptionEn}
                    onChange={(e) => setNewEntity({ ...newEntity, descriptionEn: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Set as Default</Label>
                    <p className="text-xs text-muted-foreground">Use this store for new talents</p>
                  </div>
                  <Switch
                    checked={newEntity.isDefault}
                    onCheckedChange={(checked) => setNewEntity({ ...newEntity, isDefault: checked })}
                  />
                </div>
              </>
            )}
            
            {/* PII Service Config fields */}
            {selectedEntityType === 'pii-service-config' && (
              <>
                <div className="space-y-2">
                  <Label>API URL *</Label>
                  <Input
                    value={newEntity.apiUrl}
                    onChange={(e) => setNewEntity({ ...newEntity, apiUrl: e.target.value })}
                    placeholder="https://pii-proxy.example.com/api"
                  />
                  <p className="text-xs text-muted-foreground">The base URL of the PII proxy service</p>
                </div>
                <div className="space-y-2">
                  <Label>Authentication Type</Label>
                  <Select
                    value={newEntity.authType}
                    onValueChange={(value) => setNewEntity({ ...newEntity, authType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="mtls">mTLS (Mutual TLS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newEntity.authType === 'api_key' && (
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={newEntity.apiKey}
                      onChange={(e) => setNewEntity({ ...newEntity, apiKey: e.target.value })}
                      placeholder="Enter API key"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Health Check URL</Label>
                  <Input
                    value={newEntity.healthCheckUrl}
                    onChange={(e) => setNewEntity({ ...newEntity, healthCheckUrl: e.target.value })}
                    placeholder="https://pii-proxy.example.com/health"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Health Check Interval (seconds)</Label>
                  <Input
                    type="number"
                    value={newEntity.healthCheckIntervalSec}
                    onChange={(e) => setNewEntity({ ...newEntity, healthCheckIntervalSec: parseInt(e.target.value) || 300 })}
                    min={10}
                    max={3600}
                    placeholder="300"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newEntity.descriptionEn}
                    onChange={(e) => setNewEntity({ ...newEntity, descriptionEn: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewEntity}>
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Entity Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {selectedEntityTypeInfo?.name}</DialogTitle>
            <DialogDescription>
              Update the {selectedEntityTypeInfo?.name?.toLowerCase()} record.
            </DialogDescription>
          </DialogHeader>
          {editingEntity && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={editingEntity.code}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>
              </div>
              <div className="space-y-2">
                <Label>English Name *</Label>
                <Input
                  value={editingEntity.nameEn || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameEn: e.target.value })}
                  placeholder="English name"
                />
              </div>
              <div className="space-y-2">
                <Label>Chinese Name</Label>
                <Input
                  value={editingEntity.nameZh || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameZh: e.target.value })}
                  placeholder="中文名称"
                />
              </div>
              <div className="space-y-2">
                <Label>Japanese Name</Label>
                <Input
                  value={editingEntity.nameJa || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameJa: e.target.value })}
                  placeholder="日本語名"
                />
              </div>
              
              {/* Profile Store specific fields */}
              {selectedEntityType === 'profile-store' && (
                <>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={editingEntity.description || editingEntity.descriptionEn || ''}
                      onChange={(e) => setEditingEntity({ ...editingEntity, descriptionEn: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PII Service Config</Label>
                    <Select
                      value={editingEntity.piiServiceConfigCode || ''}
                      onValueChange={(value) => setEditingEntity({ ...editingEntity, piiServiceConfigCode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a PII service config" />
                      </SelectTrigger>
                      <SelectContent>
                        {piiServiceConfigs.map((config) => (
                          <SelectItem key={config.id} value={config.code}>
                            <div className="flex items-center gap-2">
                              {config.nameEn} ({config.code})
                              {config.isHealthy ? (
                                <CheckCircle size={12} className="text-green-500" />
                              ) : (
                                <XCircle size={12} className="text-red-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Current: {editingEntity.piiServiceConfig?.name || editingEntity.piiServiceConfig?.code || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Set as Default</Label>
                      <p className="text-xs text-muted-foreground">Use this store for new talents</p>
                    </div>
                    <Switch
                      checked={editingEntity.isDefault || false}
                      onCheckedChange={(checked) => setEditingEntity({ ...editingEntity, isDefault: checked })}
                    />
                  </div>
                  {(editingEntity.talentCount > 0 || editingEntity.customerCount > 0) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                      <p className="text-amber-600 dark:text-amber-400">
                        This profile store has {editingEntity.talentCount} talent(s) and {editingEntity.customerCount} customer(s).
                      </p>
                    </div>
                  )}
                </>
              )}
              
              {/* PII Service Config specific fields */}
              {selectedEntityType === 'pii-service-config' && (
                <>
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <Input
                      value={editingEntity.apiUrl || ''}
                      onChange={(e) => setEditingEntity({ ...editingEntity, apiUrl: e.target.value })}
                      placeholder="https://pii-proxy.example.com/api"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Authentication Type</Label>
                    <Select
                      value={editingEntity.authType || 'api_key'}
                      onValueChange={(value) => setEditingEntity({ ...editingEntity, authType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="mtls">mTLS (Mutual TLS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingEntity.authType === 'api_key' && (
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={editingEntity.apiKey || ''}
                        onChange={(e) => setEditingEntity({ ...editingEntity, apiKey: e.target.value })}
                        placeholder="Enter new API key (leave empty to keep current)"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Health Check URL</Label>
                    <Input
                      value={editingEntity.healthCheckUrl || ''}
                      onChange={(e) => setEditingEntity({ ...editingEntity, healthCheckUrl: e.target.value })}
                      placeholder="https://pii-proxy.example.com/health"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Health Check Interval (seconds)</Label>
                    <Input
                      type="number"
                      value={editingEntity.healthCheckIntervalSec || 300}
                      onChange={(e) => setEditingEntity({ ...editingEntity, healthCheckIntervalSec: parseInt(e.target.value) || 300 })}
                      min={10}
                      max={3600}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={editingEntity.description || editingEntity.descriptionEn || ''}
                      onChange={(e) => setEditingEntity({ ...editingEntity, descriptionEn: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Health Status:</span>
                      {editingEntity.isHealthy ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle size={12} className="mr-1" />
                          Healthy
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle size={12} className="mr-1" />
                          Unhealthy
                        </Badge>
                      )}
                    </div>
                  </div>
                  {editingEntity.profileStoreCount > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                      <p className="text-amber-600 dark:text-amber-400">
                        This PII service config is used by {editingEntity.profileStoreCount} profile store(s).
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingEntity(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditedEntity}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
