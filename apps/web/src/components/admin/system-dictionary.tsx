// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    BookOpen,
    Clock,
    Coins,
    Edit,
    Globe,
    Languages,
    Loader2,
    Lock,
    MapPin,
    MoreHorizontal,
    Plug,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    User,
    Webhook,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Input,
    Label,
    ScrollArea,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Textarea
} from '@/components/ui';
import { dictionaryApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

// Icon mapping for dictionary types
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  countries: MapPin,
  languages: Languages,
  timezones: Clock,
  currencies: Coins,
  genders: User,
  profile_types: User,
  adapter_types: Plug,
  webhook_events: Webhook,
  job_statuses: Clock,
  log_severities: BookOpen,
};

interface DictionaryType {
  type: string;
  name: string;
  description: string | null;
  count: number;
}

interface DictionaryItem {
  id: string;
  dictionaryCode: string;
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  descriptionJa?: string | null;
  sortOrder: number;
  isActive: boolean;
  extraData?: Record<string, unknown> | null;
  version: number;
  name: string; // Localized name from API
}

export function SystemDictionary() {
  const t = useTranslations('adminConsole.dictionary');
  const tCommon = useTranslations('common');
  const { isAcTenant } = useAuthStore();

  // State
  const [dictionaryTypes, setDictionaryTypes] = useState<DictionaryType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Dictionary items state
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  // Add/Edit Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  const [newItem, setNewItem] = useState({
    code: '',
    nameEn: '',
    nameZh: '',
    nameJa: '',
    descriptionEn: '',
    descriptionZh: '',
    descriptionJa: '',
    sortOrder: 0,
    extraData: '',
  });

  // Get icon for dictionary type
  const getIcon = (typeCode: string) => {
    return ICON_MAP[typeCode] || BookOpen;
  };

  // Fetch dictionary types from API
  const fetchDictionaryTypes = useCallback(async () => {
    setIsLoadingTypes(true);
    try {
      const response = await dictionaryApi.listTypes();
      if (response.success && response.data) {
        setDictionaryTypes(response.data);
      }
    } catch (err: any) {
      toast.error('Failed to fetch dictionary types', { description: err.message });
    } finally {
      setIsLoadingTypes(false);
    }
  }, []);

  // Fetch dictionary items from API
  const fetchItems = useCallback(async (typeCode: string, options?: { search?: string; showInactive?: boolean }) => {
    setIsLoading(true);
    try {
      const response = await dictionaryApi.getByType(typeCode, {
        search: options?.search || undefined,
        includeInactive: isAcTenant ? (options?.showInactive ?? false) : false,
        pageSize: 500,
      });
      if (response.success && response.data) {
        setItems(response.data.map((item: any) => ({
          id: item.id,
          dictionaryCode: item.dictionaryCode || item.dictionary_code || typeCode,
          code: item.code,
          nameEn: item.nameEn || item.name_en || '',
          nameZh: item.nameZh || item.name_zh || null,
          nameJa: item.nameJa || item.name_ja || null,
          descriptionEn: item.descriptionEn || item.description_en || null,
          descriptionZh: item.descriptionZh || item.description_zh || null,
          descriptionJa: item.descriptionJa || item.description_ja || null,
          sortOrder: item.sortOrder ?? item.sort_order ?? 0,
          isActive: item.isActive ?? item.is_active ?? true,
          extraData: item.extraData || item.extra_data || null,
          version: item.version ?? 1,
          name: item.name || item.nameEn || item.name_en || '',
        })));
        setTotalItems(response.meta?.pagination?.totalCount || response.data.length);
      }
    } catch (err: any) {
      toast.error('Failed to fetch items', { description: err.message });
      setItems([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAcTenant]);

  // Load dictionary types on mount
  useEffect(() => {
    fetchDictionaryTypes();
  }, [fetchDictionaryTypes]);

  // Load items when type changes
  useEffect(() => {
    if (selectedType) {
      fetchItems(selectedType, { search: searchQuery, showInactive: includeInactive });
    }
  }, [selectedType, searchQuery, includeInactive, fetchItems]);

  // Filter items based on search (client-side for quick filtering)
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const search = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(search) ||
        item.nameEn.toLowerCase().includes(search) ||
        (item.nameZh && item.nameZh.includes(searchQuery)) ||
        (item.nameJa && item.nameJa.includes(searchQuery))
    );
  }, [items, searchQuery]);

  // Get selected type info
  const selectedTypeInfo = dictionaryTypes.find((t) => t.type === selectedType);

  // Handlers
  const handleRefresh = () => {
    if (selectedType) {
      fetchItems(selectedType, { search: searchQuery, showInactive: includeInactive });
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setNewItem({
      code: '',
      nameEn: '',
      nameZh: '',
      nameJa: '',
      descriptionEn: '',
      descriptionZh: '',
      descriptionJa: '',
      sortOrder: items.length,
      extraData: '',
    });
    setShowAddDialog(true);
  };

  const handleEdit = (item: DictionaryItem) => {
    setEditingItem(item);
    setNewItem({
      code: item.code,
      nameEn: item.nameEn,
      nameZh: item.nameZh || '',
      nameJa: item.nameJa || '',
      descriptionEn: item.descriptionEn || '',
      descriptionZh: item.descriptionZh || '',
      descriptionJa: item.descriptionJa || '',
      sortOrder: item.sortOrder,
      extraData: item.extraData ? JSON.stringify(item.extraData, null, 2) : '',
    });
    setShowAddDialog(true);
  };

  const handleSaveItem = async () => {
    if (!selectedType || !newItem.code || !newItem.nameEn) {
      toast.error('Code and English name are required');
      return;
    }

    // Parse extraData if provided
    let extraData: Record<string, unknown> | undefined;
    if (newItem.extraData.trim()) {
      try {
        extraData = JSON.parse(newItem.extraData);
      } catch {
        toast.error('Invalid JSON in Extra Data field');
        return;
      }
    }

    try {
      if (editingItem) {
        // Update existing
        await dictionaryApi.updateItem(selectedType, editingItem.id, {
          nameEn: newItem.nameEn,
          nameZh: newItem.nameZh || undefined,
          nameJa: newItem.nameJa || undefined,
          descriptionEn: newItem.descriptionEn || undefined,
          descriptionZh: newItem.descriptionZh || undefined,
          descriptionJa: newItem.descriptionJa || undefined,
          sortOrder: newItem.sortOrder,
          extraData,
          version: editingItem.version,
        });
        toast.success('Updated successfully');
      } else {
        // Create new
        await dictionaryApi.createItem(selectedType, {
          code: newItem.code.toUpperCase().replace(/\s+/g, '_'),
          nameEn: newItem.nameEn,
          nameZh: newItem.nameZh || undefined,
          nameJa: newItem.nameJa || undefined,
          descriptionEn: newItem.descriptionEn || undefined,
          descriptionZh: newItem.descriptionZh || undefined,
          descriptionJa: newItem.descriptionJa || undefined,
          sortOrder: newItem.sortOrder,
          extraData,
        });
        toast.success('Created successfully');
      }
      setShowAddDialog(false);
      fetchItems(selectedType, { search: searchQuery, showInactive: includeInactive });
    } catch (err: any) {
      toast.error('Operation failed', { description: err.message });
    }
  };

  const handleDeactivate = async (item: DictionaryItem) => {
    if (!selectedType) return;
    if (!confirm(`Are you sure you want to deactivate "${item.nameEn}"?`)) {
      return;
    }

    try {
      await dictionaryApi.deactivateItem(selectedType, item.id, item.version);
      toast.success('Deactivated successfully');
      fetchItems(selectedType, { search: searchQuery, showInactive: includeInactive });
    } catch (err: any) {
      toast.error('Failed to deactivate', { description: err.message });
    }
  };

  const handleReactivate = async (item: DictionaryItem) => {
    if (!selectedType) return;

    try {
      await dictionaryApi.reactivateItem(selectedType, item.id, item.version);
      toast.success('Reactivated successfully');
      fetchItems(selectedType, { search: searchQuery, showInactive: includeInactive });
    } catch (err: any) {
      toast.error('Failed to reactivate', { description: err.message });
    }
  };

  // Loading state for types
  if (isLoadingTypes) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={48} className="animate-spin text-purple-400" />
      </div>
    );
  }

  // Type Selection View (no type selected)
  if (!selectedType) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen size={18} className="text-purple-600" />
                {t('systemDictionaries') || 'System Dictionaries'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isAcTenant
                  ? (t('acTenantDesc') || 'Platform-level reference data. You can edit these as an AC administrator.')
                  : (t('generalTenantDesc') || 'System-wide reference data. Read-only for standard tenants.')}
              </p>
            </div>
            {isAcTenant && (
              <Badge variant="default" className="bg-purple-600">
                <Edit size={12} className="mr-1" />
                {t('editableLabel') || 'AC Editable'}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dictionaryTypes.map((type) => {
              const IconComponent = getIcon(type.type);
              return (
                <Card
                  key={type.type}
                  className={cn(
                    'border hover:shadow-md transition-shadow cursor-pointer',
                    isAcTenant ? 'hover:border-purple-300' : 'hover:border-slate-300'
                  )}
                  onClick={() => setSelectedType(type.type)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        isAcTenant ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-slate-100 dark:bg-slate-800'
                      )}>
                        <IconComponent size={20} className={isAcTenant ? 'text-purple-600' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm">{type.name}</h4>
                          {!isAcTenant && (
                            <Lock size={12} className="text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{type.count} items</p>
                        {type.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{type.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Detail View (type selected) - Left/Right Split Layout
  const IconComponent = selectedTypeInfo ? getIcon(selectedType) : BookOpen;

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Left Panel - Type List */}
      <Card className="col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('types') || 'Types'}</CardTitle>
          <CardDescription className="text-xs">
            {t('selectType') || 'Select a type to view'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-420px)]">
            <div className="space-y-1">
              {dictionaryTypes.map((type) => {
                const TypeIcon = getIcon(type.type);
                return (
                  <button
                    key={type.type}
                    onClick={() => {
                      setSelectedType(type.type);
                      setSearchQuery('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                      selectedType === type.type
                        ? isAcTenant
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-slate-100 dark:bg-slate-800'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <TypeIcon size={16} className={selectedType === type.type && isAcTenant ? 'text-purple-600' : 'text-slate-400'} />
                      <div>
                        <p className="font-medium text-sm">{type.name}</p>
                        <p className="text-xs text-muted-foreground">{type.count} items</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel - Records */}
      <Card className="col-span-9">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconComponent size={20} className={isAcTenant ? 'text-purple-600' : 'text-slate-500'} />
                {selectedTypeInfo?.name || selectedType}
              </CardTitle>
              <CardDescription>
                {selectedTypeInfo?.description}
                {!isAcTenant && ' - ' + (t('readOnlyMessage') || 'Read-only system data')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isAcTenant ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                    <RefreshCw size={14} className={cn('mr-2', isLoading && 'animate-spin')} />
                    {tCommon('refresh')}
                  </Button>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={handleAdd}>
                    <Plus size={14} className="mr-2" />
                    {t('addRecord') || 'Add Record'}
                  </Button>
                </>
              ) : (
                <Badge variant="outline">
                  <Lock size={12} className="mr-1" />
                  {t('readOnlyLabel') || 'Read Only'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder={tCommon('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAcTenant && (
              <Button
                variant={includeInactive ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIncludeInactive(!includeInactive)}
              >
                {includeInactive ? (t('hideInactive') || 'Hide Inactive') : (t('showInactive') || 'Show Inactive')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[calc(100vh-500px)]">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 size={48} className="mx-auto mb-4 text-purple-400 animate-spin" />
                <p>{t('loading') || 'Loading...'}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <IconComponent size={48} className="mx-auto mb-4 opacity-30" />
                <p>{searchQuery ? (t('noSearchResults') || 'No results found') : (t('noRecords') || 'No records')}</p>
                {isAcTenant && !searchQuery && (
                  <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={handleAdd}>
                    <Plus size={14} className="mr-2" />
                    {t('addFirstRecord') || 'Add First Record'}
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">{t('tableCode') || 'Code'}</TableHead>
                    <TableHead>{t('tableEnglish') || 'English'}</TableHead>
                    <TableHead>{t('tableChinese') || 'Chinese'}</TableHead>
                    <TableHead>{t('tableJapanese') || 'Japanese'}</TableHead>
                    <TableHead className="w-[80px]">{t('tableSort') || 'Sort'}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('status')}</TableHead>
                    {isAcTenant && <TableHead className="w-[80px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell>{item.nameEn}</TableCell>
                      <TableCell>{item.nameZh}</TableCell>
                      <TableCell>{item.nameJa}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.sortOrder}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
                          {item.isActive ? tCommon('active') : tCommon('inactive')}
                        </Badge>
                      </TableCell>
                      {isAcTenant && (
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
                              <DropdownMenuItem onClick={() => handleEdit(item)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {tCommon('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {item.isActive ? (
                                <DropdownMenuItem
                                  className="text-red-500"
                                  onClick={() => handleDeactivate(item)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('deactivate') || 'Deactivate'}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleReactivate(item)}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  {t('reactivate') || 'Reactivate'}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          <div className="mt-2 text-xs text-muted-foreground">
            {t('totalItems', { count: totalItems }) || `Total: ${totalItems} items`}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog (AC only) */}
      {isAcTenant && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? (t('editRecord') || 'Edit Record') : (t('addRecord') || 'Add Record')}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? (t('editRecordDesc') || 'Update the record details')
                  : (t('addRecordDesc') || 'Create a new record')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>{t('tableCode') || 'Code'} *</Label>
                <Input
                  value={newItem.code}
                  onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                  placeholder="e.g., MY_CODE"
                  disabled={!!editingItem}
                />
                <p className="text-xs text-muted-foreground">
                  {t('codeHint') || 'Uppercase letters, numbers, and underscores only'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tableEnglish') || 'English Name'} *</Label>
                  <Input
                    value={newItem.nameEn}
                    onChange={(e) => setNewItem({ ...newItem, nameEn: e.target.value })}
                    placeholder="English name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('tableSort') || 'Sort Order'}</Label>
                  <Input
                    type="number"
                    value={newItem.sortOrder}
                    onChange={(e) => setNewItem({ ...newItem, sortOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tableChinese') || 'Chinese Name'}</Label>
                  <Input
                    value={newItem.nameZh}
                    onChange={(e) => setNewItem({ ...newItem, nameZh: e.target.value })}
                    placeholder="中文名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('tableJapanese') || 'Japanese Name'}</Label>
                  <Input
                    value={newItem.nameJa}
                    onChange={(e) => setNewItem({ ...newItem, nameJa: e.target.value })}
                    placeholder="日本語名"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('descriptionEn') || 'Description (English)'}</Label>
                <Textarea
                  value={newItem.descriptionEn}
                  onChange={(e) => setNewItem({ ...newItem, descriptionEn: e.target.value })}
                  placeholder="Description in English"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('extraData') || 'Extra Data (JSON)'}</Label>
                <Textarea
                  value={newItem.extraData}
                  onChange={(e) => setNewItem({ ...newItem, extraData: e.target.value })}
                  placeholder='{"key": "value"}'
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t('extraDataHint') || 'Optional JSON data for additional properties (e.g., symbol, offset)'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleSaveItem} className="bg-purple-600 hover:bg-purple-700">
                {editingItem ? tCommon('save') : (t('create') || 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
