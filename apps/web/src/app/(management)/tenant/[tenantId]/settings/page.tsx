/* eslint-disable @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    BookOpen,
    Building2,
    Clock,
    Database,
    Languages,
    Layers,
    Save,
    Shield
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { BlocklistManager } from '@/components/security/BlocklistManager';
import { ExternalBlocklistManager } from '@/components/security/ExternalBlocklistManager';
import { IpRuleManager } from '@/components/security/IpRuleManager';
import { HierarchicalSettingsPanel } from '@/components/settings/HierarchicalSettingsPanel';
import { ConfigEntityPanel, ExtendedEntity } from '@/components/shared/ConfigEntityPanel';
import { DictionaryPanel } from '@/components/shared/DictionaryPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tenantApi } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

// Configuration Entity Types (using singular kebab-case format to match backend API)
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

        {/* Config Entity Tab - Using shared ConfigEntityPanel */}
        <TabsContent value="config" className="mt-6">
          <ConfigEntityPanel
            scopeType="tenant"
            scopeId={tenantId}
            canEdit={true}
            customDialogFields={(entityType: string) => {
              if (entityType === 'membership-type') {
                return [
                  { key: 'membershipClassId', label: 'Membership Class', type: 'entityRef' as const, required: true, refEntityType: 'membership-class', placeholder: 'Select Class' },
                  { key: 'externalControl', label: 'External Control', type: 'switch' as const },
                  { key: 'defaultRenewalDays', label: 'Default Renewal Days', type: 'number' as const, placeholder: '365' },
                ];
              }
              if (entityType === 'membership-level') {
                return [
                  { key: 'membershipTypeId', label: 'Membership Type', type: 'entityRef' as const, required: true, refEntityType: 'membership-type', placeholder: 'Select Type' },
                  { key: 'rank', label: 'Rank', type: 'number' as const, required: true, placeholder: '1' },
                  { key: 'color', label: 'Color', type: 'color' as const },
                  { key: 'badgeUrl', label: 'Badge URL', type: 'text' as const, placeholder: 'https://...' },
                ];
              }
              if (entityType === 'consent') {
                return [
                  { key: 'consentVersion', label: 'Version', type: 'text' as const, required: true, placeholder: '1.0.0' },
                  { key: 'effectiveFrom', label: 'Effective From', type: 'text' as const, required: true, placeholder: 'YYYY-MM-DD' },
                  { key: 'expiresAt', label: 'Expires At', type: 'text' as const, placeholder: 'YYYY-MM-DD' },
                  { key: 'contentUrl', label: 'Content URL', type: 'text' as const, placeholder: 'https://...' },
                  { key: 'isRequired', label: 'Required', type: 'switch' as const },
                ];
              }
              if (entityType === 'consumer') {
                return [
                  { key: 'consumerCategory', label: 'Category', type: 'select' as const, required: true, options: [
                    { value: 'internal', label: 'Internal' },
                    { value: 'external', label: 'External' },
                    { value: 'partner', label: 'Partner' },
                  ]},
                  { key: 'contactName', label: 'Contact Name', type: 'text' as const },
                  { key: 'contactEmail', label: 'Contact Email', type: 'text' as const },
                  { key: 'rateLimit', label: 'Rate Limit (per min)', type: 'number' as const, placeholder: '1000' },
                ];
              }
              if (entityType === 'blocklist-entry') {
                return [
                  { key: 'pattern', label: 'Pattern', type: 'text' as const, required: true },
                  { key: 'patternType', label: 'Pattern Type', type: 'select' as const, required: true, options: [
                    { value: 'keyword', label: 'Keyword' },
                    { value: 'regex', label: 'Regex' },
                    { value: 'wildcard', label: 'Wildcard' },
                  ]},
                  { key: 'action', label: 'Action', type: 'select' as const, required: true, options: [
                    { value: 'reject', label: 'Reject' },
                    { value: 'flag', label: 'Flag' },
                    { value: 'replace', label: 'Replace' },
                  ]},
                  { key: 'replacement', label: 'Replacement Text', type: 'text' as const, placeholder: '***' },
                  { key: 'severity', label: 'Severity', type: 'select' as const, required: true, options: [
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]},
                  { key: 'category', label: 'Category', type: 'text' as const },
                ];
              }
              if (entityType === 'pii-service-config') {
                return [
                  { key: 'apiUrl', label: 'API URL', type: 'text' as const, required: true, placeholder: 'https://pii.example.com/api' },
                  { key: 'authType', label: 'Auth Type', type: 'select' as const, required: true, options: [
                    { value: 'mtls', label: 'mTLS' },
                    { value: 'api_key', label: 'API Key' },
                  ]},
                  { key: 'healthCheckUrl', label: 'Health Check URL', type: 'text' as const, placeholder: 'https://pii.example.com/health' },
                  { key: 'healthCheckIntervalSec', label: 'Health Check Interval (sec)', type: 'number' as const, placeholder: '60' },
                ];
              }
              if (entityType === 'profile-store') {
                return [
                  { key: 'piiServiceConfigId', label: 'PII Service Config', type: 'entityRef' as const, refEntityType: 'pii-service-config', placeholder: 'Select PII Service' },
                  { key: 'piiProxyUrl', label: 'PII Proxy URL', type: 'text' as const, placeholder: 'https://...' },
                  { key: 'isDefault', label: 'Is Default', type: 'switch' as const },
                ];
              }
              if (entityType === 'inactivation-reason') {
                return [
                  { key: 'reasonCategoryId', label: 'Reason Category', type: 'entityRef' as const, required: true, refEntityType: 'reason-category', placeholder: 'Select Category' },
                ];
              }
              if (entityType === 'customer-status') {
                return [
                  { key: 'color', label: 'Color', type: 'color' as const },
                ];
              }
              return [];
            }}
            customColumns={(entityType: string) => {
              if (entityType === 'membership-type') {
                return [{
                  key: 'class',
                  header: 'Class',
                  width: '120px',
                  render: (entity: ExtendedEntity) => (
                    <Badge variant="outline" className="text-xs">
                      {String(entity.className || entity.classId || '-')}
                    </Badge>
                  ),
                }];
              }
              if (entityType === 'membership-level') {
                return [
                  {
                    key: 'class',
                    header: 'Class',
                    width: '100px',
                    render: (entity: ExtendedEntity) => (
                      <Badge variant="outline" className="text-xs">
                        {String(entity.className || entity.classId || '-')}
                      </Badge>
                    ),
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    width: '100px',
                    render: (entity: ExtendedEntity) => (
                      <Badge variant="secondary" className="text-xs">
                        {String(entity.typeName || entity.typeId || '-')}
                      </Badge>
                    ),
                  },
                  {
                    key: 'rank',
                    header: 'Rank',
                    width: '70px',
                    render: (entity: ExtendedEntity) => (
                      <Badge 
                        className="text-xs text-white"
                        style={{ backgroundColor: String(entity.color || '#6b7280') }}
                      >
                        #{String(entity.rank ?? 0)}
                      </Badge>
                    ),
                  },
                ];
              }
              if (entityType === 'profile-store') {
                return [
                  {
                    key: 'piiService',
                    header: 'PII Service',
                    width: '150px',
                    render: (entity: ExtendedEntity) => {
                      const piiConfig = entity.piiServiceConfig as { code?: string; isHealthy?: boolean } | null;
                      if (!piiConfig) return <span className="text-muted-foreground text-xs">-</span>;
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono">{piiConfig.code}</span>
                          <div className={`w-2 h-2 rounded-full \${piiConfig.isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                      );
                    },
                  },
                  {
                    key: 'usage',
                    header: 'Usage',
                    width: '100px',
                    render: (entity: ExtendedEntity) => (
                      <div className="text-xs text-muted-foreground">
                        <span>{String(entity.talentCount || 0)} T</span>
                        <span className="mx-1">·</span>
                        <span>{String(entity.customerCount || 0)} C</span>
                      </div>
                    ),
                  },
                  {
                    key: 'default',
                    header: 'Default',
                    width: '70px',
                    render: (entity: ExtendedEntity) => (
                      entity.isDefault ? <Badge className="bg-emerald-500 text-xs">Default</Badge> : null
                    ),
                  },
                ];
              }
              if (entityType === 'pii-service-config') {
                return [
                  {
                    key: 'apiUrl',
                    header: 'API URL',
                    width: '200px',
                    render: (entity: ExtendedEntity) => (
                      <span className="text-xs font-mono truncate block max-w-[180px]" title={String(entity.apiUrl || '')}>
                        {String(entity.apiUrl || '-')}
                      </span>
                    ),
                  },
                  {
                    key: 'authType',
                    header: 'Auth',
                    width: '80px',
                    render: (entity: ExtendedEntity) => (
                      <Badge variant="outline" className="text-xs">
                        {entity.authType === 'mtls' ? 'mTLS' : 'API Key'}
                      </Badge>
                    ),
                  },
                  {
                    key: 'health',
                    header: 'Health',
                    width: '80px',
                    render: (entity: ExtendedEntity) => (
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full \${entity.isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs">{entity.isHealthy ? 'OK' : 'Error'}</span>
                      </div>
                    ),
                  },
                ];
              }
              if (entityType === 'inactivation-reason') {
                return [{
                  key: 'category',
                  header: 'Category',
                  width: '120px',
                  render: (entity: ExtendedEntity) => (
                    <Badge variant="secondary" className="text-xs">
                      {String(entity.categoryName || entity.categoryId || '-')}
                    </Badge>
                  ),
                }];
              }
              return [];
            }}
          />
        </TabsContent>

        {/* Dictionary Tab - Using shared DictionaryPanel */}
        <TabsContent value="dictionary" className="mt-6">
          <DictionaryPanel />
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
    </div>
  );
}

