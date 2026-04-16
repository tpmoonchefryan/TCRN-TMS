// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Copy, Edit, Loader2, Lock, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import {
  CONFIG_ENTITY_TYPES,
  type ConfigEntity,
} from '@/components/shared/constants';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { filterConfigEntities } from './utils';

interface TalentConfigEntitiesTabProps {
  configEntities: Record<string, ConfigEntity[]>;
  selectedEntityType: string;
  entitySearch: string;
  isLoadingConfig: boolean;
  onSelectedEntityTypeChange: (value: string) => void;
  onEntitySearchChange: (value: string) => void;
  t: (key: string) => string;
  tc: (key: string) => string;
  tTalent: (key: string) => string;
}

function getSourceBadge(entity: ConfigEntity, tc: (key: string) => string) {
  if (entity.inheritedFrom === 'Tenant') {
    return (
      <Badge variant="secondary" className="text-xs">
        {tc('tenant')}
      </Badge>
    );
  }

  if (entity.inheritedFrom === 'Subsidiary') {
    return <Badge className="bg-amber-500 text-xs">{tc('subsidiary')}</Badge>;
  }

  return <Badge className="bg-pink-500 text-xs">{tc('local')}</Badge>;
}

export function TalentConfigEntitiesTab({
  configEntities,
  selectedEntityType,
  entitySearch,
  isLoadingConfig,
  onSelectedEntityTypeChange,
  onEntitySearchChange,
  t,
  tc,
  tTalent,
}: TalentConfigEntitiesTabProps) {
  const locale = useLocale() as 'en' | 'zh' | 'ja';
  const filteredEntities = useMemo(
    () => filterConfigEntities(configEntities, selectedEntityType, entitySearch),
    [configEntities, selectedEntityType, entitySearch]
  );

  const selectedEntityTypeInfo = CONFIG_ENTITY_TYPES.find(
    (type) => type.code === selectedEntityType
  );
  const getEntityName = (type: (typeof CONFIG_ENTITY_TYPES)[number]) => {
    if (locale === 'zh') {
      return type.nameZh;
    }
    if (locale === 'ja') {
      return type.nameJa;
    }
    return type.name;
  };
  const getEntityDescription = (type: (typeof CONFIG_ENTITY_TYPES)[number]) => {
    if (locale === 'zh') {
      return type.descriptionZh;
    }
    if (locale === 'ja') {
      return type.descriptionJa;
    }
    return type.description;
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
      <Card className="col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tTalent('entityTypes')}</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-420px)]">
            <div className="space-y-1">
              {CONFIG_ENTITY_TYPES.map((type) => {
                const count = (configEntities[type.code] || []).length;
                return (
                  <button
                    key={type.code}
                    onClick={() => onSelectedEntityTypeChange(type.code)}
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
                        <p className="font-medium text-sm">{getEntityName(type)}</p>
                        <p className="text-xs text-muted-foreground">{type.code}</p>
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

      <Card className="col-span-9">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{selectedEntityTypeInfo?.icon}</span>
                {selectedEntityTypeInfo ? getEntityName(selectedEntityTypeInfo) : null}
              </CardTitle>
              <CardDescription>
                {selectedEntityTypeInfo ? getEntityDescription(selectedEntityTypeInfo) : null}
              </CardDescription>
            </div>
            <Button>
              <Plus size={16} className="mr-2" />
              {t('addRecord')}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                placeholder={t('searchRecords')}
                value={entitySearch}
                onChange={(event) => onEntitySearchChange(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[calc(100vh-500px)]">
            {isLoadingConfig ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">{tc('code')}</TableHead>
                    <TableHead>{tc('name')}</TableHead>
                    <TableHead className="w-[100px]">{tc('source')}</TableHead>
                    <TableHead className="w-[80px]">{tc('status')}</TableHead>
                    <TableHead className="w-[100px]">{tc('forceUse')}</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                        <TableCell>{getSourceBadge(entity, tc)}</TableCell>
                        <TableCell>
                          <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                            {entity.isActive ? tc('active') : tc('inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={entity.isForceUse}
                            disabled={entity.isSystem || Boolean(entity.inheritedFrom)}
                          />
                        </TableCell>
                        <TableCell>
                          {!entity.inheritedFrom ? (
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
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  {tc('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  {tc('duplicate')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {!entity.isSystem && (
                                  <DropdownMenuItem className="text-orange-500">
                                    <Lock className="mr-2 h-4 w-4" />
                                    {tc('disabled')}
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
    </div>
  );
}
