// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle,
  Loader2,
  Save,
  Settings,
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  type AdminTenantRecord,
  adminTenantsDomainApi,
} from '@/domains/config-dictionary-settings/api/admin-tenants.api';
import { getTranslatedApiErrorMessage } from '@/lib/api/error-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from '@/platform/ui';

export function AdminTenantDetailScreen() {
  const router = useRouter();
  const params = useParams();
  const te = useTranslations('errors');
  const t = useTranslations('adminConsole.tenants');
  const tc = useTranslations('common');
  const tenantId = params.tenantId as string;

  // Helper to get translated error message from API error
  const getErrorMessage = useCallback(
    (error: unknown): string => {
      return getTranslatedApiErrorMessage(error, te, te('generic'));
    },
    [te]
  );

  const [tenant, setTenant] = useState<AdminTenantRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    maxTalents: 10,
    maxCustomersPerTalent: 10000,
    isActive: true,
  });

  const fetchTenant = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminTenantsDomainApi.get(tenantId);
      if (response.success && response.data) {
        setTenant(response.data);
        setFormData({
          name: response.data.name,
          maxTalents: response.data.settings?.maxTalents || 10,
          maxCustomersPerTalent: response.data.settings?.maxCustomersPerTalent || 10000,
          isActive: response.data.isActive,
        });
      } else {
        setError(getErrorMessage(response.error));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId, fetchTenant]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await adminTenantsDomainApi.update(tenantId, {
        name: formData.name,
        settings: {
          maxTalents: formData.maxTalents,
          maxCustomersPerTalent: formData.maxCustomersPerTalent,
        },
      });

      if (response.success) {
        toast.success(t('updateSuccess'));
        setEditMode(false);
        fetchTenant();
      } else {
        toast.error(getErrorMessage(response.error));
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsSaving(true);
    try {
      const action = tenant?.isActive
        ? adminTenantsDomainApi.deactivate
        : adminTenantsDomainApi.activate;
      const response = await action(tenantId);

      if (response.success) {
        toast.success(tenant?.isActive ? t('deactivated') : t('reactivated'));
        fetchTenant();
      } else {
        toast.error(getErrorMessage(response.error));
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={48} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="py-12 text-center">
        <XCircle size={48} className="mx-auto mb-4 text-red-300" />
        <p className="text-red-500">{error || t('notFound')}</p>
        <Button variant="outline" onClick={() => router.push('/admin/tenants')} className="mt-4">
          {t('backToTenants')}
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/tenants')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-purple-700 dark:text-purple-300">
              <Building size={24} />
              {tenant.code}
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">{t('tenantDetails')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)} disabled={isSaving}>
                {tc('cancel')}
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                {tc('saveChanges')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              <Settings size={16} className="mr-2" />
              {tc('edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="border-white/50 bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building size={20} className="text-purple-600" />
              {t('tenantInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('code')}</Label>
                <Input value={tenant.code} disabled className="font-mono" />
                <p className="text-xs text-slate-500">{t('codeCannotChange')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('tier')}</Label>
                <div className="flex h-10 items-center">
                  <Badge variant={tenant.tier === 'ac' ? 'default' : 'secondary'}>
                    {tenant.tier.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={editMode ? formData.name : tenant.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editMode}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTalents">{t('maxTalents')}</Label>
                <Input
                  id="maxTalents"
                  type="number"
                  value={editMode ? formData.maxTalents : tenant.settings?.maxTalents || 10}
                  onChange={(e) =>
                    setFormData({ ...formData, maxTalents: parseInt(e.target.value) })
                  }
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCustomers">{t('maxCustomers')}</Label>
                <Input
                  id="maxCustomers"
                  type="number"
                  value={
                    editMode
                      ? formData.maxCustomersPerTalent
                      : tenant.settings?.maxCustomersPerTalent || 10000
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, maxCustomersPerTalent: parseInt(e.target.value) })
                  }
                  disabled={!editMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status & Actions */}
        <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t('statusAndActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                {tenant.isActive ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <XCircle size={20} className="text-red-500" />
                )}
                <div>
                  <p className="font-medium">{tc('status')}</p>
                  <p className="text-sm text-slate-500">
                    {tenant.isActive ? tc('active') : tc('inactive')}
                  </p>
                </div>
              </div>
              <Switch
                checked={tenant.isActive}
                onCheckedChange={handleToggleStatus}
                disabled={isSaving || tenant.tier === 'ac'}
              />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={14} />
                <span>
                  {tc('created')}: {new Date(tenant.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={14} />
                <span>
                  {tc('updated')}:{' '}
                  {new Date(tenant.updatedAt || tenant.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {tenant.tier === 'ac' && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                <p className="text-sm text-purple-700">{t('acTenantNote')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
