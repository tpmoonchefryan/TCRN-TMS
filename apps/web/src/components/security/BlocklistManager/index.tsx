// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Filter, Plus, RefreshCw, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Label,
    Switch,
} from '@/components/ui';
import {
  type BlocklistEntryRecord,
  type BlocklistScopePayload,
  type CreateBlocklistPayload,
  securityApi,
  type SecurityScopeType,
  type UpdateBlocklistPayload,
} from '@/lib/api/modules/security';

import { BlocklistForm, type BlocklistFormValues } from './BlocklistForm';
import { BlocklistTable } from './BlocklistTable';
import { PatternTester } from './PatternTester';

export type BlocklistEntry = BlocklistEntryRecord;

interface BlocklistManagerProps {
  scopeType?: SecurityScopeType;
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
        setEntries(response.data.items);
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

  const handleCreate = async (data: BlocklistFormValues) => {
    try {
      const payload: CreateBlocklistPayload = {
        ownerType: scopeType,
        ownerId: scopeId,
        pattern: data.pattern,
        patternType: data.patternType,
        nameEn: data.nameEn,
        nameZh: data.nameZh,
        nameJa: data.nameJa,
        description: data.description,
        category: data.category,
        action: data.action,
        severity: data.severity,
        replacement: data.replacement,
        scope: data.scope,
        inherit: data.inherit,
      };

      await securityApi.createBlocklistEntry(payload);
      setShowForm(false);
      await fetchEntries();
    } catch (error) {
      console.error('Failed to create blocklist entry:', error);
    }
  };

  const handleUpdate = async (id: string, data: BlocklistFormValues) => {
    try {
      if (data.version === undefined) {
        console.error('Missing blocklist entry version for update');
        return;
      }

      const payload: UpdateBlocklistPayload = {
        pattern: data.pattern,
        patternType: data.patternType,
        nameEn: data.nameEn,
        nameZh: data.nameZh,
        nameJa: data.nameJa,
        description: data.description,
        category: data.category,
        action: data.action,
        severity: data.severity,
        replacement: data.replacement,
        scope: data.scope,
        inherit: data.inherit,
        version: data.version,
      };

      await securityApi.updateBlocklistEntry(id, payload);
      setEditingEntry(null);
      await fetchEntries();
    } catch (error) {
      console.error('Failed to update blocklist entry:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    
    try {
      await securityApi.deleteBlocklistEntry(id);
      await fetchEntries();
    } catch (error) {
      console.error('Failed to delete blocklist entry:', error);
    }
  };

  const handleDisable = async (entry: BlocklistEntry) => {
    try {
      const payload: BlocklistScopePayload = {
        scopeType,
        scopeId,
      };

      await securityApi.disableBlocklistEntry(entry.id, payload);
      await fetchEntries();
    } catch (error) {
      console.error('Failed to disable blocklist entry:', error);
    }
  };

  const handleEnable = async (entry: BlocklistEntry) => {
    try {
      const payload: BlocklistScopePayload = {
        scopeType,
        scopeId,
      };

      await securityApi.enableBlocklistEntry(entry.id, payload);
      await fetchEntries();
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
