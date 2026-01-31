/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-non-null-assertion */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    Check,
    Clock,
    Key,
    Loader2,
    Lock,
    Mail,
    Phone,
    Shield,
    Unlock,
    User
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
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
import { systemRoleApi, systemUserApi, userRoleApi } from '@/lib/api/client';
import { useTalentStore } from '@/stores/talent-store';

// User interface from API
interface SystemUserDetail {
  id: string;
  username: string;
  email: string;
  phone?: string;
  displayName: string;
  preferredLanguage?: string;
  isActive: boolean;
  isTotpEnabled: boolean;
  passwordExpiresAt?: string | null;
  forceReset: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

// Role interface
interface UserRole {
  id: string;
  code: string;
  scopeType: string;
  scopeId: string;
  inherit: boolean;
}

// Available roles (will be loaded from API)
interface AvailableRole {
  id?: string;
  code: string;
  name: string;
  description: string;
}

export default function UserSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('userSettings');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const tenantId = params.tenantId as string;
  const userId = params.userId as string;

  // Helper to get translated error message from API error
  const getErrorMessage = useMemo(() => (error: any): string => {
    const errorCode = error?.code;
    if (errorCode && typeof errorCode === 'string') {
      try {
        const translated = te(errorCode as any);
        // Check if translation was found (not returning the key itself or MISSING_MESSAGE)
        if (translated && 
            translated !== errorCode && 
            !translated.startsWith('MISSING_MESSAGE')) {
          return translated;
        }
      } catch {
        // Fall through to message
      }
    }
    return error?.message || te('generic');
  }, [te]);

  const { currentTenantCode, organizationTree, directTalents } = useTalentStore();

