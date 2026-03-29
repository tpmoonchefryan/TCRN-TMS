/* eslint-disable @typescript-eslint/no-non-null-assertion */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import type { RbacScopeType, SystemRoleRecord } from '@tcrn/shared';
import {
    ArrowLeft,
    Check,
    Clock,
    Key,
    Loader2,
    Mail,
    Phone,
    Shield,
    User
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
    AccessibilityState,
    OrganizationTree,
    TreeNode,
} from '@/components/organization/organization-tree';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTranslatedApiErrorMessage } from '@/lib/api/error-utils';
import {
  systemRoleApi,
  systemUserApi,
  type SystemUserDetailRecord,
  type SystemUserScopeAccessMutation,
  userRoleApi,
} from '@/lib/api/modules/user-management';
import type { UserRoleAssignmentState } from '@/lib/rbac/user-role-assignment';
import {
    findUserRoleAssignment,
    getRbacScopeKey,
    toUserRoleAssignmentState,
} from '@/lib/rbac/user-role-assignment';
import type { SubsidiaryInfo } from '@/stores/talent-store';
import { useTalentStore } from '@/stores/talent-store';

export default function UserSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('userSettings');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const tenantId = params.tenantId as string;
  const userId = params.userId as string;

  // Helper to get translated error message from API error
  const getErrorMessage = useMemo(() => (error: unknown): string => {
    return getTranslatedApiErrorMessage(error, te, te('generic'));
  }, [te]);

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
  const [accessibilityState, setAccessibilityState] = useState<Record<string, AccessibilityState>>({
    [tenantId]: { enabled: true, includeSubunits: false },
  });

  // Fetch user details
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await systemUserApi.get(userId);
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
      const response = await systemRoleApi.list({ isActive: true });
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
      const response = await systemUserApi.getScopeAccess(userId);
      if (response.success && response.data) {
        const newAccessState: Record<string, AccessibilityState> = {};
        for (const access of response.data) {
          const key = getRbacScopeKey(
            access.scopeType as RbacScopeType,
            access.scopeId,
            tenantId,
          );
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
      const response = await userRoleApi.getUserRoles(userId);
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

    const existingAssignment = findUserRoleAssignment(userRoles, role.code, selectedScope, tenantId);

    setIsAssigningRole(true);
    try {
      if (existingAssignment) {
        // Remove role
        await userRoleApi.removeRole(userId, existingAssignment.id);
        setUserRoles((prev) => prev.filter((r) => r.id !== existingAssignment.id));
        toast.success(t('roleRemoved'));
      } else {
        // Assign role with inherit=true by default for non-talent scopes
        // Use roleCode instead of roleId to ensure consistency across schemas
        const roleCode = role.code?.trim();
        
        // Validate roleCode exists before sending
        if (!roleCode) {
          toast.error(t('roleCodeMissing') || 'Role code is missing. Please refresh the page.');
          setIsAssigningRole(false);
          return;
        }
        
        const assignData = {
          roleCode,
          scopeType: selectedScope.type,
          scopeId: selectedScope.type === 'tenant' ? null : selectedScope.id,
          inherit: selectedScope.type !== 'talent',
        };
        const response = await userRoleApi.assignRole(userId, assignData);
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
      await userRoleApi.updateRoleInherit(userId, assignment.id, newInherit);
      setUserRoles((prev) =>
        prev.map((r) =>
          r.id === assignment.id ? { ...r, inherit: newInherit } : r
        )
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
      toast.error(t('passwordRequired') || 'Please enter both password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch') || 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('passwordTooShort') || 'Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await systemUserApi.resetPassword(userId, { newPassword, forceReset: false });
      toast.success(t('passwordChanged') || 'Password changed successfully');
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Build a flat map of all nodes with their parent info
  const buildNodeMap = useCallback(() => {
    const nodeMap: Record<string, { parentId: string | null; type: string; childIds: string[] }> = {};
    
    // Add tenant as root
    nodeMap[tenantId] = { parentId: null, type: 'tenant', childIds: [] };
    
    // Recursively process subsidiaries
    const processSubsidiary = (sub: SubsidiaryInfo, parentId: string) => {
      nodeMap[sub.id] = { parentId, type: 'subsidiary', childIds: [] };
      nodeMap[parentId].childIds.push(sub.id);
      
      // Process child subsidiaries
      if (sub.children) {
        for (const child of sub.children) {
          processSubsidiary(child, sub.id);
        }
      }
      
      // Process talents under this subsidiary
      if (sub.talents) {
        for (const talent of sub.talents) {
          nodeMap[talent.id] = { parentId: sub.id, type: 'talent', childIds: [] };
          nodeMap[sub.id].childIds.push(talent.id);
        }
      }
    };
    
    // Process all top-level subsidiaries
    for (const sub of organizationTree) {
      processSubsidiary(sub, tenantId);
    }
    
    // Process direct talents
    for (const talent of directTalents) {
      nodeMap[talent.id] = { parentId: tenantId, type: 'talent', childIds: [] };
      nodeMap[tenantId].childIds.push(talent.id);
    }
    
    return nodeMap;
  }, [tenantId, organizationTree, directTalents]);

  // Get all ancestor IDs (excluding talents)
  const getAncestorIds = useCallback((nodeId: string, nodeMap: Record<string, { parentId: string | null; type: string; childIds: string[] }>) => {
    const ancestors: string[] = [];
    let currentId = nodeMap[nodeId]?.parentId;
    while (currentId) {
      const node = nodeMap[currentId];
      if (node && node.type !== 'talent') {
        ancestors.push(currentId);
      }
      currentId = node?.parentId ?? null;
    }
    return ancestors;
  }, []);

  // Get all descendant IDs recursively
  const getDescendantIds = useCallback((nodeId: string, nodeMap: Record<string, { parentId: string | null; type: string; childIds: string[] }>) => {
    const descendants: string[] = [];
    const queue = [...(nodeMap[nodeId]?.childIds || [])];
    while (queue.length > 0) {
      const id = queue.shift()!;
      descendants.push(id);
      queue.push(...(nodeMap[id]?.childIds || []));
    }
    return descendants;
  }, []);

  // Save scope access to backend
  const saveScopeAccess = useCallback(async (state: Record<string, AccessibilityState>) => {
    const nodeMap = buildNodeMap();
    const accesses: SystemUserScopeAccessMutation[] = [];
    
    for (const [nodeId, nodeState] of Object.entries(state)) {
      if (nodeState.enabled) {
        const nodeInfo = nodeMap[nodeId];
        const scopeType: RbacScopeType | null =
          nodeId === tenantId ? 'tenant' : (nodeInfo?.type as RbacScopeType | undefined) || null;

        if (!scopeType) {
          continue;
        }
        
        accesses.push({
          scopeType,
          scopeId: scopeType === 'tenant' ? undefined : nodeId,
          includeSubunits: nodeState.includeSubunits,
        });
      }
    }
    
    try {
      await systemUserApi.setScopeAccess(userId, accesses);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  }, [userId, tenantId, buildNodeMap, getErrorMessage]);

  const handleAccessibilityChange = (nodeId: string, state: AccessibilityState) => {
    const nodeMap = buildNodeMap();
    
    setAccessibilityState((prev) => {
      const newState = { ...prev };
      const prevNodeState = prev[nodeId];
      
      // Check what changed
      const wasEnabled = prevNodeState?.enabled ?? false;
      const wasIncludeSubunits = prevNodeState?.includeSubunits ?? false;
      const isNowEnabled = state.enabled;
      const isNowIncludeSubunits = state.includeSubunits;
      
      // Update the current node
      newState[nodeId] = state;
      
      // Case 1: Enabling a node -> auto-enable all ancestor directories (not talents)
      if (!wasEnabled && isNowEnabled) {
        const ancestors = getAncestorIds(nodeId, nodeMap);
        for (const ancestorId of ancestors) {
          if (!newState[ancestorId]?.enabled) {
            newState[ancestorId] = { 
              ...newState[ancestorId], 
              enabled: true,
              includeSubunits: newState[ancestorId]?.includeSubunits ?? false,
            };
          }
        }
      }
      
      // Case 2: Enabling Include Subunits -> auto-enable all descendants
      if (isNowEnabled && !wasIncludeSubunits && isNowIncludeSubunits) {
        const descendants = getDescendantIds(nodeId, nodeMap);
        for (const descId of descendants) {
          newState[descId] = { 
            ...newState[descId], 
            enabled: true,
            includeSubunits: newState[descId]?.includeSubunits ?? false,
          };
        }
      }
      
      // Case 3: Disabling a node -> also disable Include Subunits
      if (wasEnabled && !isNowEnabled) {
        newState[nodeId] = { enabled: false, includeSubunits: false };
      }
      
      // Save to backend after state update
      saveScopeAccess(newState);
      
      return newState;
    });
  };

  const handleForcePasswordChange = async () => {
    if (!user) return;
    try {
      await systemUserApi.resetPassword(user.id, { forceReset: true });
      setUser((prev) => prev ? { ...prev, forceReset: true } : null);
      toast.success('Password change required on next login');
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <Label>{tc('code')}</Label>
                    <Input value={user.username} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail size={14} /> {tc('name')}
                    </Label>
                    <Input value={user.email} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone size={14} /> {tc('type')}
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
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Key size={16} />
                        {t('password')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {user.forceReset
                          ? t('forceChangeRequired')
                          : t('passwordDesc')}
                      </p>
                    </div>
                    {user.forceReset && (
                      <Badge variant="outline" className="text-orange-600">
                        {t('forceChange')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordDialog(true)}
                    >
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
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Shield size={16} />
                        {t('twoFactorAuth')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {user.isTotpEnabled
                          ? t('totpEnabled')
                          : t('totpNotConfigured')}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organization Tree */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('selectScope')}</CardTitle>
                  <CardDescription>
                    {t('selectScopeDesc')}
                  </CardDescription>
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
                    {selectedScope ? t('rolesFor', { name: selectedScope.displayName }) : t('selectScopeFirst')}
                  </CardTitle>
                  <CardDescription>
                    {selectedScope
                      ? t('assignRolesAtScope')
                      : t('clickToAssignRoles')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedScope ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>{t('selectScopeFromTree')}</p>
                    </div>
                  ) : isLoadingAvailableRoles ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : availableRoles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>{t('noAvailableRoles')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableRoles.map((role) => {
                        const assignment = findUserRoleAssignment(userRoles, role.code, selectedScope, tenantId);
                        const isAssigned = !!assignment;
                        return (
                          <div
                            key={role.code}
                            className={`p-3 border rounded-lg transition-colors ${
                              isAssigned
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-slate-300 cursor-pointer'
                            } ${isAssigningRole ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => !isAssigned && handleRoleToggle(role)}
                          >
                            <div className="flex items-center justify-between">
                              <div 
                                className={isAssigned ? '' : 'cursor-pointer flex-1'}
                                onClick={() => isAssigned && handleRoleToggle(role)}
                              >
                                <p className="font-medium text-sm">{role.nameEn}</p>
                                <p className="text-xs text-muted-foreground">{role.description}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRoleToggle(role);
                                }}
                                className={`flex items-center justify-center w-6 h-6 rounded ${
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
                                className="mt-2 pt-2 border-t flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  id={`inherit-${role.code}`}
                                  className="rounded cursor-pointer"
                                  checked={assignment?.inherit ?? false}
                                  onChange={(e) => handleInheritToggle(role.code, e.target.checked)}
                                />
                                <label
                                  htmlFor={`inherit-${role.code}`}
                                  className="text-xs text-muted-foreground cursor-pointer select-none"
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
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) {
          setNewPassword('');
          setConfirmPassword('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changePassword')}</DialogTitle>
            <DialogDescription>
              {user.displayName || user.username}
            </DialogDescription>
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
