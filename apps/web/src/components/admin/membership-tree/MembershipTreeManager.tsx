// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
'use client';

import { useState, useEffect, useCallback } from 'react';

import { ConfigEntityForm, ENTITY_TYPE_CONFIGS } from '../config-entity-manager';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { configEntityApi } from '@/lib/api/client';


interface MembershipLevel {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  typeId: string;
  rank: number;
  color: string | null;
  badgeUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  version: number;
  [key: string]: unknown;
}

interface MembershipType {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  classId: string;
  externalControl: boolean;
  defaultRenewalDays: number;
  sortOrder: number;
  isActive: boolean;
  levels: MembershipLevel[];
  version: number;
  [key: string]: unknown;
}

interface MembershipClass {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  sortOrder: number;
  isActive: boolean;
  types: MembershipType[];
  version: number;
  [key: string]: unknown;
}

interface MembershipTreeManagerProps {
  scopeType?: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string;
  locale?: 'en' | 'zh' | 'ja';
}

type EntityKind = 'class' | 'type' | 'level';

export function MembershipTreeManager({
  scopeType = 'tenant',
  scopeId,
  locale = 'en',
}: MembershipTreeManagerProps) {
  const [tree, setTree] = useState<MembershipClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<EntityKind>('class');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [editingEntity, setEditingEntity] = useState<Record<string, unknown> | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      // Use raw fetch to call the membership-tree endpoint
      const response = await fetch(
        `/api/v1/configuration-entity/membership-tree?scopeType=${scopeType}${scopeId ? `&scopeId=${scopeId}` : ''}&includeInactive=${includeInactive}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTree(result.data);
        }
      }
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [scopeType, scopeId, includeInactive]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleCreateClass = () => {
    setFormKind('class');
    setFormParentId(null);
    setEditingEntity(null);
    setFormOpen(true);
  };

  const handleCreateType = (classId: string) => {
    setFormKind('type');
    setFormParentId(classId);
    setEditingEntity(null);
    setFormOpen(true);
  };

  const handleCreateLevel = (typeId: string) => {
    setFormKind('level');
    setFormParentId(typeId);
    setEditingEntity(null);
    setFormOpen(true);
  };

  const handleEdit = (kind: EntityKind, entity: Record<string, unknown>) => {
    setFormKind(kind);
    setEditingEntity(entity);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setFormLoading(true);
    try {
      const entityType =
        formKind === 'class'
          ? 'membership-class'
          : formKind === 'type'
          ? 'membership-type'
          : 'membership-level';

      if (editingEntity) {
        await configEntityApi.update(entityType, editingEntity.id as string, {
          ...data,
          version: editingEntity.version as number,
        });
      } else {
        const createData: Record<string, unknown> = {
          ...data,
          ownerType: scopeType,
          ownerId: scopeId,
        };

        // Add parent reference
        if (formKind === 'type' && formParentId) {
          createData.membershipClassId = formParentId;
        } else if (formKind === 'level' && formParentId) {
          createData.membershipTypeId = formParentId;
        }

        await configEntityApi.create(entityType, createData as never);
      }
      setFormOpen(false);
      fetchTree();
    } catch (error) {
      // Error handling
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (kind: EntityKind, entity: { id: string; isActive: boolean; version: number }) => {
    try {
      const entityType =
        kind === 'class'
          ? 'membership-class'
          : kind === 'type'
          ? 'membership-type'
          : 'membership-level';

      if (entity.isActive) {
        await configEntityApi.deactivate(entityType, entity.id, entity.version);
      } else {
        await configEntityApi.reactivate(entityType, entity.id, entity.version);
      }
      fetchTree();
    } catch (error) {
      // Error handling
    }
  };

  const getFormEntityType = () => {
    switch (formKind) {
      case 'class':
        return 'membership-class';
      case 'type':
        return 'membership-type';
      case 'level':
        return 'membership-level';
    }
  };

  const getParentOptions = () => {
    if (formKind === 'type') {
      return tree.map((cls) => ({ id: cls.id, name: cls.name }));
    }
    if (formKind === 'level') {
      return tree.flatMap((cls) =>
        cls.types.map((type) => ({ id: type.id, name: `${cls.name} > ${type.name}` }))
      );
    }
    return [];
  };

  const renderLevelBadge = (level: MembershipLevel) => (
    <Badge
      variant="outline"
      style={{ backgroundColor: level.color || undefined }}
      className={level.color ? 'text-white' : ''}
    >
      {level.badgeUrl && (
        <img src={level.badgeUrl} alt="" className="w-4 h-4 mr-1" />
      )}
      Rank {level.rank}: {level.name}
    </Badge>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Membership Structure</CardTitle>
            <CardDescription>
              Manage membership classes, types, and levels in a hierarchical structure
            </CardDescription>
          </div>
          <Button onClick={handleCreateClass}>Add Class</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : tree.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No membership classes defined. Click "Add Class" to create one.
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {tree.map((cls) => (
              <AccordionItem
                key={cls.id}
                value={cls.id}
                className={`border rounded-lg ${!cls.isActive ? 'opacity-50' : ''}`}
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cls.name}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {cls.code}
                      </Badge>
                      {!cls.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{cls.types.length} types</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit('class', cls)}>
                            Edit Class
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCreateType(cls.id)}>
                            Add Type
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleActive('class', cls)}
                          >
                            {cls.isActive ? 'Deactivate' : 'Reactivate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {cls.types.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No types defined.{' '}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => handleCreateType(cls.id)}
                      >
                        Add one
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cls.types.map((type) => (
                        <Card
                          key={type.id}
                          className={`${!type.isActive ? 'opacity-50' : ''}`}
                        >
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{type.name}</CardTitle>
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {type.code}
                                </Badge>
                                {type.externalControl && (
                                  <Badge variant="outline">External</Badge>
                                )}
                                {!type.isActive && <Badge variant="outline">Inactive</Badge>}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    Actions
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit('type', type)}>
                                    Edit Type
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCreateLevel(type.id)}>
                                    Add Level
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleToggleActive('type', type)}
                                  >
                                    {type.isActive ? 'Deactivate' : 'Reactivate'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <CardDescription>
                              Default renewal: {type.defaultRenewalDays} days
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="py-2">
                            {type.levels.length === 0 ? (
                              <div className="text-sm text-muted-foreground">
                                No levels defined.{' '}
                                <Button
                                  variant="link"
                                  className="p-0 h-auto text-sm"
                                  onClick={() => handleCreateLevel(type.id)}
                                >
                                  Add one
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {type.levels.map((level) => (
                                  <DropdownMenu key={level.id}>
                                    <DropdownMenuTrigger asChild>
                                      <button className="cursor-pointer">
                                        {renderLevelBadge(level)}
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem
                                        onClick={() => handleEdit('level', level)}
                                      >
                                        Edit Level
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleToggleActive('level', level)}
                                      >
                                        {level.isActive ? 'Deactivate' : 'Reactivate'}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>

      {/* Form Dialog */}
      <ConfigEntityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        entityType={getFormEntityType()}
        entity={editingEntity as never}
        parentOptions={getParentOptions()}
        onSubmit={handleFormSubmit}
        isLoading={formLoading}
      />
    </Card>
  );
}
