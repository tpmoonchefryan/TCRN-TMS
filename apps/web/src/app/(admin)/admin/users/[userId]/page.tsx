/* eslint-disable import/order */
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
    XCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Switch } from '@/components/ui';
import { systemUserApi } from '@/lib/api/client';

interface UserDetails {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  isActive: boolean;
  totpEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  roles?: Array<{ id: string; name: string; code: string }>;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const te = useTranslations('errors');
  const t = useTranslations('adminConsole.users');
  const userId = params.userId as string;

  // Helper to get translated error message from API error
  const getErrorMessage = useCallback((error: unknown): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCode = (error as any)?.code;
    if (errorCode && typeof errorCode === 'string') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const translated = te(errorCode as any);
        if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
          return translated;
        }
      } catch {
        // Fall through
      }
    }
    return (error as Error)?.message || te('generic');
  }, [te]);

  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    preferredLanguage: 'en',
  });

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await systemUserApi.get(userId);
      if (response.success && response.data) {
        setUser(response.data);
        setFormData({
          displayName: response.data.displayName || '',
          phone: response.data.phone || '',
          preferredLanguage: response.data.preferredLanguage || 'en',
        });
      } else {
        setError(response.error?.message || 'Failed to fetch user');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch user');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await systemUserApi.update(userId, formData);

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
      const action = user?.isActive ? systemUserApi.deactivate : systemUserApi.reactivate;
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
      const response = await systemUserApi.resetPassword(userId, { forceReset: true });

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
      <div className="flex items-center justify-center h-64">
        <Loader2 size={48} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <XCircle size={48} className="mx-auto mb-4 text-red-300" />
        <p className="text-red-500">{error || 'User not found'}</p>
        <Button variant="outline" onClick={() => router.push('/admin/users')} className="mt-4">
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <User size={24} />
              {user.displayName || user.username}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              User Details
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              <Settings size={16} className="mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2 border-white/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} className="text-purple-600" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user.username} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={user.email} disabled className="flex-1" />
                  <Mail size={16} className="text-slate-400" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={editMode ? formData.displayName : (user.displayName || '')}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Display name..."
                disabled={!editMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status & Security */}
        <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Status & Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                {user.isActive ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <XCircle size={20} className="text-red-500" />
                )}
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-slate-500">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <Switch
                checked={user.isActive}
                onCheckedChange={handleToggleStatus}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield size={20} className={user.totpEnabled ? 'text-green-500' : 'text-slate-400'} />
                <div>
                  <p className="font-medium">2FA</p>
                  <p className="text-sm text-slate-500">
                    {user.totpEnabled ? 'Enabled' : 'Not configured'}
                  </p>
                </div>
              </div>
              <Badge variant={user.totpEnabled ? 'default' : 'secondary'}>
                {user.totpEnabled ? 'ON' : 'OFF'}
              </Badge>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleResetPassword}
              disabled={isSaving}
            >
              <Key size={16} className="mr-2" />
              Force Password Reset
            </Button>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={14} />
                <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              {user.lastLoginAt && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar size={14} />
                  <span>Last Login: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
