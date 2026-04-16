// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Edit, Lock, MoreHorizontal, Search, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import {
  type ACSystemUserRecord,
  acUserManagementDomainApi,
} from '@/domains/tenant-organization-rbac/api/ac-user-management.api';
import { getThrownErrorMessage } from '@/lib/api/error-utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  StateView,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableShell,
} from '@/platform/ui';

export function AdminUsersScreen() {
  const t = useTranslations('adminConsole.users');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [users, setUsers] = useState<ACSystemUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await acUserManagementDomainApi.listUsers();
      if (response.success && response.data) {
        setUsers(response.data);
        return;
      }

      setError(response.error?.message || tCommon('error'));
    } catch (error: unknown) {
      const message = getThrownErrorMessage(error, tCommon('error'));
      setError(message);
      toast.error(tCommon('error'), {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, users],
  );

  const handleResetPassword = async (userId: string) => {
    try {
      const response = await acUserManagementDomainApi.resetPassword(userId);
      if (response.success) {
        toast.success(t('passwordResetSuccess'));
        void fetchUsers();
      }
    } catch (error: unknown) {
      toast.error(tCommon('error'), {
        description: getThrownErrorMessage(error, tCommon('error')),
      });
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const response = await acUserManagementDomainApi.deactivateUser(userId);
      if (response.success) {
        toast.success(t('userDeactivated'));
        void fetchUsers();
      }
    } catch (error: unknown) {
      toast.error(tCommon('error'), {
        description: getThrownErrorMessage(error, tCommon('error')),
      });
    }
  };

  const viewState = isLoading ? 'loading' : error ? 'error' : filteredUsers.length === 0 ? 'empty' : 'ready';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Users className="h-6 w-6" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('platformAdminsOnly')}</p>
              <p className="text-sm text-muted-foreground">{t('platformAdminsNote')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TableShell
        title={t('platformUsers')}
        description={t('userCount', { count: filteredUsers.length })}
        icon={<Users className="h-5 w-5 text-primary" />}
        count={filteredUsers.length}
        actions={(
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('createUser')}
          </Button>
        )}
        filters={(
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
        )}
      >
        <StateView
          state={viewState}
          loading={{ title: tCommon('loading') }}
          error={{
            title: tCommon('error'),
            description: error || tCommon('error'),
          }}
          empty={{
            title: t('noUsers'),
            description: searchQuery ? t('searchPlaceholder') : t('description'),
          }}
          emptyIcon={<Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          action={error ? (
            <Button variant="outline" onClick={() => void fetchUsers()}>
              {tCommon('retry')}
            </Button>
          ) : null}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('username')}</TableHead>
                <TableHead>{t('displayName')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('twoFactorAuth')}</TableHead>
                <TableHead>{tCommon('status')}</TableHead>
                <TableHead>{t('lastLogin')}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono">{user.username}</TableCell>
                  <TableCell className="font-medium">{user.displayName || user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.isTotpEnabled ? 'default' : 'secondary'}>
                      {user.isTotpEnabled ? tCommon('enabled') : tCommon('disabled')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? tCommon('active') : tCommon('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleResetPassword(user.id)}>
                          <Lock className="mr-2 h-4 w-4" />
                          {t('resetPassword')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => void handleDeactivateUser(user.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('deactivate')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StateView>
      </TableShell>

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => void fetchUsers()}
      />
    </div>
  );
}
