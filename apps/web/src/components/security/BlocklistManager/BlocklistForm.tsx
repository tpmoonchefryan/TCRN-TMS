// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  Checkbox,
} from '@/components/ui';

import { BlocklistEntry } from './index';

interface BlocklistFormProps {
  entry: BlocklistEntry | null;
  onSubmit: (data: Partial<BlocklistEntry>) => void;
  onCancel: () => void;
}

interface FormData {
  pattern: string;
  patternType: 'keyword' | 'regex' | 'wildcard';
  nameEn: string;
  nameZh: string;
  nameJa: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  action: 'reject' | 'flag' | 'replace';
  replacement: string;
  scope: string[];
  inherit: boolean;
}

const SCOPE_OPTIONS = [
  'marshmallow',
  'homepage',
  'customer',
  'report',
  'api',
];

export function BlocklistForm({ entry, onSubmit, onCancel }: BlocklistFormProps) {
  const t = useTranslations('security');
  const isEditing = !!entry;

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      pattern: entry?.pattern || '',
      patternType: entry?.patternType || 'keyword',
      nameEn: entry?.nameEn || '',
      nameZh: entry?.nameZh || '',
      nameJa: entry?.nameJa || '',
      description: entry?.description || '',
      category: entry?.category || '',
      severity: entry?.severity || 'medium',
      action: entry?.action || 'reject',
      replacement: entry?.replacement || '***',
      scope: entry?.scope || ['marshmallow'],
      inherit: entry?.inherit ?? true,
    },
  });

  const selectedScope = watch('scope');
  const selectedAction = watch('action');

  const handleScopeChange = (scope: string, checked: boolean) => {
    const current = selectedScope || [];
    if (checked) {
      setValue('scope', [...current, scope]);
    } else {
      setValue('scope', current.filter((s) => s !== scope));
    }
  };

  const onFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      version: entry?.version,
      isActive: entry?.isActive ?? true,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('editBlocklistEntry') : t('createBlocklistEntry')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('editBlocklistDescription') : t('createBlocklistDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Pattern Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">{t('patternSettings')}</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="pattern">{t('pattern')} *</Label>
                <Input
                  id="pattern"
                  {...register('pattern', { required: t('patternRequired') })}
                  placeholder={t('patternPlaceholder')}
                  className="font-mono"
                />
                {errors.pattern && (
                  <p className="text-sm text-destructive">{errors.pattern.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patternType">{t('patternType')}</Label>
                <select
                  id="patternType"
                  {...register('patternType')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="keyword">{t('keyword')}</option>
                  <option value="regex">{t('regex')}</option>
                  <option value="wildcard">{t('wildcard')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t('category')}</Label>
                <Input
                  id="category"
                  {...register('category')}
                  placeholder={t('categoryPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Name & Description */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">{t('nameAndDescription')}</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameEn">{t('nameEn')} *</Label>
                <Input
                  id="nameEn"
                  {...register('nameEn', { required: t('nameRequired') })}
                  placeholder={t('nameEnPlaceholder')}
                />
                {errors.nameEn && (
                  <p className="text-sm text-destructive">{errors.nameEn.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameZh">{t('nameZh')}</Label>
                <Input
                  id="nameZh"
                  {...register('nameZh')}
                  placeholder={t('nameZhPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameJa">{t('nameJa')}</Label>
                <Input
                  id="nameJa"
                  {...register('nameJa')}
                  placeholder={t('nameJaPlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder={t('descriptionPlaceholder')}
                rows={2}
              />
            </div>
          </div>

          {/* Action Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">{t('actionSettings')}</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">{t('severityLabel')}</Label>
                <select
                  id="severity"
                  {...register('severity')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">{t('severity.low')}</option>
                  <option value="medium">{t('severity.medium')}</option>
                  <option value="high">{t('severity.high')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">{t('actionLabel')}</Label>
                <select
                  id="action"
                  {...register('action')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="reject">{t('action.reject')}</option>
                  <option value="flag">{t('action.flag')}</option>
                  <option value="replace">{t('action.replace')}</option>
                </select>
              </div>

              {selectedAction === 'replace' && (
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="replacement">{t('replacement')}</Label>
                  <Input
                    id="replacement"
                    {...register('replacement')}
                    placeholder={t('replacementPlaceholder')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">{t('scopeSettings')}</h4>
            
            <div className="flex flex-wrap gap-4">
              {SCOPE_OPTIONS.map((scope) => (
                <label key={scope} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedScope?.includes(scope)}
                    onCheckedChange={(checked) => handleScopeChange(scope, !!checked)}
                  />
                  <span className="text-sm capitalize">{scope}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Inheritance */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="inherit"
              {...register('inherit')}
              defaultChecked={entry?.inherit ?? true}
            />
            <Label htmlFor="inherit" className="cursor-pointer">
              {t('inheritToChildren')}
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('saving') : isEditing ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
