// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2, Plus, RefreshCw, Search, Shield, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CreateRoleDialog } from '@/components/admin/create-role-dialog';
import { EditRoleDialog } from '@/components/admin/edit-role-dialog';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { systemRoleApi } from '@/lib/api/client';

interface Role {
  id: string;
  code: string;
  nameEn: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
  permissionCount?: number;
}

export default function RolesPage() {
  const t = useTranslations('adminConsole.roles');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await systemRoleApi.list();
      if (response.success && response.data) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error(tCommon('error'));
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const filteredRoles = roles.filter(role =>
    role.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRole = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setRoleToEdit(role);
    setIsEditDialogOpen(true);
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(tCommon('confirmDelete'))) return;

    try {
      await systemRoleApi.delete(role.id);
      toast.success(tCommon('success'));
      fetchRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error(tCommon('error'));
    }
  };

  const handleRefresh = () => {
    fetchRoles();
    toast.success(t('refreshing') || tCommon('refresh'));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <Shield size={24} />
            {t('title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
            {tCommon('refresh')}
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleAddRole}
          >
            <Plus size={16} className="mr-2" />
            {t('createRole')}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder={t('searchPlaceholder')} 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('platformRoleManagement')}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('platformRoleNote')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/50 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} className="text-purple-600" />
            {t('title')} ({filteredRoles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">
              <Loader2 size={48} className="mx-auto mb-4 text-purple-400 animate-spin" />
              <p>{t('loading')}</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Shield size={48} className="mx-auto mb-4 text-slate-300" />
              <p>{searchQuery ? t('noRolesMatch') : t('noRoles')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map((role) => (
                <Card key={role.id} className="border hover:shadow-md transition-shadow flex flex-col">
                  <CardContent className="pt-4 flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={role.isActive ? 'default' : 'secondary'} className={role.isActive ? 'bg-green-500 hover:bg-green-600' : ''}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {role.isSystem && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">{t('system')}</Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg text-slate-800 mb-1">{role.nameEn}</h3>
                      <p className="text-sm font-mono text-purple-600 mb-3 block bg-purple-50 px-2 py-0.5 rounded w-fit">{role.code}</p>
                      
                      {role.description && (
                        <p className="text-sm text-slate-500 mb-4 line-clamp-3">{role.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-auto text-sm text-slate-500 pt-3 border-t">
                        <span className="flex items-center gap-1" title="Users">
                          <Users size={14} />
                          {t('userCount', { count: role.userCount || 0 })}
                        </span>
                        <span className="flex items-center gap-1" title="Permissions">
                          <Shield size={14} />
                          {t('permissionsCount', { count: role.permissionCount || 0 })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t bg-slate-50/50 -mx-6 -mb-6 px-6 py-3">
                       <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>
                         {t('editRole')}
                       </Button>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteRole(role)}
                        disabled={role.userCount ? role.userCount > 0 : false}
                        title={role.userCount && role.userCount > 0 ? "Cannot delete role with assigned users" : "Delete role"}
                      >
                         <Trash2 size={14} />
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRoleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchRoles}
      />

      <EditRoleDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={fetchRoles}
        role={roleToEdit}
      />
    </div>
  );
}
