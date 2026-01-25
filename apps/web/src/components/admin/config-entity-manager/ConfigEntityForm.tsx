// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
'use client';

import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ConfigEntity, ConfigEntityType, ENTITY_TYPE_CONFIGS, ExtraFieldConfig } from './types';

interface ConfigEntityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: ConfigEntityType;
  entity?: ConfigEntity | null;
  parentOptions?: { id: string; name: string }[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
}

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function ConfigEntityForm({
  open,
  onOpenChange,
  entityType,
  entity,
  parentOptions = [],
  onSubmit,
  isLoading = false,
}: ConfigEntityFormProps) {
  const t = useTranslations('configEntityForm');
  const config = ENTITY_TYPE_CONFIGS[entityType];
  const isEditing = !!entity;

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (entity) {
      setFormData({
        code: entity.code,
        nameEn: entity.nameEn,
        nameZh: entity.nameZh || '',
        nameJa: entity.nameJa || '',
        descriptionEn: entity.descriptionEn || '',
        descriptionZh: entity.descriptionZh || '',
        descriptionJa: entity.descriptionJa || '',
        sortOrder: entity.sortOrder,
        isForceUse: entity.isForceUse,
        version: entity.version,
        // Copy extra fields
        ...Object.fromEntries(
          config.extraFields.map((field) => [field.name, entity[field.name] ?? ''])
        ),
      });
    } else {
      setFormData({
        code: '',
        nameEn: '',
        nameZh: '',
        nameJa: '',
        descriptionEn: '',
        descriptionZh: '',
        descriptionJa: '',
        sortOrder: 0,
        isForceUse: false,
        // Initialize extra fields
        ...Object.fromEntries(
          config.extraFields.map((field) => [
            field.name,
            field.type === 'boolean' ? false : field.type === 'number' ? 0 : '',
          ])
        ),
      });
    }
  }, [entity, entityType, config.extraFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderExtraField = (field: ExtraFieldConfig) => {
    const value = formData[field.name];

    switch (field.type) {
      case 'select':
        // Check if this is a parent reference field
        if (config.hasParent && field.name === config.parentFieldName) {
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={value as string || ''}
                onValueChange={(v) => updateField(field.name, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        // Regular select with predefined options
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value as string || ''}
              onValueChange={(v) => updateField(field.name, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'boolean':
        return (
          <div key={field.name} className="flex items-center justify-between">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Switch
              id={field.name}
              checked={value as boolean || false}
              onCheckedChange={(v) => updateField(field.name, v)}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={value as number || 0}
              onChange={(e) => updateField(field.name, parseInt(e.target.value) || 0)}
              placeholder={field.placeholder}
            />
          </div>
        );

      case 'color':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <div className="flex items-center gap-2">
              <Input
                id={field.name}
                type="color"
                value={value as string || '#808080'}
                onChange={(e) => updateField(field.name, e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={value as string || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value as string || ''}
              onChange={(e) => updateField(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
            />
          </div>
        );

      case 'url':
      case 'text':
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type === 'url' ? 'url' : 'text'}
              value={value as string || ''}
              onChange={(e) => updateField(field.name, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? `Edit ${config.label}` : `Create ${config.label}`}
            </DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">{t('basicInfo')}</TabsTrigger>
              <TabsTrigger value="translations">{t('translations')}</TabsTrigger>
              {config.extraFields.length > 0 && (
                <TabsTrigger value="extra">{t('extraFields')}</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  {t('code')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code as string || ''}
                  onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                  placeholder="UNIQUE_CODE"
                  disabled={isEditing}
                  pattern="^[A-Z0-9_]{3,32}$"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('codeHint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameEn">
                  {t('nameEnglish')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn as string || ''}
                  onChange={(e) => updateField('nameEn', e.target.value)}
                  placeholder="English name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">{t('sortOrder')}</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder as number || 0}
                  onChange={(e) => updateField('sortOrder', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isForceUse">{t('forceUse')}</Label>
                <Switch
                  id="isForceUse"
                  checked={formData.isForceUse as boolean || false}
                  onCheckedChange={(v) => updateField('isForceUse', v)}
                />
              </div>
            </TabsContent>

            <TabsContent value="translations" className="space-y-4 mt-4">
              {languages.map((lang) => (
                <div key={lang.code} className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <span>{lang.flag}</span> {lang.label}
                    {lang.code === 'en' && <span className="text-xs text-muted-foreground">({t('required')})</span>}
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor={`name-${lang.code}`}>{t('name')}</Label>
                    <Input
                      id={`name-${lang.code}`}
                      value={formData[`name${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`] as string || ''}
                      onChange={(e) =>
                        updateField(
                          `name${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`,
                          e.target.value
                        )
                      }
                      placeholder={lang.code === 'en' ? t('required') : t('optionalFallback')}
                      required={lang.code === 'en'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`desc-${lang.code}`}>{t('description')}</Label>
                    <Textarea
                      id={`desc-${lang.code}`}
                      value={formData[`description${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`] as string || ''}
                      onChange={(e) =>
                        updateField(
                          `description${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}`,
                          e.target.value
                        )
                      }
                      placeholder={t('optionalDescription')}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </TabsContent>

            {config.extraFields.length > 0 && (
              <TabsContent value="extra" className="space-y-4 mt-4">
                {config.extraFields.map(renderExtraField)}
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('saving') : isEditing ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
