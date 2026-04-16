'use client';

import type { RoleDetail, RoleSummary } from '@tcrn/shared';
import { MoreHorizontal, Pencil, Shield, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import {
    Badge,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui';

interface RoleListProps {
  roles: Array<RoleSummary | RoleDetail>;
}

export function RoleList({ roles }: RoleListProps) {
  const tCommon = useTranslations('common');
  const tRole = useTranslations('roleManagement');

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tCommon('name')}</TableHead>
            <TableHead>{tCommon('code')}</TableHead>
            <TableHead>{tCommon('type')}</TableHead>
            <TableHead>{tCommon('users')}</TableHead>
            <TableHead>{tCommon('updated')}</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{role.name}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {role.description}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                  {role.code}
                </code>
              </TableCell>
              <TableCell>
                {role.isSystem ? (
                  <Badge variant="secondary" className="gap-1">
                    <Shield size={10} /> {tCommon('system')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    {tCommon('custom')}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{role.userCount || 0}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date('updatedAt' in role ? role.updatedAt : role.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">{tCommon('openMenu')}</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/settings/roles/${role.id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {tRole('editRole')}
                      </Link>
                    </DropdownMenuItem>
                    {!role.isSystem && (
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {tCommon('delete')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
