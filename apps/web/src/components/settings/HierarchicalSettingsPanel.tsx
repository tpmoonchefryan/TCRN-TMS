/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    AlertCircle,
    Building2,
    ChevronDown,
    Info,
    Loader2,
    RotateCcw,
    Save,
    Sparkles,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScopeSettingsResponse, settingsApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// Setting field types
type SettingType = 'string' | 'number' | 'boolean' | 'select' | 'json';

// Setting field definition
interface SettingField {
  key: string;
  labelKey: string;
  type: SettingType;
  options?: { value: string; label: string }[];
  description?: string;
  category: 'general' | 'features' | 'security' | 'import';
}

// Available setting fields with their configurations
const SETTING_FIELDS: SettingField[] = [
  // General settings
  {
    key: 'defaultLanguage',
    labelKey: 'defaultLanguage',
    type: 'select',
    options: [
      { value: 'en', label: 'English' },
      { value: 'zh', label: '中文' },
      { value: 'ja', label: '日本語' },
    ],
    category: 'general',
  },
  {
    key: 'timezone',
    labelKey: 'timezone',
    type: 'select',
    options: [
      { value: 'UTC', label: 'UTC' },
      { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
      { value: 'America/New_York', label: 'America/New_York (EST)' },
      { value: 'Europe/London', label: 'Europe/London (GMT)' },
    ],
    category: 'general',
  },
  {
    key: 'dateFormat',
    labelKey: 'dateFormat',
    type: 'select',
    options: [
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    ],
    category: 'general',
  },
  {
    key: 'currency',
    labelKey: 'currency',
    type: 'select',
    options: [
      { value: 'USD', label: 'USD ($)' },
      { value: 'JPY', label: 'JPY (¥)' },
      { value: 'CNY', label: 'CNY (¥)' },
      { value: 'EUR', label: 'EUR (€)' },
    ],
    category: 'general',
  },
  // Feature settings
  {
    key: 'allowCustomHomepage',
    labelKey: 'allowCustomHomepage',
    type: 'boolean',
    category: 'features',
  },
  {
    key: 'allowMarshmallow',
    labelKey: 'allowMarshmallow',
    type: 'boolean',
    category: 'features',
  },
  // Import settings
  {
    key: 'customerImportEnabled',
    labelKey: 'customerImportEnabled',
    type: 'boolean',
    category: 'import',
  },
  {
    key: 'maxImportRows',
    labelKey: 'maxImportRows',
    type: 'number',
    category: 'import',
  },
  // Security settings
  {
    key: 'totpRequiredForAll',
    labelKey: 'totpRequiredForAll',
    type: 'boolean',
    category: 'security',
  },
  {
    key: 'passwordPolicy.minLength',
    labelKey: 'minPasswordLength',
    type: 'number',
    category: 'security',
  },
  {
    key: 'passwordPolicy.requireSpecial',
    labelKey: 'requireSpecialChar',
    type: 'boolean',
    category: 'security',
  },
  {
    key: 'passwordPolicy.maxAgeDays',
    labelKey: 'passwordMaxAgeDays',
    type: 'number',
    category: 'security',
  },
];

// Setting categories
const CATEGORIES = [
  { key: 'general', icon: Building2, labelKey: 'general' },
  { key: 'features', icon: Sparkles, labelKey: 'features' },
  { key: 'import', icon: ChevronDown, labelKey: 'import' },
  { key: 'security', icon: AlertCircle, labelKey: 'security' },
];

interface HierarchicalSettingsPanelProps {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string;
  scopeName?: string;
  readOnly?: boolean;
}

// Helper to get nested value using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

// Helper to set nested value using dot notation
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  if (keys.length === 1) {
    return { ...obj, [path]: value };
  }
  
  const result = { ...obj };
  const [firstKey, ...restKeys] = keys;
  const nestedObj = (result[firstKey] as Record<string, unknown>) || {};
  result[firstKey] = setNestedValue({ ...nestedObj }, restKeys.join('.'), value);
  return result;
}

