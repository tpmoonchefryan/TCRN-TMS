// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Plus, RefreshCw, Shield, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';


import { BlocklistForm } from './BlocklistForm';
import { BlocklistTable } from './BlocklistTable';
import { PatternTester } from './PatternTester';

import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Switch,
  Label,
} from '@/components/ui';
import { securityApi } from '@/lib/api/client';

export interface BlocklistEntry {
  id: string;
  ownerType: string;
  ownerId: string | null;
  pattern: string;
  patternType: 'keyword' | 'regex' | 'wildcard';
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  category: string | null;
  severity: 'low' | 'medium' | 'high';
  action: 'reject' | 'flag' | 'replace';
  replacement: string;
  scope: string[];
  inherit: boolean;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  matchCount: number;
  lastMatchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  // Inheritance metadata
  isInherited: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
}

interface BlocklistManagerProps {
  scopeType?: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string;
}

export function BlocklistManager({ scopeType = 'tenant', scopeId }: BlocklistManagerProps) {
  const t = useTranslations('security');
  const [entries, setEntries] = useState<BlocklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BlocklistEntry | null>(null);
  const [showInherited, setShowInherited] = useState(true);
  const [showDisabled, setShowDisabled] = useState(false);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await securityApi.getBlocklistEntries({
        scopeType,
        scopeId,
        includeInherited: showInherited,
        includeDisabled: showDisabled,
      });
      if (response.success && response.data) {
        // Transform API response to component format
        const items = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).items || [];
        setEntries(items.map((item: any) => ({
          id: item.id,
          ownerType: item.owner_type || item.ownerType || 'tenant',
          ownerId: item.owner_id || item.ownerId || null,
          pattern: item.pattern,
          patternType: item.pattern_type || item.patternType || 'keyword',
          nameEn: item.name_en || item.nameEn || item.name || '',
          nameZh: item.name_zh || item.nameZh || null,
          nameJa: item.name_ja || item.nameJa || null,
          description: item.description || null,
          category: item.category || null,
          severity: item.severity || 'medium',
          action: item.action || 'reject',
          replacement: item.replacement || '***',
          scope: item.scope || ['marshmallow'],
          inherit: item.inherit ?? true,
          sortOrder: item.sort_order ?? item.sortOrder ?? 0,
          isActive: item.is_active ?? item.isActive ?? true,
          isForceUse: item.is_force_use ?? item.isForceUse ?? false,
          isSystem: item.is_system ?? item.isSystem ?? false,
          matchCount: item.match_count || item.matchCount || 0,
          lastMatchedAt: item.last_matched_at || item.lastMatchedAt || null,
          createdAt: item.created_at || item.createdAt || '',
          updatedAt: item.updated_at || item.updatedAt || '',
          version: item.version || 1,
          isInherited: item.isInherited ?? false,
          isDisabledHere: item.isDisabledHere ?? false,
          canDisable: item.canDisable ?? false,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch blocklist entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [scopeType, scopeId, showInherited, showDisabled]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleCreate = async (data: Partial<BlocklistEntry>) => {
    try {
      await securityApi.createBlocklistEntry({
        ownerType: scopeType,
        ownerId: scopeId,
        pattern: data.pattern!,
        patternType: data.patternType || 'keyword',
        nameEn: data.nameEn!,
        action: data.action || 'reject',
        severity: data.severity || 'medium',
        scope: data.scope || ['marshmallow'],
        sortOrder: data.sortOrder ?? 0,
        isForceUse: data.isForceUse ?? false,
      });
      setShowForm(false);
      fetchEntries();
    } catch (error) {
      console.error('Failed to create blocklist entry:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<BlocklistEntry>) => {
    try {
      await securityApi.updateBlocklistEntry(id, {
        pattern: data.pattern,
        pattern_type: data.patternType,
        name_en: data.nameEn,
        action: data.action,
        severity: data.severity,
        scope: data.scope,
        is_active: data.isActive,
        sort_order: data.sortOrder,
        is_force_use: data.isForceUse,
        version: data.version,
      });
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      console.error('Failed to update blocklist entry:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    
    try {
      await securityApi.deleteBlocklistEntry(id);
      fetchEntries();
    } catch (error) {
      console.error('Failed to delete blocklist entry:', error);
    }
  };

  const handleToggleActive = async (entry: BlocklistEntry) => {
    await handleUpdate(entry.id, {
      ...entry,
      isActive: !entry.isActive,
    });
  };

  const handleDisable = async (entry: BlocklistEntry) => {
    try {
      await securityApi.disableBlocklistEntry(entry.id, {
        scopeType,
        scopeId,
      });
      fetchEntries();
    } catch (error) {
      console.error('Failed to disable blocklist entry:', error);
    }
  };

  const handleEnable = async (entry: BlocklistEntry) => {
    try {
      await securityApi.enableBlocklistEntry(entry.id, {
        scopeType,
        scopeId,
      });
      fetchEntries();
    } catch (error) {
      console.error('Failed to enable blocklist entry:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-orange-500" />
              <div>
                <CardTitle>{t('blocklistManager')}</CardTitle>
                <CardDescription>{t('blocklistDescription')}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchEntries} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addPattern')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {scopeType !== 'tenant' && (
            <div className="flex items-center gap-6 mb-4 p-3 bg-muted/50 rounded-lg">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Switch
                  id="show-inherited"
                  checked={showInherited}
                  onCheckedChange={setShowInherited}
                />
                <Label htmlFor="show-inherited" className="text-sm">
                  {t('showInherited')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-disabled"
                  checked={showDisabled}
                  onCheckedChange={setShowDisabled}
                />
                <Label htmlFor="show-disabled" className="text-sm">
                  {t('showDisabled')}
                </Label>
              </div>
            </div>
          )}
          <BlocklistTable
            entries={entries}
            isLoading={isLoading}
            scopeType={scopeType}
            scopeId={scopeId}
            onEdit={setEditingEntry}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onDisable={handleDisable}
            onEnable={handleEnable}
          />
        </CardContent>
      </Card>

      {/* Pattern Tester */}
      <PatternTester />

      {/* Create/Edit Form Dialog */}
      {(showForm || editingEntry) && (
        <BlocklistForm
          entry={editingEntry}
          onSubmit={editingEntry 
            ? (data) => handleUpdate(editingEntry.id, data)
            : handleCreate
          }
          onCancel={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}
