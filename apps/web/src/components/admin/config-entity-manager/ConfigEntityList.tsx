// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { configEntityApi } from '@/lib/api/client';
import { useCallback, useEffect, useState } from 'react';
import { ConfigEntityForm } from './ConfigEntityForm';
import { InheritanceIndicator } from './InheritanceIndicator';
import { ConfigEntity, ConfigEntityType, ENTITY_TYPE_CONFIGS } from './types';

interface ConfigEntityListProps {
  entityType: ConfigEntityType;
  scopeType?: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string;
  locale?: 'en' | 'zh' | 'ja';
  onEntitySelect?: (entity: ConfigEntity) => void;
}

export function ConfigEntityList({
  entityType,
  scopeType = 'tenant',
  scopeId,
  locale = 'en',
  onEntitySelect,
}: ConfigEntityListProps) {
  const config = ENTITY_TYPE_CONFIGS[entityType];

  const [entities, setEntities] = useState<ConfigEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeInherited, setIncludeInherited] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<ConfigEntity | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Parent options for hierarchical entities
  const [parentOptions, setParentOptions] = useState<{ id: string; name: string }[]>([]);

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await configEntityApi.list(entityType, {
        scopeType,
        scopeId,
        includeInherited,
        includeInactive,
        search: search || undefined,
        page,
        pageSize,
      });

      if (response.success && response.data) {
        setEntities(response.data);
        setTotalCount(response.meta?.pagination?.totalCount || response.data.length);
      }
    } catch (error) {
      // Error handled by API client
    } finally {
      setLoading(false);
    }
  }, [entityType, scopeType, scopeId, includeInherited, includeInactive, search, page]);

  // Fetch parent options for hierarchical entities
  const fetchParentOptions = useCallback(async () => {
    if (!config.hasParent || !config.parentType) return;

    try {
      const response = await configEntityApi.list(config.parentType, {
        scopeType,
        scopeId,
        includeInherited: true,
      });

      if (response.success && response.data) {
        setParentOptions(
          response.data.map((item: ConfigEntity) => ({
            id: item.id,
            name: item.name || item.nameEn,
          }))
        );
      }
    } catch (error) {
      // Error handled by API client
    }
  }, [config.hasParent, config.parentType, scopeType, scopeId]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  useEffect(() => {
    fetchParentOptions();
  }, [fetchParentOptions]);

  const handleCreate = () => {
    setEditingEntity(null);
    setFormOpen(true);
  };

  const handleEdit = (entity: ConfigEntity) => {
    setEditingEntity(entity);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setFormLoading(true);
    try {
      if (editingEntity) {
        await configEntityApi.update(entityType, editingEntity.id, {
          ...data,
          version: editingEntity.version,
        });
      } else {
        await configEntityApi.create(entityType, {
          ...data,
          ownerType: scopeType,
          ownerId: scopeId,
        } as never);
      }
      setFormOpen(false);
      fetchEntities();
    } catch (error) {
      // Error handled by API client
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (entity: ConfigEntity) => {
    try {
      if (entity.isActive) {
        await configEntityApi.deactivate(entityType, entity.id, entity.version);
      } else {
        await configEntityApi.reactivate(entityType, entity.id, entity.version);
      }
      fetchEntities();
    } catch (error) {
      // Error handled by API client
    }
  };

  const handleToggleDisable = async (entity: ConfigEntity) => {
    // TODO: Implement disable/enable for inherited configs
  };

  const getLabel = () => {
    switch (locale) {
      case 'zh':
        return config.labelZh;
      case 'ja':
        return config.labelJa;
      default:
        return config.label;
    }
  };

  const getDescription = () => {
    switch (locale) {
      case 'zh':
        return config.descriptionZh;
      case 'ja':
        return config.descriptionJa;
      default:
        return config.description;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{getLabel()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </div>
          <Button onClick={handleCreate}>Create New</Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
          <div className="flex items-center gap-2">
            <Switch
              id="includeInherited"
              checked={includeInherited}
              onCheckedChange={setIncludeInherited}
            />
            <label htmlFor="includeInherited" className="text-sm">
              Show inherited
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="includeInactive"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
            <label htmlFor="includeInactive" className="text-sm">
              Show inactive
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : entities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No {getLabel().toLowerCase()} found
                  </TableCell>
                </TableRow>
              ) : (
                entities.map((entity) => (
                  <TableRow
                    key={entity.id}
                    className={!entity.isActive ? 'opacity-50' : ''}
                    onClick={() => onEntitySelect?.(entity)}
                  >
                    <TableCell className="font-mono">{entity.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entity.name}</div>
                        {entity.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {entity.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                        {entity.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <InheritanceIndicator
                        isInherited={entity.isInherited}
                        isForceUse={entity.isForceUse}
                        isSystem={entity.isSystem}
                        isDisabledHere={entity.isDisabledHere}
                        canDisable={entity.canDisable}
                        ownerType={entity.ownerType}
                        locale={locale}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!entity.isInherited && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(entity)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(entity)}
                                disabled={entity.isSystem}
                              >
                                {entity.isActive ? 'Deactivate' : 'Reactivate'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {entity.isInherited && entity.canDisable && (
                            <DropdownMenuItem onClick={() => handleToggleDisable(entity)}>
                              {entity.isDisabledHere ? 'Enable' : 'Disable'} in current scope
                            </DropdownMenuItem>
                          )}
                          {entity.isInherited && !entity.canDisable && (
                            <DropdownMenuItem disabled>
                              Inherited (cannot modify)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{' '}
              {totalCount} items
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Form Dialog */}
      <ConfigEntityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        entityType={entityType}
        entity={editingEntity}
        parentOptions={parentOptions}
        onSubmit={handleFormSubmit}
        isLoading={formLoading}
      />
    </Card>
  );
}
