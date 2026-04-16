// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { BookOpen, Building2, Database, Layers, Save, Shield } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { BlocklistManager } from '@/components/security/BlocklistManager';
import { ExternalBlocklistManager } from '@/components/security/ExternalBlocklistManager';
import { IpRuleManager } from '@/components/security/IpRuleManager';
import { HierarchicalSettingsPanel } from '@/components/settings/HierarchicalSettingsPanel';
import {
  createTenantFallbackState,
  mapTenantRecordToSettingsState,
  settingsManagementApi,
  type TenantSettingsScreenState,
} from '@/domains/config-dictionary-settings/api/settings-management.api';
import {
  ConfigEntityPanel,
  type ExtendedEntity,
} from '@/domains/config-dictionary-settings/components/ConfigEntityPanel';
import { DictionaryPanel } from '@/domains/config-dictionary-settings/components/DictionaryPanel';
import { useAuthStore } from '@/platform/state/auth-store';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/platform/ui';

export function TenantSettingsScreen() {
  const params = useParams();
  const t = useTranslations('settingsPage');
  const tc = useTranslations('common');
  const tenantId = params.tenantId as string;

  const [activeTab, setActiveTab] = useState('details');
  const [tenant, setTenant] = useState<TenantSettingsScreenState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTenant = useCallback(async () => {
    const authState = useAuthStore.getState();
    const isAcTenant = authState.isAcTenant;

    if (isAcTenant) {
      try {
        const response = await settingsManagementApi.getTenant(tenantId);
        if (response.success && response.data) {
          setTenant(mapTenantRecordToSettingsState(response.data));
          return;
        }
      } catch {
        // fall through to the runtime fallback state
      }
    }

    setTenant(
      createTenantFallbackState({
        tenantCode: authState.tenantCode,
        tenantId,
        tenantNameFallback: tc('tenant'),
      })
    );
  }, [tenantId, tc]);

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
        await settingsManagementApi.updateTenant(tenantId, {
          name: tenant.name,
        });
        toast.success(t('settingsSaved'));
      } else {
        // Non-AC tenants cannot update tenant settings
        toast.info(t('settingsViewOnly'));
      }
    } catch {
      toast.error(t('settingsSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <Building2 size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tenant?.name || tc('loading')}</h1>
            <p className="text-muted-foreground">{t('tenantSettings')}</p>
          </div>
        </div>
        <Badge variant={tenant?.isActive ? 'default' : 'secondary'}>
          {tenant?.tier?.toUpperCase() || 'STANDARD'}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-4xl grid-cols-7">
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
            {t('security')}
          </TabsTrigger>
          <TabsTrigger value="scope">
            <Layers size={14} className="mr-2" />
            {t('scopeSettings')}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('tenantInfo')}</CardTitle>
              <CardDescription>{t('tenantInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tenant?.stats && (
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="text-2xl font-bold">{tenant.stats.subsidiaryCount}</div>
                    <div className="text-muted-foreground mt-1 text-xs font-semibold uppercase tracking-wider">
                      {t('subsidiaries')}
                    </div>
                  </div>
                  <div className="rounded-lg border border-pink-100 bg-pink-50 p-4 dark:border-pink-900/20 dark:bg-pink-900/10">
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                      {tenant.stats.talentCount}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs font-semibold uppercase tracking-wider">
                      {t('talents')}
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/20 dark:bg-blue-900/10">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {tenant.stats.userCount}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs font-semibold uppercase tracking-wider">
                      {t('users')}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('tenantCode')}</Label>
                  <Input value={tenant?.code || ''} disabled />
                  <p className="text-muted-foreground text-xs">{tc('cannotChange')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('tenantName')}</Label>
                  <Input
                    value={tenant?.name || ''}
                    onChange={(e) => tenant && setTenant({ ...tenant, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('tier')}</Label>
                  <Input value={tenant?.tier?.toUpperCase() || 'STANDARD'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t('createdAt')}</Label>
                  <Input
                    value={tenant ? new Date(tenant.createdAt).toLocaleString() : ''}
                    disabled
                  />
                </div>
              </div>

              <p className="text-muted-foreground text-sm">{t('tenantRuntimeSettingsHint')}</p>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save size={16} className="mr-2" />
                  {isSaving ? tc('saving') : tc('saveChanges')}
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
                  {
                    key: 'membershipClassId',
                    label: t('entityFields.membershipClass'),
                    type: 'entityRef' as const,
                    required: true,
                    refEntityType: 'membership-class',
                    placeholder: t('entityPlaceholders.selectClass'),
                  },
                  {
                    key: 'externalControl',
                    label: t('entityFields.externalControl'),
                    type: 'switch' as const,
                  },
                  {
                    key: 'defaultRenewalDays',
                    label: t('entityFields.defaultRenewalDays'),
                    type: 'number' as const,
                    placeholder: '365',
                  },
                ];
              }
              if (entityType === 'membership-level') {
                return [
                  {
                    key: 'membershipTypeId',
                    label: t('entityFields.membershipType'),
                    type: 'entityRef' as const,
                    required: true,
                    refEntityType: 'membership-type',
                    placeholder: t('entityPlaceholders.selectType'),
                  },
                  {
                    key: 'rank',
                    label: t('entityFields.rank'),
                    type: 'number' as const,
                    required: true,
                    placeholder: '1',
                  },
                  { key: 'color', label: t('entityFields.color'), type: 'color' as const },
                  {
                    key: 'badgeUrl',
                    label: t('entityFields.badgeUrl'),
                    type: 'text' as const,
                    placeholder: 'https://...',
                  },
                ];
              }
              if (entityType === 'consent') {
                return [
                  {
                    key: 'consentVersion',
                    label: t('entityFields.version'),
                    type: 'text' as const,
                    required: true,
                    placeholder: '1.0.0',
                  },
                  {
                    key: 'effectiveFrom',
                    label: t('entityFields.effectiveFrom'),
                    type: 'text' as const,
                    required: true,
                    placeholder: 'YYYY-MM-DD',
                  },
                  {
                    key: 'expiresAt',
                    label: t('entityFields.expiresAt'),
                    type: 'text' as const,
                    placeholder: 'YYYY-MM-DD',
                  },
                  {
                    key: 'contentUrl',
                    label: t('entityFields.contentUrl'),
                    type: 'text' as const,
                    placeholder: 'https://...',
                  },
                  { key: 'isRequired', label: t('entityFields.required'), type: 'switch' as const },
                ];
              }
              if (entityType === 'consumer') {
                return [
                  {
                    key: 'consumerCategory',
                    label: t('entityFields.category'),
                    type: 'select' as const,
                    required: true,
                    options: [
                      { value: 'internal', label: t('entityOptions.consumerCategory.internal') },
                      { value: 'external', label: t('entityOptions.consumerCategory.external') },
                      { value: 'partner', label: t('entityOptions.consumerCategory.partner') },
                    ],
                  },
                  {
                    key: 'contactName',
                    label: t('entityFields.contactName'),
                    type: 'text' as const,
                  },
                  {
                    key: 'contactEmail',
                    label: t('entityFields.contactEmail'),
                    type: 'text' as const,
                  },
                  {
                    key: 'rateLimit',
                    label: t('entityFields.rateLimit'),
                    type: 'number' as const,
                    placeholder: '1000',
                  },
                ];
              }
              if (entityType === 'profile-store') {
                return [
                  {
                    key: 'piiProxyUrl',
                    label: t('entityFields.piiProxyUrl'),
                    type: 'text' as const,
                    placeholder: 'https://...',
                  },
                  { key: 'isDefault', label: t('entityFields.isDefault'), type: 'switch' as const },
                ];
              }
              if (entityType === 'inactivation-reason') {
                return [
                  {
                    key: 'reasonCategoryId',
                    label: t('entityFields.reasonCategory'),
                    type: 'entityRef' as const,
                    required: true,
                    refEntityType: 'reason-category',
                    placeholder: t('entityPlaceholders.selectCategory'),
                  },
                ];
              }
              if (entityType === 'customer-status') {
                return [{ key: 'color', label: t('entityFields.color'), type: 'color' as const }];
              }
              return [];
            }}
            customColumns={(entityType: string) => {
              if (entityType === 'membership-type') {
                return [
                  {
                    key: 'class',
                    header: t('entityColumns.class'),
                    width: '120px',
                    render: (entity: ExtendedEntity) => (
                      <Badge variant="outline" className="text-xs">
                        {String(entity.className || entity.classId || '-')}
                      </Badge>
                    ),
                  },
                ];
              }
              if (entityType === 'membership-level') {
                return [
                  {
                    key: 'class',
                    header: t('entityColumns.class'),
                    width: '100px',
                    render: (entity: ExtendedEntity) => (
                      <Badge variant="outline" className="text-xs">
                        {String(entity.className || entity.classId || '-')}
                      </Badge>
                    ),
                  },
                  {
                    key: 'type',
                    header: t('entityColumns.type'),
                    width: '100px',
                    render: (entity: ExtendedEntity) => (
                      <Badge variant="secondary" className="text-xs">
                        {String(entity.typeName || entity.typeId || '-')}
                      </Badge>
                    ),
                  },
                  {
                    key: 'rank',
                    header: t('entityColumns.rank'),
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
                    key: 'usage',
                    header: t('entityColumns.usage'),
                    width: '100px',
                    render: (entity: ExtendedEntity) => (
                      <div className="text-muted-foreground text-xs">
                        <span>
                          {String(entity.talentCount || 0)} {t('talents')}
                        </span>
                        <span className="mx-1">·</span>
                        <span>
                          {String(entity.customerCount || 0)} {t('customers')}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'default',
                    header: t('entityColumns.default'),
                    width: '70px',
                    render: (entity: ExtendedEntity) =>
                      entity.isDefault ? (
                        <Badge className="bg-emerald-500 text-xs">{tc('default')}</Badge>
                      ) : null,
                  },
                ];
              }
              if (entityType === 'inactivation-reason') {
                return [
                  {
                    key: 'category',
                    header: t('entityColumns.category'),
                    width: '120px',
                    render: (entity: ExtendedEntity) => (
                      <Badge variant="secondary" className="text-xs">
                        {String(entity.categoryName || entity.categoryId || '-')}
                      </Badge>
                    ),
                  },
                ];
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
              <CardTitle>{t('hierarchicalSettings')}</CardTitle>
              <CardDescription>{t('hierarchicalSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <HierarchicalSettingsPanel scopeType="tenant" scopeName={tenant?.name} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
