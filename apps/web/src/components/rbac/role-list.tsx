'use client';

import { RoleDetail } from '@tcrn/shared';
import { MoreHorizontal, Pencil, Shield, Trash2 } from 'lucide-react';
import Link from 'next/link';

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
  roles: RoleDetail[];
}

export function RoleList({ roles }: RoleListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{role.name_en}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {role.description}
                  </span>
                </div>
              </TableCell>
              <TableCell>
          /* eslint-disable @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial Licenses
                <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                  {role.code}
                </code>
              </TableCell>
              <TableCell>
                {role.is_system ? (
                  <Badge variant="secondary" className="gap-1">
                    <Shield size={10} /> System
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    Custom
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{role.user_count || 0}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(role.updated_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/settings/roles/${role.id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Role
                      </Link>
                    </DropdownMenuItem>
                    {!role.is_system && (
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
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