export function HierarchicalSettingsPanel({
  scopeType,
  scopeId,
  scopeName,
  readOnly = false,
}: HierarchicalSettingsPanelProps) {
  const t = useTranslations('scopeSettings');
  const tc = useTranslations('common');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsData, setSettingsData] = useState<ScopeSettingsResponse | null>(null);
  const [editedSettings, setEditedSettings] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [resetFieldKey, setResetFieldKey] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Fetch settings based on scope type
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      let response: { success: boolean; data?: ScopeSettingsResponse };
      
      if (scopeType === 'tenant') {
        response = await settingsApi.getTenantSettings();
      } else if (scopeType === 'subsidiary' && scopeId) {
        response = await settingsApi.getSubsidiarySettings(scopeId);
      } else if (scopeType === 'talent' && scopeId) {
        response = await settingsApi.getTalentSettings(scopeId);
      } else {
        return;
      }

      if (response.success && response.data) {
        setSettingsData(response.data);
        setEditedSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error(t('settingsFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [scopeType, scopeId, t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Check if settings have been modified
  useEffect(() => {
    if (!settingsData) return;
    const changed = JSON.stringify(editedSettings) !== JSON.stringify(settingsData.settings);
    setHasChanges(changed);
  }, [editedSettings, settingsData]);

  // Handle setting value change
  const handleSettingChange = (key: string, value: unknown) => {
    setEditedSettings(prev => setNestedValue(prev, key, value));
  };

  // Save settings
  const handleSave = async () => {
    if (!settingsData || readOnly) return;
    
    setIsSaving(true);
    try {
      // Calculate only the changed fields
      const changedFields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(editedSettings)) {
        if (JSON.stringify(value) !== JSON.stringify(settingsData.settings[key])) {
          changedFields[key] = value;
        }
      }

      let response: { success: boolean; data?: ScopeSettingsResponse };
      
      if (scopeType === 'tenant') {
        response = await settingsApi.updateTenantSettings(changedFields, settingsData.version);
      } else if (scopeType === 'subsidiary' && scopeId) {
        response = await settingsApi.updateSubsidiarySettings(scopeId, changedFields, settingsData.version);
      } else if (scopeType === 'talent' && scopeId) {
        response = await settingsApi.updateTalentSettings(scopeId, changedFields, settingsData.version);
      } else {
        return;
      }

      if (response.success && response.data) {
        setSettingsData(response.data);
        setEditedSettings(response.data.settings);
        toast.success(t('settingsSaved'));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t('settingsFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Reset a field to inherited value
  const handleResetField = async () => {
    if (!resetFieldKey || scopeType === 'tenant' || readOnly) return;
    
    try {
      let response: { success: boolean; data?: ScopeSettingsResponse };
      
      if (scopeType === 'subsidiary' && scopeId) {
        response = await settingsApi.resetSubsidiarySetting(scopeId, resetFieldKey);
      } else if (scopeType === 'talent' && scopeId) {
        response = await settingsApi.resetTalentSetting(scopeId, resetFieldKey);
      } else {
        return;
      }

      if (response.success && response.data) {
        setSettingsData(response.data);
        setEditedSettings(response.data.settings);
        toast.success(t('resetSuccess'));
      }
    } catch (error) {
      console.error('Failed to reset setting:', error);
      toast.error(t('settingsFailed'));
    } finally {
      setShowResetDialog(false);
      setResetFieldKey(null);
    }
  };

  // Check if a field is overridden
  const isOverridden = (key: string): boolean => {
    return settingsData?.overrides?.includes(key) ?? false;
  };

  // Get inheritance source for a field
  const getInheritanceSource = (key: string): string | null => {
    return settingsData?.inheritedFrom?.[key] ?? null;
  };

  // Group settings by category
  const settingsByCategory = useMemo(() => {
    const grouped: Record<string, SettingField[]> = {};
    for (const field of SETTING_FIELDS) {
      if (!grouped[field.category]) {
        grouped[field.category] = [];
      }
      grouped[field.category].push(field);
    }
    return grouped;
  }, []);

  // Render a setting field
  const renderSettingField = (field: SettingField) => {
    const value = getNestedValue(editedSettings, field.key);
    const overridden = isOverridden(field.key);
    const inheritedFrom = getInheritanceSource(field.key);
    const canReset = overridden && scopeType !== 'tenant' && !readOnly;

    return (
      <div
        key={field.key}
        className={cn(
          'flex items-center justify-between p-4 border rounded-lg transition-colors',
          overridden && 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'
        )}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label className="font-medium">{t(field.labelKey)}</Label>
            {overridden ? (
              <Badge variant="default" className="text-xs bg-blue-500">
                {t('overridden')}
              </Badge>
            ) : inheritedFrom ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs">
                      {t('inherited')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('inheritedFrom', { source: inheritedFrom })}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          {field.description && (
            <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {field.type === 'boolean' && (
            <Switch
              checked={value as boolean}
              onCheckedChange={(checked) => handleSettingChange(field.key, checked)}
              disabled={readOnly}
            />
          )}
          
          {field.type === 'string' && (
            <Input
              value={(value as string) || ''}
              onChange={(e) => handleSettingChange(field.key, e.target.value)}
              className="w-48"
              disabled={readOnly}
            />
          )}
          
          {field.type === 'number' && (
            <Input
              type="number"
              value={(value as number) || 0}
              onChange={(e) => handleSettingChange(field.key, parseInt(e.target.value, 10))}
              className="w-32"
              disabled={readOnly}
            />
          )}
          
          {field.type === 'select' && field.options && (
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => handleSettingChange(field.key, v)}
              disabled={readOnly}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canReset && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setResetFieldKey(field.key);
                      setShowResetDialog(true);
                    }}
                  >
                    <RotateCcw size={16} className="text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('resetToDefault')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with scope info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {scopeType === 'tenant' && t('tenantScopeDesc')}
            {scopeType === 'subsidiary' && t('subsidiaryScopeDesc')}
            {scopeType === 'talent' && t('talentScopeDesc')}
          </span>
        </div>
        {!readOnly && hasChanges && (
          <Button onClick={handleSave} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? tc('saving') : tc('saveChanges')}
          </Button>
        )}
      </div>

      {/* Settings grouped by category */}
      {CATEGORIES.map((category) => {
        const fields = settingsByCategory[category.key];
        if (!fields || fields.length === 0) return null;
        
        const CategoryIcon = category.icon;
        
        return (
          <Card key={category.key}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CategoryIcon size={18} />
                {t(`category.${category.key}.title`)}
              </CardTitle>
              <CardDescription>
                {t(`category.${category.key}.description`)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field) => renderSettingField(field))}
            </CardContent>
          </Card>
        );
      })}

      {/* Summary of overrides */}
      {settingsData && settingsData.overrides.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t('overrideSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {t('overrideCount', { count: settingsData.overrides.length })}
              <span className="font-medium ml-1">
                {settingsData.overrides.map(key => {
                  // Find the field definition to get the labelKey
                  const field = SETTING_FIELDS.find(f => f.key === key);
                  return field ? t(field.labelKey as any) : key;
                }).join(', ')}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resetToDefault')}</DialogTitle>
            <DialogDescription>
              {t('resetConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleResetField}>
              {tc('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
