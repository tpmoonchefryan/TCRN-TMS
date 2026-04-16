// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Plus, RefreshCw, Search, Shield, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CreateRoleDialog } from '@/components/admin/create-role-dialog';
import { EditRoleDialog } from '@/components/admin/edit-role-dialog';
import {
  acRoleManagementDomainApi,
  type ACSystemRoleRecord,
} from '@/domains/tenant-organization-rbac/api/ac-role-management.api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmActionDialog,
  Input,
  StateView,
  TableShell,
} from '@/platform/ui';

export function AdminRolesScreen() {
  const t = useTranslations('adminConsole.roles');
  const tCommon = useTranslations('common');

  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState<ACSystemRoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<ACSystemRoleRecord | null>(null);
  const [rolePendingDeletion, setRolePendingDeletion] = useState<ACSystemRoleRecord | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await acRoleManagementDomainApi.listRoles();
      if (response.success && response.data) {
        setRoles(response.data);
        return;
      }

      setError(response.error?.message || tCommon('error'));
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      setError(tCommon('error'));
      toast.error(tCommon('error'));
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const filteredRoles = useMemo(
    () =>
      roles.filter((role) =>
        role.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.nameEn.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [roles, searchQuery],
  );

  const handleDeleteRole = async () => {
    if (!rolePendingDeletion) {
      return;
    }

    setIsDeleting(true);

    try {
      await acRoleManagementDomainApi.deleteRole(rolePendingDeletion.id);
      toast.success(tCommon('success'));
      setRolePendingDeletion(null);
      void fetchRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error(tCommon('error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const viewState = isLoading ? 'loading' : error ? 'error' : filteredRoles.length === 0 ? 'empty' : 'ready';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Shield className="h-6 w-6" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Card className="border-blue-200 bg-blue-50/80">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-blue-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-950">{t('platformRoleManagement')}</p>
              <p className="text-sm text-blue-800">{t('platformRoleNote')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TableShell
        title={t('title')}
        description={t('description')}
        icon={<Shield className="h-5 w-5 text-primary" />}
        count={filteredRoles.length}
        actions={(
          <>
            <Button variant="outline" onClick={() => void fetchRoles()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {tCommon('refresh')}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createRole')}
            </Button>
          </>
        )}
        filters={(
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        )}
      >
        <StateView
          state={viewState}
          loading={{ title: t('loading') }}
          error={{
            title: tCommon('error'),
            description: error || tCommon('error'),
          }}
          empty={{
            title: searchQuery ? t('noRolesMatch') : t('noRoles'),
            description: t('description'),
          }}
          emptyIcon={<Shield className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          action={error ? (
            <Button variant="outline" onClick={() => void fetchRoles()}>
              {tCommon('retry')}
            </Button>
          ) : null}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRoles.map((role) => (
              <Card key={role.id} className="flex flex-col border-border/70">
                <CardContent className="flex flex-1 flex-col gap-4 pt-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={role.isActive ? 'default' : 'secondary'}>
                        {role.isActive ? tCommon('active') : tCommon('inactive')}
                      </Badge>
                      {role.isSystem ? (
                        <Badge variant="outline" className="text-xs">
                          {t('system')}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-foreground">{role.nameEn}</h3>
                      <p className="inline-flex rounded bg-primary/5 px-2 py-1 font-mono text-sm text-primary">
                        {role.code}
                      </p>
                    </div>
                    {role.description ? (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{role.description}</p>
                    ) : null}
                  </div>
                  <div className="mt-auto flex items-center gap-4 border-t pt-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t('userCount', { count: role.userCount || 0 })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      {t('permissionsCount', { count: role.permissionCount || 0 })}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRoleToEdit(role);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      {t('editRole')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      aria-label={t('deleteRoleAriaLabel', { name: role.nameEn })}
                      disabled={Boolean(role.userCount && role.userCount > 0)}
                      onClick={() => setRolePendingDeletion(role)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </StateView>
      </TableShell>

      <CreateRoleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => void fetchRoles()}
      />

      <EditRoleDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => void fetchRoles()}
        role={roleToEdit}
      />

      <ConfirmActionDialog
        open={Boolean(rolePendingDeletion)}
        onOpenChange={(open) => {
          if (!open) {
            setRolePendingDeletion(null);
          }
        }}
        title={tCommon('confirmDelete')}
        description={rolePendingDeletion ? rolePendingDeletion.nameEn : tCommon('confirmDelete')}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        isSubmitting={isDeleting}
        onConfirm={handleDeleteRole}
      />
    </div>
  );
}
