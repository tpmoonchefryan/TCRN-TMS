'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Building2, Loader2, Plus, ShieldCheck, Trash2, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

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
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui';
import { DelegatedAdmin, delegatedAdminApi, organizationApi, systemRoleApi, systemUserApi } from '@/lib/api/client';

interface DelegatedAdminPanelProps {
  scopeType?: 'subsidiary' | 'talent';
  scopeId?: string;
}

interface UserOption {
  id: string;
  username: string;
  displayName?: string;
}

interface Role {
  id: string;
  code: string;
  nameEn: string;
}

interface Scope {
  id: string;
  name: string;
  type: 'subsidiary' | 'talent';
}

export function DelegatedAdminPanel({ scopeType, scopeId }: DelegatedAdminPanelProps) {
  const t = useTranslations('delegatedAdmin');
  const tc = useTranslations('common');

  const [delegations, setDelegations] = useState<DelegatedAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for new delegation
  const [selectedScopeType, setSelectedScopeType] = useState<'subsidiary' | 'talent'>(scopeType || 'subsidiary');
  const [selectedScopeId, setSelectedScopeId] = useState<string>(scopeId || '');
  const [delegateType, setDelegateType] = useState<'user' | 'role'>('user');
  const [delegateId, setDelegateId] = useState<string>('');

  // Available options for dropdowns
  const [users, setUsers] = useState<UserOption[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Fetch delegations
  const fetchDelegations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await delegatedAdminApi.list(
        scopeType || scopeId ? { scopeType, scopeId } : undefined
      );
      if (response.success && response.data) {
        setDelegations(response.data);
      }
    } catch (error) {
      toast.error(tc('error'));
    } finally {
      setIsLoading(false);
    }
  }, [scopeType, scopeId, tc]);

  // Fetch options for creating new delegation
  const fetchOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      // Fetch users
      const usersResponse = await systemUserApi.list({ isActive: true });
      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data.map((u: any) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
        })));
      }

      // Fetch roles
      const rolesResponse = await systemRoleApi.list();
      if (rolesResponse.success && rolesResponse.data) {
        setRoles(rolesResponse.data.map((r: any) => ({
          id: r.id,
          code: r.code,
          nameEn: r.nameEn,
        })));
      }

      // Fetch organization tree for scopes
      const orgResponse = await organizationApi.getTree();
      if (orgResponse.success && orgResponse.data) {
        const allScopes: Scope[] = [];
        
        // Add subsidiaries
        if (orgResponse.data.subsidiaries) {
          orgResponse.data.subsidiaries.forEach((sub: any) => {
            allScopes.push({
              id: sub.id,
              name: sub.name,
              type: 'subsidiary',
            });
          });
        }
        
        // Add talents (if available in response)
        const orgData = orgResponse.data as any;
        if (orgData.talents) {
          orgData.talents.forEach((talent: any) => {
            allScopes.push({
              id: talent.id,
              name: talent.name,
              type: 'talent',
            });
          });
        }
        
        setScopes(allScopes);
      }
    } catch (error) {
      console.error('Failed to fetch options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    fetchDelegations();
  }, [fetchDelegations]);

  const handleOpenDialog = () => {
    fetchOptions();
    setSelectedScopeType(scopeType || 'subsidiary');
    setSelectedScopeId(scopeId || '');
    setDelegateType('user');
    setDelegateId('');
    setIsDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedScopeId || !delegateId) {
      toast.error(t('fillAllFields'));
      return;
    }

    setIsSaving(true);
    try {
      const response = await delegatedAdminApi.create({
        scopeType: selectedScopeType,
        scopeId: selectedScopeId,
        delegateType,
        delegateId,
      });

      if (response.success) {
        toast.success(t('created'));
        setIsDialogOpen(false);
        fetchDelegations();
      }
    } catch (error: any) {
      toast.error(error.message || tc('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tc('confirmDelete'))) return;

    try {
      await delegatedAdminApi.delete(id);
      toast.success(t('deleted'));
      fetchDelegations();
    } catch (error) {
      toast.error(tc('error'));
    }
  };

  const filteredScopes = scopes.filter(s => s.type === selectedScopeType);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button onClick={handleOpenDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('addDelegation')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : delegations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mb-4 opacity-30" />
            <p>{t('noDelegations')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('scope')}</TableHead>
                <TableHead>{t('delegate')}</TableHead>
                <TableHead>{t('grantedAt')}</TableHead>
                <TableHead>{t('grantedBy')}</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegations.map((delegation) => (
                <TableRow key={delegation.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {delegation.scopeType === 'subsidiary' ? (
                        <Building2 className="h-4 w-4 text-blue-500" />
                      ) : (
                        <User className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <div className="font-medium">{delegation.scopeName || delegation.scopeId}</div>
                        <div className="text-xs text-muted-foreground capitalize">{delegation.scopeType}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={delegation.delegateType === 'user' ? 'default' : 'secondary'}>
                        {delegation.delegateType === 'user' ? (
                          <User className="h-3 w-3 mr-1" />
                        ) : (
                          <Users className="h-3 w-3 mr-1" />
                        )}
                        {delegation.delegateType}
                      </Badge>
                      <span>{delegation.delegateName || delegation.delegateId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(delegation.grantedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {delegation.grantedBy?.username || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(delegation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addDelegation')}</DialogTitle>
            <DialogDescription>{t('addDelegationDescription')}</DialogDescription>
          </DialogHeader>

          {isLoadingOptions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Scope Type */}
              {!scopeType && (
                <div className="space-y-2">
                  <Label>{t('scopeType')}</Label>
                  <Select
                    value={selectedScopeType}
                    onValueChange={(v) => {
                      setSelectedScopeType(v as 'subsidiary' | 'talent');
                      setSelectedScopeId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectScopeType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subsidiary">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {t('subsidiary')}
                        </div>
                      </SelectItem>
                      <SelectItem value="talent">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t('talent')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Scope */}
              {!scopeId && (
                <div className="space-y-2">
                  <Label>{t('scope')}</Label>
                  <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectScope')} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredScopes.map((scope) => (
                        <SelectItem key={scope.id} value={scope.id}>
                          {scope.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Delegate Type */}
              <div className="space-y-2">
                <Label>{t('delegateType')}</Label>
                <Select
                  value={delegateType}
                  onValueChange={(v) => {
                    setDelegateType(v as 'user' | 'role');
                    setDelegateId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectDelegateType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('user')}
                      </div>
                    </SelectItem>
                    <SelectItem value="role">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t('role')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Delegate */}
              <div className="space-y-2">
                <Label>{delegateType === 'user' ? t('selectUser') : t('selectRole')}</Label>
                <Select value={delegateId} onValueChange={setDelegateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={delegateType === 'user' ? t('selectUser') : t('selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {delegateType === 'user'
                      ? users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.displayName || user.username}
                          </SelectItem>
                        ))
                      : roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.nameEn} ({role.code})
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={isSaving || !selectedScopeId || !delegateId}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
