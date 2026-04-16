// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import type { RbacScopeType, SystemRoleRecord } from '@tcrn/shared';
import { ArrowLeft, Check, Clock, Key, Loader2, Mail, Phone, Shield, User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { OrganizationTree, TreeNode } from '@/components/organization/organization-tree';
import {
  applyScopeAccessibilityChange,
  buildScopeAccessMutations,
  buildScopeNodeMap,
  type ScopeAccessibilityState,
  userManagementDomainApi,
} from '@/domains/tenant-organization-rbac/api/user-management.api';
import type { SystemUserDetailRecord } from '@/lib/api/modules/user-management';
import type { UserRoleAssignmentState } from '@/lib/rbac/user-role-assignment';
import {
  findUserRoleAssignment,
  getRbacScopeKey,
  toUserRoleAssignmentState,
} from '@/lib/rbac/user-role-assignment';
import { getTranslatedApiErrorMessage } from '@/platform/http/error-message';
import { useTalentStore } from '@/platform/state/talent-store';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/platform/ui';

export function UserManagementDetailScreen() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('userSettings');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const tenantId = params.tenantId as string;
  const userId = params.userId as string;

  // Helper to get translated error message from API error
  const getErrorMessage = useMemo(
    () =>
      (error: unknown): string => {
        return getTranslatedApiErrorMessage(error, te, te('generic'));
      },
    [te]
  );

  const { currentTenantCode, organizationTree, directTalents } = useTalentStore();

  const [activeTab, setActiveTab] = useState('details');
  const [user, setUser] = useState<SystemUserDetailRecord | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoleAssignmentState[]>([]);
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<SystemRoleRecord[]>([]);
  const [isLoadingAvailableRoles, setIsLoadingAvailableRoles] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Dialog form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role management state
  const [selectedScope, setSelectedScope] = useState<TreeNode | null>(null);
  const [accessibilityState, setAccessibilityState] = useState<
    Record<string, ScopeAccessibilityState>
  >({
    [tenantId]: { enabled: true, includeSubunits: false },
  });

  // Fetch user details
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await userManagementDomainApi.getUser(userId);
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [userId, getErrorMessage]);

  // Fetch available roles (only active roles)
  const fetchRoles = useCallback(async () => {
    setIsLoadingAvailableRoles(true);
    try {
      const response = await userManagementDomainApi.listRoles({ isActive: true });
      if (response.success && response.data && Array.isArray(response.data)) {
        setAvailableRoles(response.data.filter((role) => role.isActive !== false));
      }
    } catch (error: unknown) {
      setAvailableRoles([]);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingAvailableRoles(false);
    }
  }, [getErrorMessage]);

  // Fetch user scope access
  const fetchScopeAccess = useCallback(async () => {
    try {
      const response = await userManagementDomainApi.getScopeAccess(userId);
      if (response.success && response.data) {
        const newAccessState: Record<string, ScopeAccessibilityState> = {};
        for (const access of response.data) {
          const key = getRbacScopeKey(access.scopeType as RbacScopeType, access.scopeId, tenantId);
          if (key) {
            newAccessState[key] = {
              enabled: true,
              includeSubunits: access.includeSubunits,
            };
          }
        }
        // Keep tenant as default enabled if nothing else
        if (Object.keys(newAccessState).length === 0) {
          newAccessState[tenantId] = { enabled: true, includeSubunits: false };
        }
        setAccessibilityState(newAccessState);
      }
    } catch {
      // Keep default state
    }
  }, [userId, tenantId]);

  // Fetch user roles
  const fetchUserRoles = useCallback(async () => {
    try {
      const response = await userManagementDomainApi.getUserRoles(userId);
      if (response.success && response.data) {
        setUserRoles(response.data.map(toUserRoleAssignmentState));
      }
    } catch {
      // Keep empty roles
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
    fetchRoles();
    fetchUserRoles();
    fetchScopeAccess();
  }, [fetchUser, fetchRoles, fetchUserRoles, fetchScopeAccess]);

  // Handle role assignment toggle
  const handleRoleToggle = async (role: SystemRoleRecord) => {
    if (!selectedScope || isAssigningRole) return;

    const existingAssignment = findUserRoleAssignment(
      userRoles,
      role.code,
      selectedScope,
      tenantId
    );

    setIsAssigningRole(true);
    try {
      if (existingAssignment) {
        // Remove role
        await userManagementDomainApi.removeRole(userId, existingAssignment.id);
        setUserRoles((prev) => prev.filter((r) => r.id !== existingAssignment.id));
        toast.success(t('roleRemoved'));
      } else {
        // Assign role with inherit=true by default for non-talent scopes
        // Use roleCode instead of roleId to ensure consistency across schemas
        const roleCode = role.code?.trim();

        // Validate roleCode exists before sending
        if (!roleCode) {
          toast.error(t('roleCodeMissing'));
          setIsAssigningRole(false);
          return;
        }

        const assignData = {
          roleCode,
          scopeType: selectedScope.type,
          scopeId: selectedScope.type === 'tenant' ? null : selectedScope.id,
          inherit: selectedScope.type !== 'talent',
        };
        const response = await userManagementDomainApi.assignRole(userId, assignData);
        if (response.success && response.data) {
          const newRole: UserRoleAssignmentState = {
            id: response.data.id,
            code: role.code,
            scopeType: response.data.scopeType,
            scopeId: response.data.scopeId,
            inherit: response.data.inherit,
          };
          setUserRoles((prev) => [...prev, newRole]);
          toast.success(t('roleAssigned'));
        }
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsAssigningRole(false);
    }
  };

  // Handle inherit toggle
  const handleInheritToggle = async (roleCode: string, newInherit: boolean) => {
    if (!selectedScope) return;

    const assignment = findUserRoleAssignment(userRoles, roleCode, selectedScope, tenantId);
    if (!assignment) return;

    try {
      await userManagementDomainApi.updateRoleInherit(userId, assignment.id, newInherit);
      setUserRoles((prev) =>
        prev.map((r) => (r.id === assignment.id ? { ...r, inherit: newInherit } : r))
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleBack = () => {
    router.push(`/tenant/${tenantId}/user-management`);
  };

  const handleScopeSelect = (node: TreeNode) => {
    setSelectedScope(node);
  };

  // Password change handler
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error(t('passwordRequired'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('passwordTooShort'));
      return;
    }

    setIsSubmitting(true);
    try {
      await userManagementDomainApi.resetPassword(userId, {
        newPassword,
        forceReset: false,
      });
      toast.success(t('passwordChanged'));
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scopeNodeMap = useMemo(
    () =>
      buildScopeNodeMap({
        tenantId,
        organizationTree,
        directTalents,
      }),
    [directTalents, organizationTree, tenantId]
  );

  // Save scope access to backend
  const saveScopeAccess = useCallback(
    async (state: Record<string, ScopeAccessibilityState>) => {
      const accesses = buildScopeAccessMutations({
        accessibilityState: state,
        nodeMap: scopeNodeMap,
        tenantId,
      });

      try {
        await userManagementDomainApi.saveScopeAccess(userId, accesses);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
      }
    },
    [getErrorMessage, scopeNodeMap, tenantId, userId]
  );

  const handleAccessibilityChange = (nodeId: string, state: ScopeAccessibilityState) => {
    setAccessibilityState((previousState) => {
      const nextState = applyScopeAccessibilityChange({
        currentState: previousState,
        nodeId,
        nextState: state,
        nodeMap: scopeNodeMap,
      });

      void saveScopeAccess(nextState);
      return nextState;
    });
  };

  const handleForcePasswordChange = async () => {
    if (!user) return;
    try {
      await userManagementDomainApi.resetPassword(user.id, { forceReset: true });
      setUser((prev) => (prev ? { ...prev, forceReset: true } : null));
      toast.success(t('passwordChangeRequiredOnNextLogin'));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  // Reserved for future password reset feature
  // const handleResetPassword = async () => {
  //   if (!user) return;
  //   try {
  //     await systemUserApi.resetPassword(user.id);
  //     toast.success('Password reset successfully');
  //     setShowPasswordDialog(false);
  //   } catch (error) {
  //     toast.error('Failed to reset password');
  //   }
  // };

  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.displayName || user.username}</h1>
          <p className="text-muted-foreground">{t('title')}</p>
        </div>
        <Badge variant={user.isActive ? 'default' : 'secondary'}>
          {user.isActive ? tc('active') : tc('inactive')}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">
            <User size={16} className="mr-2" />
            {t('userDetails')}
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield size={16} className="mr-2" />
            {t('roleManagement')}
          </TabsTrigger>
        </TabsList>

        {/* User Details Tab */}
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('basicInfo')}</CardTitle>
                <CardDescription>{t('basicInfoDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>{tc('name')}</Label>
                    <Input value={user.displayName || user.username} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('username')}</Label>
                    <Input value={user.username} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail size={14} /> {tc('email')}
                    </Label>
                    <Input value={user.email} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone size={14} /> {t('phone')}
                    </Label>
                    <Input value={user.phone || '-'} readOnly />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('security')}</CardTitle>
                <CardDescription>{t('securityDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Password Section */}
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 font-medium">
                        <Key size={16} />
                        {t('password')}
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        {user.forceReset ? t('forceChangeRequired') : t('passwordDesc')}
                      </p>
                    </div>
                    {user.forceReset && (
                      <Badge variant="outline" className="text-orange-600">
                        {t('forceChange')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                      {t('changePassword')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleForcePasswordChange}
                      disabled={user.forceReset}
                    >
                      <Clock size={14} className="mr-2" />
                      {t('forceChange')}
                    </Button>
                  </div>
                </div>

                {/* 2FA Section */}
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 font-medium">
                        <Shield size={16} />
                        {t('twoFactorAuth')}
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        {user.isTotpEnabled ? t('totpEnabled') : t('totpNotConfigured')}
                      </p>
                    </div>
                    <Badge variant={user.isTotpEnabled ? 'default' : 'secondary'}>
                      {user.isTotpEnabled ? tc('enabled') : tc('disabled')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Role Management Tab */}
        <TabsContent value="roles" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Organization Tree */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('selectScope')}</CardTitle>
                  <CardDescription>{t('selectScopeDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <OrganizationTree
                    tenantName={currentTenantCode || tc('tenant')}
                    tenantId={tenantId}
                    subsidiaries={organizationTree}
                    directTalents={directTalents}
                    selectable
                    selectedNode={selectedScope}
                    onNodeSelect={handleScopeSelect}
                    showAccessibility
                    accessibilityState={accessibilityState}
                    onAccessibilityChange={handleAccessibilityChange}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Role Assignment */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedScope
                      ? t('rolesFor', { name: selectedScope.displayName })
                      : t('selectScopeFirst')}
                  </CardTitle>
                  <CardDescription>
                    {selectedScope ? t('assignRolesAtScope') : t('clickToAssignRoles')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedScope ? (
                    <div className="text-muted-foreground py-8 text-center">
                      <Shield className="mx-auto mb-4 h-12 w-12 opacity-30" />
                      <p>{t('selectScopeFromTree')}</p>
                    </div>
                  ) : isLoadingAvailableRoles ? (
                    <div className="text-muted-foreground flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : availableRoles.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center">
                      <Shield className="mx-auto mb-4 h-12 w-12 opacity-30" />
                      <p>{t('noAvailableRoles')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableRoles.map((role) => {
                        const assignment = findUserRoleAssignment(
                          userRoles,
                          role.code,
                          selectedScope,
                          tenantId
                        );
                        const isAssigned = !!assignment;
                        return (
                          <div
                            key={role.code}
                            className={`rounded-lg border p-3 transition-colors ${
                              isAssigned
                                ? 'border-primary bg-primary/5'
                                : 'cursor-pointer hover:border-slate-300'
                            } ${isAssigningRole ? 'pointer-events-none opacity-50' : ''}`}
                            onClick={() => !isAssigned && handleRoleToggle(role)}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className={isAssigned ? '' : 'flex-1 cursor-pointer'}
                                onClick={() => isAssigned && handleRoleToggle(role)}
                              >
                                <p className="text-sm font-medium">{role.nameEn}</p>
                                <p className="text-muted-foreground text-xs">{role.description}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRoleToggle(role);
                                }}
                                className={`flex h-6 w-6 items-center justify-center rounded ${
                                  isAssigned
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border hover:bg-slate-100'
                                }`}
                              >
                                {isAssigned && <Check size={14} />}
                              </button>
                            </div>
                            {/* Inherit checkbox - inside the card */}
                            {isAssigned && selectedScope.type !== 'talent' && (
                              <div
                                className="mt-2 flex items-center gap-2 border-t pt-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  id={`inherit-${role.code}`}
                                  className="cursor-pointer rounded"
                                  checked={assignment?.inherit ?? false}
                                  onChange={(e) => handleInheritToggle(role.code, e.target.checked)}
                                />
                                <label
                                  htmlFor={`inherit-${role.code}`}
                                  className="text-muted-foreground cursor-pointer select-none text-xs"
                                >
                                  {t('inheritToSubLevels')}
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog
        open={showPasswordDialog}
        onOpenChange={(open) => {
          setShowPasswordDialog(open);
          if (!open) {
            setNewPassword('');
            setConfirmPassword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changePassword')}</DialogTitle>
            <DialogDescription>{user.displayName || user.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('newPassword')}</Label>
              <Input
                type="password"
                placeholder={t('enterNewPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('confirmPassword')}</Label>
              <Input
                type="password"
                placeholder={t('confirmNewPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleChangePassword} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              {t('savePassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
