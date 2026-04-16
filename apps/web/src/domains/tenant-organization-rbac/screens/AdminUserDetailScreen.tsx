// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Key,
  Loader2,
  Mail,
  Save,
  Settings,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { acUserManagementDomainApi } from '@/domains/tenant-organization-rbac/api/ac-user-management.api';
import { getTranslatedApiErrorMessage } from '@/lib/api/error-utils';
import {
  type SystemUserDetailRecord,
  type UpdateSystemUserPayload,
} from '@/lib/api/modules/user-management';
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

export function AdminUserDetailScreen() {
  const router = useRouter();
  const params = useParams();
  const te = useTranslations('errors');
  const t = useTranslations('adminConsole.users');
  const tc = useTranslations('common');
  const userId = params.userId as string;

  // Helper to get translated error message from API error
  const getErrorMessage = useCallback(
    (error: unknown): string => {
      return getTranslatedApiErrorMessage(error, te, te('generic'));
    },
    [te]
  );

  const [user, setUser] = useState<SystemUserDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UpdateSystemUserPayload>({
    displayName: '',
    phone: '',
    preferredLanguage: 'en',
  });

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await acUserManagementDomainApi.getUser(userId);
      if (response.success && response.data) {
        setUser(response.data);
        setFormData({
          displayName: response.data.displayName || '',
          phone: response.data.phone || '',
          preferredLanguage: response.data.preferredLanguage || 'en',
        });
      } else {
        setError(response.error ? getErrorMessage(response.error) : t('fetchFailed'));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage, t, userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await acUserManagementDomainApi.updateUser(userId, formData);

      if (response.success) {
        toast.success(t('updateSuccess'));
        setEditMode(false);
        fetchUser();
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
      const action = user?.isActive
        ? acUserManagementDomainApi.deactivateUser
        : acUserManagementDomainApi.reactivateUser;
      const response = await action(userId);

      if (response.success) {
        toast.success(user?.isActive ? t('deactivated') : t('reactivated'));
        fetchUser();
      } else {
        toast.error(getErrorMessage(response.error));
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setIsSaving(true);
    try {
      const response = await acUserManagementDomainApi.resetPassword(userId, true);

      if (response.success) {
        toast.success(t('passwordResetSuccess'));
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

  if (error || !user) {
    return (
      <div className="py-12 text-center">
        <XCircle size={48} className="mx-auto mb-4 text-red-300" />
        <p className="text-red-500">{error || t('notFound')}</p>
        <Button variant="outline" onClick={() => router.push('/admin/users')} className="mt-4">
          {t('backToUsers')}
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-purple-700 dark:text-purple-300">
              <User size={24} />
              {user.displayName || user.username}
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">{t('userDetails')}</p>
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
              <User size={20} className="text-purple-600" />
              {t('userInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('username')}</Label>
                <Input value={user.username} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>{tc('email')}</Label>
                <div className="flex items-center gap-2">
                  <Input value={user.email} disabled className="flex-1" />
                  <Mail size={16} className="text-slate-400" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">{t('displayName')}</Label>
              <Input
                id="displayName"
                value={editMode ? formData.displayName : user.displayName || ''}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder={t('displayNamePlaceholder')}
                disabled={!editMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status & Security */}
        <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t('statusAndSecurity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                {user.isActive ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <XCircle size={20} className="text-red-500" />
                )}
                <div>
                  <p className="font-medium">{tc('status')}</p>
                  <p className="text-sm text-slate-500">
                    {user.isActive ? tc('active') : tc('inactive')}
                  </p>
                </div>
              </div>
              <Switch
                checked={user.isActive}
                onCheckedChange={handleToggleStatus}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <Shield
                  size={20}
                  className={user.isTotpEnabled ? 'text-green-500' : 'text-slate-400'}
                />
                <div>
                  <p className="font-medium">{t('twoFactorAuth')}</p>
                  <p className="text-sm text-slate-500">
                    {user.isTotpEnabled ? tc('enabled') : t('notConfigured')}
                  </p>
                </div>
              </div>
              <Badge variant={user.isTotpEnabled ? 'default' : 'secondary'}>
                {user.isTotpEnabled ? tc('enabled') : tc('disabled')}
              </Badge>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResetPassword}
              disabled={isSaving}
            >
              <Key size={16} className="mr-2" />
              {t('forcePasswordReset')}
            </Button>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={14} />
                <span>
                  {tc('created')}: {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              {user.lastLoginAt && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar size={14} />
                  <span>
                    {t('lastLogin')}: {new Date(user.lastLoginAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
