/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import type { RolePermissionInput, SystemRoleRecord } from '@tcrn/shared';
import { Edit, Key, Loader2, MoreHorizontal, Plus, Search, Shield, ShieldAlert, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PermissionSelector } from '@/components/admin/permission-selector';
import { DelegatedAdminPanel } from '@/components/rbac/delegated-admin-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { systemRoleApi, systemUserApi } from '@/lib/api/client';


// User interface from API
interface SystemUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  isActive: boolean;
  isTotpEnabled: boolean;
  forceReset: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UserManagementPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('userManagement');
  const tc = useTranslations('common');
  const tr = useTranslations('roleManagement');
  const te = useTranslations('errors');
  const tenantId = params.tenantId as string;

  // Helper to get translated error message from API error
  const getErrorMessage = useMemo(() => (error: any): string => {
    // Try to get error code first
    const errorCode = error?.code;
    if (errorCode && typeof errorCode === 'string') {
      try {
        // Try to get translated message for this error code
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
    // Fall back to error message or generic error
    return error?.message || te('generic');
  }, [te]);

  // Get tab from URL parameter, default to 'users'
  const tabFromUrl = searchParams.get('tab') || 'users';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<SystemRoleRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  // User create dialog state
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', displayName: '', forceReset: true });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Role edit dialog state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRoleRecord | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const response = await systemUserApi.list({
        search: userSearchQuery || undefined,
        page: 1,
        pageSize: 100,
      });
      if (response.success && response.data) {
        setUsers(response.data as SystemUser[]);
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userSearchQuery]);

  // Fetch roles from API
  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const response = await systemRoleApi.list();
      if (response.success && response.data) {
        setRoles(response.data);
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Refetch users when search changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'users') {
      router.push(`/tenant/${tenantId}/user-management`);
    } else {
      router.push(`/tenant/${tenantId}/user-management?tab=${tab}`);
    }
  };

  // Sync tab state with URL on mount and URL changes
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // User handlers
  const handleOpenCreateUser = () => {
    setNewUser({ username: '', email: '', password: '', displayName: '', forceReset: true });
    setShowUserDialog(true);
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    
    setIsCreatingUser(true);
    try {
      const response = await systemUserApi.create({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.displayName || newUser.username,
        forceReset: newUser.forceReset,
      });
      
      if (response.success) {
        toast.success('User created successfully');
        setShowUserDialog(false);
        setNewUser({ username: '', email: '', password: '', displayName: '', forceReset: true });
        fetchUsers();
      } else {
        toast.error(getErrorMessage(response.error));
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Role handlers
  const handleCreateRole = () => {
    setIsCreatingRole(true);
    setEditingRole({
      id: '',
      code: '',
      nameEn: '',
      nameZh: '',
      nameJa: '',
      description: '',
      isSystem: false,
      isActive: true,
      permissions: [],
    });
    setRolePermissions([]);
    setShowRoleDialog(true);
  };

  const handleEditRole = async (role: SystemRoleRecord) => {
    try {
      // Fetch full role details including permissions with effects
      const response = await systemRoleApi.get(role.id);
      if (response.success && response.data) {
        const fullRole = response.data;
        setIsCreatingRole(false);
        setEditingRole({ ...fullRole });
        setRolePermissions(fullRole.permissions || []);
        setShowRoleDialog(true);
      } else {
        toast.error(te('generic'));
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    
    // Validate required fields for creation
    if (isCreatingRole && (!editingRole.code || !editingRole.nameEn)) {
      toast.error(te('VALIDATION_FIELD_REQUIRED'));
      return;
    }
    
    setIsSaving(true);
    try {
      if (isCreatingRole) {
        // Create new role
        await systemRoleApi.create({
          code: editingRole.code,
          nameEn: editingRole.nameEn,
          nameZh: editingRole.nameZh ?? undefined,
          nameJa: editingRole.nameJa ?? undefined,
          description: editingRole.description ?? undefined,
          permissions: rolePermissions,
        });
        toast.success(t('roleCreated'));
      } else {
        // Update existing role
        await systemRoleApi.update(editingRole.id, {
          nameEn: editingRole.nameEn,
          nameZh: editingRole.nameZh ?? undefined,
          nameJa: editingRole.nameJa ?? undefined,
          description: editingRole.description ?? undefined,
          permissions: rolePermissions,
        });
        toast.success(t('roleUpdated'));
      }
      
      setShowRoleDialog(false);
      setEditingRole(null);
      setIsCreatingRole(false);
      setRolePermissions([]);
      fetchRoles(); // Refresh roles list
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  // User action handlers
  const handleResetPassword = async (userId: string) => {
    try {
      const result = await systemUserApi.resetPassword(userId, { forceReset: true });
      if (result.success) {
        toast.success('Password reset successfully');
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await systemUserApi.deactivate(userId);
      toast.success('User deactivated');
      fetchUsers();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await systemUserApi.reactivate(userId);
      toast.success('User reactivated');
      fetchUsers();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (user.displayName || '').toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredRoles = roles.filter(
    (role) =>
      role.code.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
      role.nameEn.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
      (role.nameZh || '').includes(roleSearchQuery)
  );

  const handleUserClick = (userId: string) => {
    router.push(`/tenant/${tenantId}/user-management/${userId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="users">
            <Users size={14} className="mr-2" />
            {t('userList')}
          </TabsTrigger>
          <TabsTrigger value="roles">
            <UserCog size={14} className="mr-2" />
            {t('userRoles')}
          </TabsTrigger>
          <TabsTrigger value="delegation">
            <ShieldAlert size={14} className="mr-2" />
            {t('delegation') || 'Delegation'}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchUsers')}
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">{t('filters')}</Button>
                <Button onClick={handleOpenCreateUser}>
                  <Plus size={16} className="mr-2" />
                  {t('addUser')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('usersCount', { count: filteredUsers.length })}</CardTitle>
              <CardDescription>{t('allUsers')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-30" />
                  <p>{t('noUsers') || 'No users found'}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('user')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('twoFA')}</TableHead>
                      <TableHead>{t('lastLogin')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer"
                        onClick={() => handleUserClick(user.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                              {(user.displayName || user.username).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{user.displayName || user.username}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'outline'}>
                            {user.isActive ? tc('active') : tc('inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isTotpEnabled ? (
                            <Badge variant="default" className="bg-green-500">
                              {tc('enabled')}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{tc('disabled')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{tc('actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleUserClick(user.id);
                              }}>
                                <Edit size={14} className="mr-2" />
                                {t('editUser')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleResetPassword(user.id);
                              }}>
                                <Key size={14} className="mr-2" />
                                {t('changePassword')}
                              </DropdownMenuItem>
                              {user.isTotpEnabled && (
                                <DropdownMenuItem
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-orange-600"
                                >
                                  <Shield size={14} className="mr-2" />
                                  {t('remove2fa')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {user.isActive ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeactivateUser(user.id);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  {t('deactivateUser')}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReactivateUser(user.id);
                                  }}
                                  className="text-green-600"
                                >
                                  <Shield size={14} className="mr-2" />
                                  {t('reactivateUser') || 'Reactivate User'}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-6">
          {/* Search and Actions */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchRoles')}
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleCreateRole}>
                  <Plus size={16} className="mr-2" />
                  {t('createRole')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Roles Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('rolesCount', { count: filteredRoles.length })}</CardTitle>
              <CardDescription>{t('manageRoles')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRoles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mb-4 opacity-30" />
                  <p>{t('noRoles') || 'No roles found'}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('role')}</TableHead>
                      <TableHead>{t('description')}</TableHead>
                      <TableHead className="w-[100px]">{t('permissionCount')}</TableHead>
                      <TableHead className="w-[100px]">{tc('type')}</TableHead>
                      <TableHead className="w-[80px]">{t('status')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                              <ShieldCheck size={18} />
                            </div>
                            <div>
                              <p className="font-medium">{role.nameEn}</p>
                              <p className="text-xs text-muted-foreground font-mono">{role.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {role.description || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{role.permissionCount ?? role.permissions?.length ?? 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {role.isSystem ? (
                            <Badge variant="default" className="bg-blue-500">
                              {tc('system')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{tc('custom')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.isActive ? 'default' : 'outline'}>
                            {role.isActive ? tc('active') : tc('inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                              <DropdownMenuLabel>{tc('actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditRole(role)}>
                                <Edit size={14} className="mr-2" />
                                {t('editRole')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditRole(role)}>
                                <ShieldCheck size={14} className="mr-2" />
                                {t('managePermissions')}
                              </DropdownMenuItem>
                              {!role.isSystem && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 size={14} className="mr-2" />
                                    {t('deleteRole')}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delegation Tab */}
        <TabsContent value="delegation" className="mt-6">
          <DelegatedAdminPanel />
        </TabsContent>
      </Tabs>

      {/* Role Edit Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreatingRole ? t('createRole') : `${tr('editRole')} - ${editingRole?.nameEn}`}
            </DialogTitle>
            <DialogDescription>
              {isCreatingRole ? tr('createRoleDescription') : editingRole?.description}
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr('roleName')}</Label>
                  <Input 
                    value={editingRole.nameEn} 
                    onChange={(e) => setEditingRole({ ...editingRole, nameEn: e.target.value })}
                    disabled={editingRole.isSystem}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tr('roleCode')}</Label>
                  <Input 
                    value={editingRole.code} 
                    onChange={(e) => setEditingRole({ ...editingRole, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                    disabled={!isCreatingRole}
                    placeholder="ROLE_CODE"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tr('description')}</Label>
                <Input 
                  value={editingRole.description || ''} 
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  disabled={editingRole.isSystem}
                />
              </div>
              <div className="space-y-3">
                <Label>{tr('permissions')}</Label>
                <p className="text-sm text-muted-foreground">{tr('selectPermissionsThreeState')}</p>
                <div className="border rounded-lg p-4 max-h-80 overflow-y-auto">
                  <PermissionSelector
                    value={rolePermissions}
                    onChange={setRolePermissions}
                    labels={{
                      grant: tr('grant'),
                      deny: tr('deny'),
                      unset: tr('unset'),
                    }}
                    disabled={editingRole.isSystem || isSaving}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSaveRole} disabled={(!isCreatingRole && editingRole?.isSystem) || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isCreatingRole ? t('createRole') : tr('saveRole')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addUser')}</DialogTitle>
            <DialogDescription>{t('addUserDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('username')}</Label>
              <Input 
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('email')}</Label>
              <Input 
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('displayName')}</Label>
              <Input 
                value={newUser.displayName}
                onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                placeholder={t('displayNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('password')}</Label>
              <Input 
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="forceReset"
                checked={newUser.forceReset}
                onCheckedChange={(checked) => setNewUser({ ...newUser, forceReset: checked as boolean })}
              />
              <label htmlFor="forceReset" className="text-sm cursor-pointer">
                {t('forcePasswordReset')}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('addUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