  const [activeTab, setActiveTab] = useState('details');
  const [user, setUser] = useState<SystemUserDetail | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([
    { code: 'ADMIN', name: 'Administrator', description: 'Full access at assigned scope' },
    { code: 'TALENT_MANAGER', name: 'Talent Manager', description: 'Manage talent operations' },
    { code: 'CONTENT_MANAGER', name: 'Content Manager', description: 'Homepage and Marshmallow' },
    { code: 'CUSTOMER_MANAGER', name: 'Customer Manager', description: 'Customer management' },
    { code: 'VIEWER', name: 'Viewer', description: 'Read-only access' },
    { code: 'INTEGRATION_MANAGER', name: 'Integration Manager', description: 'API integration' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showRemove2FADialog, setShowRemove2FADialog] = useState(false);
  const [showPasswordExpiryDialog, setShowPasswordExpiryDialog] = useState(false);

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
        const data = response.data;
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          phone: data.phone,
          displayName: data.displayName || data.username,
          preferredLanguage: data.preferredLanguage,
          isActive: data.isActive ?? true,
          isTotpEnabled: data.isTotpEnabled ?? false,
          passwordExpiresAt: data.passwordExpiresAt,
          forceReset: data.forceReset ?? false,
          lastLoginAt: data.lastLoginAt,
          createdAt: data.createdAt,
        });
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [userId, getErrorMessage]);

  // Fetch available roles (only active roles)
  const fetchRoles = useCallback(async () => {
    try {
      const response = await systemRoleApi.list({ isActive: true });
      if (response.success && response.data && Array.isArray(response.data)) {
        const mappedRoles = response.data
          .filter((role: any) => role.isActive !== false) // Only active roles
          .map((role: any) => ({
            id: role.id,
            code: role.code || '', // Ensure code is never undefined
            name: role.nameEn || role.name_en || role.name || role.code || '',
            description: role.description || '',
          })).filter(r => r.code); // Filter out roles without code
        if (mappedRoles.length > 0) {
          setAvailableRoles(mappedRoles);
        }
      }
    } catch (error) {
      // Keep fallback roles on error
    }
  }, []);

  // Fetch user scope access
  const fetchScopeAccess = useCallback(async () => {
    try {
      const response = await systemUserApi.getScopeAccess(userId);
      if (response.success && response.data) {
        const newAccessState: Record<string, AccessibilityState> = {};
        for (const access of response.data) {
          const key = access.scopeType === 'tenant' ? tenantId : (access.scopeId || '');
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
    } catch (error) {
      // Keep default state
    }
  }, [userId, tenantId]);

  // Fetch user roles
  const fetchUserRoles = useCallback(async () => {
    try {
      const response = await userRoleApi.getUserRoles(userId);
      if (response.success && response.data) {
        setUserRoles(response.data.map((r: any) => ({
          id: r.id,
          code: r.roleCode || r.role?.code || r.code,
          scopeType: r.scopeType,
          scopeId: r.scopeId,
          inherit: r.inherit ?? false,
        })));
      }
    } catch (error) {
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
  const handleRoleToggle = async (role: AvailableRole) => {
    if (!selectedScope || isAssigningRole) return;

    const existingAssignment = userRoles.find(
      (r) => r.code === role.code && r.scopeId === selectedScope.id
    );

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
          scopeId: selectedScope.id,
          inherit: selectedScope.type !== 'talent',
        };
        const response = await userRoleApi.assignRole(userId, assignData);
        if (response.success && response.data) {
          const newRole: UserRole = {
            id: response.data.id,
            code: role.code,
            scopeType: selectedScope.type,
            scopeId: selectedScope.id,
            inherit: selectedScope.type !== 'talent',
          };
          setUserRoles((prev) => [...prev, newRole]);
          toast.success(t('roleAssigned'));
        }
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsAssigningRole(false);
    }
  };

  // Handle inherit toggle
  const handleInheritToggle = async (roleCode: string, newInherit: boolean) => {
    if (!selectedScope) return;

    const assignment = userRoles.find(
      (r) => r.code === roleCode && r.scopeId === selectedScope.id
    );
    if (!assignment) return;

    try {
      await userRoleApi.updateRoleInherit(userId, assignment.id, newInherit);
      setUserRoles((prev) =>
        prev.map((r) =>
          r.id === assignment.id ? { ...r, inherit: newInherit } : r
        )
      );
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleBack = () => {
    router.push(`/tenant/${tenantId}/user-management`);
  };

  const handleScopeSelect = (node: TreeNode) => {
    setSelectedScope(node);
  };

  // Helper: Build a flat map of all nodes with their parent info
  const buildNodeMap = useCallback(() => {
    const nodeMap: Record<string, { parentId: string | null; type: string; childIds: string[] }> = {};
    
    // Add tenant as root
    nodeMap[tenantId] = { parentId: null, type: 'tenant', childIds: [] };
    
    // Recursively process subsidiaries
    const processSubsidiary = (sub: any, parentId: string) => {
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
    const accesses: Array<{ scopeType: string; scopeId?: string; includeSubunits?: boolean }> = [];
    
    for (const [nodeId, nodeState] of Object.entries(state)) {
      if (nodeState.enabled) {
        const nodeInfo = nodeMap[nodeId];
        const scopeType = nodeInfo?.type || (nodeId === tenantId ? 'tenant' : 'unknown');
        
        accesses.push({
          scopeType,
          scopeId: scopeType === 'tenant' ? undefined : nodeId,
          includeSubunits: nodeState.includeSubunits,
        });
      }
    }
    
    try {
      await systemUserApi.setScopeAccess(userId, accesses);
    } catch (error: any) {
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
    } catch (error: any) {
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
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
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
                    <Input value={user.displayName} readOnly />
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
                  {user.isTotpEnabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => setShowRemove2FADialog(true)}
                    >
                      <Unlock size={14} className="mr-2" />
                      {t('remove2FA')}
                    </Button>
                  )}
                </div>

                {/* Password Expiry Section */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Calendar size={16} />
                        {t('passwordExpiry')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {user.passwordExpiresAt
                          ? t('expiresOn', { date: new Date(user.passwordExpiresAt).toLocaleDateString() })
                          : t('noExpiry')}
                      </p>
                    </div>
                    <Badge variant={user.passwordExpiresAt ? 'outline' : 'secondary'}>
                      {user.passwordExpiresAt ? tc('custom') : tc('system')}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordExpiryDialog(true)}
                  >
                    <Lock size={14} className="mr-2" />
                    {t('configureExpiry')}
                  </Button>
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
                  {selectedScope ? (
                    <div className="space-y-3">
                      {availableRoles.map((role) => {
                        const assignment = userRoles.find(
                          (r) => r.code === role.code && r.scopeId === selectedScope.id
                        );
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
                                <p className="font-medium text-sm">{role.name}</p>
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
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>{t('selectScopeFromTree')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changePassword')}</DialogTitle>
            <DialogDescription>
              {user.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('newPassword')}</Label>
              <Input type="password" placeholder={t('enterNewPassword')} />
            </div>
            <div className="space-y-2">
              <Label>{t('confirmPassword')}</Label>
              <Input type="password" placeholder={t('confirmNewPassword')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button>{t('savePassword')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove 2FA Dialog */}
      <Dialog open={showRemove2FADialog} onOpenChange={setShowRemove2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              {t('remove2FATitle')}
            </DialogTitle>
            <DialogDescription>
              {t('remove2FADesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemove2FADialog(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive">{t('remove2FA')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Expiry Dialog */}
      <Dialog open={showPasswordExpiryDialog} onOpenChange={setShowPasswordExpiryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('passwordExpirySettings')}</DialogTitle>
            <DialogDescription>
              {t('passwordExpiryDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="enable-expiry" className="rounded" />
              <Label htmlFor="enable-expiry">{t('enableExpiry')}</Label>
            </div>
            <div className="space-y-2">
              <Label>{t('expiresInDays')}</Label>
              <Input type="number" placeholder="90" defaultValue={90} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordExpiryDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button>{t('saveSettings')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
