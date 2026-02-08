// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    Copy,
    Edit,
    Loader2,
    Lock,
    MoreHorizontal,
    Plus,
    Search,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

import { CONFIG_ENTITY_TYPES, ConfigEntity, ScopeType } from './constants';

// Extended entity type for custom data
export interface ExtendedEntity extends ConfigEntity {
  [key: string]: unknown;
}

// Custom column definition
export interface CustomColumn {
  key: string;
  header: string;
  width?: string;
  render: (entity: ExtendedEntity) => React.ReactNode;
}

// Custom dialog field definition
export interface CustomDialogField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'switch' | 'color' | 'entityRef';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  // For entityRef type: the entity type to reference (e.g., 'membership-class')
  refEntityType?: string;
}

interface ConfigEntityPanelProps {
  scopeType: ScopeType;
  scopeId: string;
  canEdit?: boolean;
  // Custom column renderer for extra entity fields
  customColumns?: (entityType: string) => CustomColumn[];
  // Custom dialog fields for add/edit dialogs
  customDialogFields?: (entityType: string) => CustomDialogField[];
  // Custom data fetcher for specialized entity types
  customFetcher?: (entityType: string) => Promise<ExtendedEntity[]>;
  // Filter entity types to display (if not provided, shows all)
  entityTypes?: string[];
}

export function ConfigEntityPanel({
  scopeType,
  scopeId,
  canEdit = true,
  customColumns,
  customDialogFields,
  customFetcher,
  entityTypes,
}: ConfigEntityPanelProps) {
  const t = useTranslations('settingsPage');
  const tc = useTranslations('common');

  // Filter entity types based on prop
  const filteredEntityTypes = useMemo(() => {
    if (!entityTypes) return CONFIG_ENTITY_TYPES;
    return CONFIG_ENTITY_TYPES.filter(t => entityTypes.includes(t.code));
  }, [entityTypes]);

  // State
  const [configEntities, setConfigEntities] = useState<Record<string, ExtendedEntity[]>>({});
  const [selectedEntityType, setSelectedEntityType] = useState<string>(
    filteredEntityTypes[0]?.code || CONFIG_ENTITY_TYPES[0].code
  );
  const [entitySearch, setEntitySearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingEntity, setEditingEntity] = useState<ExtendedEntity | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntity, setNewEntity] = useState<Record<string, unknown>>({ code: '', nameEn: '', nameZh: '', nameJa: '' });
  // State for parent entity options (for entityRef type fields)
  const [parentEntities, setParentEntities] = useState<Record<string, { value: string; label: string }[]>>({});

  // Fetch config entities for selected type
  const fetchConfigEntities = useCallback(async (entityType: string) => {
    setIsLoading(true);
    try {
      // Use custom fetcher if provided
      if (customFetcher) {
        const customData = await customFetcher(entityType);
        if (customData && customData.length > 0) {
          setConfigEntities(prev => ({
            ...prev,
            [entityType]: customData,
          }));
          setIsLoading(false);
          return;
        }
      }
      
      // Default: use configEntityApi
      const response = await configEntityApi.list(entityType, {
        scopeType,
        scopeId,
        includeInherited: true,
      });
      if (response.success && response.data) {
        const data = response.data;
        setConfigEntities(prev => ({
          ...prev,
          [entityType]: data.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            code: item.code as string,
            nameEn: (item.nameEn as string) || '',
            nameZh: (item.nameZh as string) || '',
            nameJa: (item.nameJa as string) || '',
            ownerType: (item.ownerType as ScopeType) || 'tenant',
            ownerLevel: (item.ownerLevel as string) || 'Tenant',
            isActive: (item.isActive as boolean) ?? true,
            isForceUse: (item.isForceUse as boolean) ?? false,
            isSystem: (item.isSystem as boolean) ?? false,
            sortOrder: (item.sortOrder as number) || 0,
            inheritedFrom: (item.inheritedFrom as string) || undefined,
            // Preserve all other custom fields
            ...item,
          })),
        }));
      }
    } catch {
      // Keep empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [scopeType, scopeId, customFetcher]);

  // Fetch entities when type changes
  useEffect(() => {
    fetchConfigEntities(selectedEntityType);
  }, [selectedEntityType, fetchConfigEntities]);

  // Entity handlers
  const handleToggleActive = async (entityId: string) => {
    const entity = configEntities[selectedEntityType]?.find(e => e.id === entityId);
    if (!entity || entity.inheritedFrom || !canEdit) return;

    try {
      if (entity.isActive) {
        await configEntityApi.deactivate(selectedEntityType, entityId, 1);
      } else {
        await configEntityApi.reactivate(selectedEntityType, entityId, 1);
      }
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleToggleForceUse = async (entityId: string) => {
    const entity = configEntities[selectedEntityType]?.find(e => e.id === entityId);
    if (!entity || entity.isSystem || entity.inheritedFrom || !canEdit) return;

    try {
      await configEntityApi.update(selectedEntityType, entityId, {
        isForceUse: !entity.isForceUse,
        version: 1,
      });
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleEditEntity = (entity: ConfigEntity) => {
    setEditingEntity({ ...entity });
    setShowEditDialog(true);
  };

  const handleSaveEntity = async () => {
    if (!editingEntity) return;
    try {
      // Build payload with base fields
      const payload: Record<string, unknown> = {
        nameEn: editingEntity.nameEn,
        nameZh: editingEntity.nameZh,
        nameJa: editingEntity.nameJa,
        version: 1,
      };

      // Add custom fields to payload
      for (const field of extraDialogFields) {
        if (editingEntity[field.key] !== undefined) {
          payload[field.key] = editingEntity[field.key];
        }
      }

      await configEntityApi.update(selectedEntityType, editingEntity.id, payload as Parameters<typeof configEntityApi.update>[2]);
      toast.success(tc('success'));
      setShowEditDialog(false);
      setEditingEntity(null);
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleAddEntity = async () => {
    const code = String(newEntity.code || '');
    const nameEn = String(newEntity.nameEn || '');
    const nameZh = String(newEntity.nameZh || '');
    const nameJa = String(newEntity.nameJa || '');
    
    if (!code || !nameEn) {
      toast.error(tc('requiredFields'));
      return;
    }

    // Check required custom fields
    for (const field of extraDialogFields) {
      if (field.required && !newEntity[field.key]) {
        toast.error(tc('requiredFields'));
        return;
      }
    }

    try {
      // Build payload with all fields including custom ones
      const payload: Record<string, unknown> = {
        code: code.toUpperCase(),
        nameEn,
        nameZh,
        nameJa,
        scopeType,
        scopeId,
      };

      // Add custom fields to payload
      for (const field of extraDialogFields) {
        if (newEntity[field.key] !== undefined) {
          payload[field.key] = newEntity[field.key];
        }
      }

      await configEntityApi.create(selectedEntityType, payload as Parameters<typeof configEntityApi.create>[1]);
      toast.success(tc('success'));
      setShowAddDialog(false);
      setNewEntity({ code: '', nameEn: '', nameZh: '', nameJa: '' });
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };


  const handleDuplicateEntity = async (entity: ConfigEntity) => {
    try {
      await configEntityApi.create(selectedEntityType, {
        code: `${entity.code}_COPY`,
        nameEn: `${entity.nameEn} (Copy)`,
        nameZh: entity.nameZh,
        nameJa: entity.nameJa,
        scopeType,
        scopeId,
      });
      toast.success(tc('success'));
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  const handleDisableEntity = async (entityId: string) => {
    const entity = configEntities[selectedEntityType]?.find(e => e.id === entityId);
    if (!entity || entity.inheritedFrom || entity.isSystem) return;

    try {
      await configEntityApi.deactivate(selectedEntityType, entityId, 1);
      fetchConfigEntities(selectedEntityType);
    } catch {
      toast.error(tc('error'));
    }
  };

  // Filter entities
  const filteredEntities = useMemo(() => {
    const entities = configEntities[selectedEntityType] || [];
    if (!entitySearch) return entities;
    const search = entitySearch.toLowerCase();
    return entities.filter(e =>
      e.code.toLowerCase().includes(search) ||
      e.nameEn.toLowerCase().includes(search) ||
      e.nameZh.includes(search)
    );
  }, [selectedEntityType, entitySearch, configEntities]);

  const selectedEntityTypeInfo = CONFIG_ENTITY_TYPES.find(t => t.code === selectedEntityType);

  // Source badge helper
  const getSourceBadge = (entity: ConfigEntity) => {
    if (entity.inheritedFrom === 'Tenant') {
      return <Badge variant="secondary" className="text-xs">{tc('tenant')}</Badge>;
    } else if (entity.inheritedFrom === 'Subsidiary') {
      return <Badge className="bg-amber-500 text-xs">{tc('subsidiary')}</Badge>;
    } else {
      return <Badge className="bg-pink-500 text-xs">{tc('local')}</Badge>;
    }
  };

  // Get custom columns for current entity type
  const extraColumns = useMemo(() => {
    if (!customColumns) return [];
    return customColumns(selectedEntityType);
  }, [customColumns, selectedEntityType]);

  // Get custom dialog fields for current entity type
  const extraDialogFields = useMemo(() => {
    if (!customDialogFields) return [];
    return customDialogFields(selectedEntityType);
  }, [customDialogFields, selectedEntityType]);

  // Load parent entity options for entityRef fields when dialog opens
  useEffect(() => {
    if (!showAddDialog && !showEditDialog) return;
    
    const refFields = extraDialogFields.filter(f => f.type === 'entityRef' && f.refEntityType);
    if (refFields.length === 0) return;

    const loadParentEntities = async () => {
      const updates: Record<string, { value: string; label: string }[]> = {};
      
      for (const field of refFields) {
        const refType = field.refEntityType || '';
        // Skip if already loaded
        if (parentEntities[refType]) continue;
        
        try {
          const response = await configEntityApi.list(refType, {
            scopeType,
            scopeId,
            includeInherited: true,
          });
          if (response.success && response.data) {
            updates[refType] = response.data.map((item: Record<string, unknown>) => ({
              value: item.id as string,
              label: `${item.nameEn || item.code} (${item.code})`,
            }));
          }
        } catch {
          // Keep empty array on error
          updates[refType] = [];
        }
      }
      
      if (Object.keys(updates).length > 0) {
        setParentEntities(prev => ({ ...prev, ...updates }));
      }
    };

    loadParentEntities();
  }, [showAddDialog, showEditDialog, extraDialogFields, scopeType, scopeId, parentEntities]);

  // Render a custom field input based on field type
  const renderCustomField = (
    field: CustomDialogField,
    value: unknown,
    onChange: (value: unknown) => void
  ) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={String(value || '')}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
          />
        );
      case 'select':
        return (
          <Select value={String(value || '')} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || tc('select')} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'entityRef': {
        const options = field.refEntityType ? parentEntities[field.refEntityType] || [] : [];
        const isLoading = Boolean(field.refEntityType && !parentEntities[field.refEntityType]);
        return (
          <Select value={String(value || '')} onValueChange={onChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Loading...' : (field.placeholder || tc('select'))} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'switch':
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={onChange}
          />
        );
      case 'color':
        return (
          <Input
            type="color"
            value={String(value || '#000000')}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-20 p-1"
          />
        );
      default:
        return null;
    }
  };

  // Calculate total column count for empty state colspan
  const totalColumns = 6 + extraColumns.length;

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Left Panel - Entity Types */}
      <Card className="col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('entityTypes')}</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-420px)]">
            <div className="space-y-1">
              {CONFIG_ENTITY_TYPES.map((type) => {
                const count = (configEntities[type.code] || []).length;
                return (
                  <button
                    key={type.code}
                    onClick={() => setSelectedEntityType(type.code)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                      selectedEntityType === type.code
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{type.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{type.name}</p>
                        <p className="text-xs text-muted-foreground">{type.nameZh}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel - Entity Records */}
      <Card className="col-span-9">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{selectedEntityTypeInfo?.icon}</span>
                {selectedEntityTypeInfo?.name}
              </CardTitle>
              <CardDescription>{selectedEntityTypeInfo?.description}</CardDescription>
            </div>
            {canEdit && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus size={16} className="mr-2" />
                {t('addRecord')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder={t('searchRecords')}
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[calc(100vh-500px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">{tc('code')}</TableHead>
                    <TableHead>{tc('name')}</TableHead>
                    {/* Extra columns from customColumns */}
                    {extraColumns.map((col) => (
                      <TableHead key={col.key} className={col.width ? `w-[${col.width}]` : undefined}>
                        {col.header}
                      </TableHead>
                    ))}
                    <TableHead className="w-[100px]">{tc('source')}</TableHead>
                    <TableHead className="w-[80px]">{tc('status')}</TableHead>
                    <TableHead className="w-[100px]">{tc('forceUse')}</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={totalColumns} className="text-center py-8 text-muted-foreground">
                        {t('noRecordsClickAdd')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntities.map((entity) => (
                      <TableRow key={entity.id} className="group">
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            {entity.code}
                            {entity.isSystem && (
                              <Lock size={12} className="text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entity.nameEn}</p>
                            <p className="text-xs text-muted-foreground">{entity.nameZh}</p>
                          </div>
                        </TableCell>
                        {/* Extra column cells from customColumns */}
                        {extraColumns.map((col) => (
                          <TableCell key={col.key}>
                            {col.render(entity)}
                          </TableCell>
                        ))}
                        <TableCell>
                          {getSourceBadge(entity)}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => !entity.inheritedFrom && handleToggleActive(entity.id)}
                            disabled={!!entity.inheritedFrom || !canEdit}
                            className="cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                              {entity.isActive ? tc('active') : tc('inactive')}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={entity.isForceUse}
                            disabled={entity.isSystem || !!entity.inheritedFrom || !canEdit}
                            onCheckedChange={() => handleToggleForceUse(entity.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {!entity.inheritedFrom && canEdit ? (
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
                                <DropdownMenuItem onClick={() => handleEditEntity(entity)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  {tc('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateEntity(entity)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  {tc('duplicate')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {!entity.isSystem && entity.isActive && (
                                  <DropdownMenuItem
                                    className="text-orange-500"
                                    onClick={() => handleDisableEntity(entity.id)}
                                  >
                                    <Lock className="mr-2 h-4 w-4" />
                                    {tc('disable')}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground">{tc('inherited')}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc('edit')} {selectedEntityTypeInfo?.name}</DialogTitle>
            <DialogDescription>
              {editingEntity?.code}
            </DialogDescription>
          </DialogHeader>
          {editingEntity && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{tc('nameEn')}</Label>
                <Input
                  value={editingEntity.nameEn}
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameEn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('nameZh')}</Label>
                <Input
                  value={editingEntity.nameZh}
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameZh: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tc('nameJa')}</Label>
                <Input
                  value={editingEntity.nameJa}
                  onChange={(e) => setEditingEntity({ ...editingEntity, nameJa: e.target.value })}
                />
              </div>
              {/* Custom dialog fields */}
              {extraDialogFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}{field.required && ' *'}</Label>
                  {renderCustomField(
                    field,
                    editingEntity[field.key],
                    (value) => setEditingEntity({ ...editingEntity, [field.key]: value })
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSaveEntity}>{tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addRecord')}</DialogTitle>
            <DialogDescription>
              {selectedEntityTypeInfo?.name} - {selectedEntityTypeInfo?.nameZh}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{tc('code')} *</Label>
              <Input
                value={String(newEntity.code || '')}
                onChange={(e) => setNewEntity({ ...newEntity, code: e.target.value })}
                placeholder="ENTITY_CODE"
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('nameEn')} *</Label>
              <Input
                value={String(newEntity.nameEn || '')}
                onChange={(e) => setNewEntity({ ...newEntity, nameEn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('nameZh')}</Label>
              <Input
                value={String(newEntity.nameZh || '')}
                onChange={(e) => setNewEntity({ ...newEntity, nameZh: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('nameJa')}</Label>
              <Input
                value={String(newEntity.nameJa || '')}
                onChange={(e) => setNewEntity({ ...newEntity, nameJa: e.target.value })}
              />
            </div>
            {/* Custom dialog fields */}
            {extraDialogFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}{field.required && ' *'}</Label>
                {renderCustomField(
                  field,
                  newEntity[field.key],
                  (value) => setNewEntity({ ...newEntity, [field.key]: value })
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleAddEntity}>{tc('add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
