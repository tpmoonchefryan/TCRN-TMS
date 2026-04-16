// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
import { Textarea } from '@/components/ui/textarea';
import { getThrownErrorMessage } from '@/lib/api/error-utils';
import {
  type ExternalBlocklistAction,
  externalBlocklistApi,
  type ExternalBlocklistOwnerType,
  type ExternalBlocklistPattern,
  type ExternalBlocklistPatternType,
  type ExternalBlocklistSeverity,
} from '@/lib/api/modules/configuration';
import { toExternalBlocklistOwnerScope } from '@/lib/api/modules/external-blocklist-contract';

interface PatternDialogProps {
  open: boolean;
  onClose: (saved: boolean) => void;
  pattern: ExternalBlocklistPattern | null;
  ownerType: ExternalBlocklistOwnerType;
  ownerId?: string;
}

interface FormData {
  pattern: string;
  patternType: ExternalBlocklistPatternType;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  description: string;
  category: string;
  severity: ExternalBlocklistSeverity;
  action: ExternalBlocklistAction;
  replacement: string;
  inherit: boolean;
}

export function PatternDialog({
  open,
  onClose,
  pattern,
  ownerType,
  ownerId,
}: PatternDialogProps) {
  const t = useTranslations('externalBlocklist');
  const isEdit = !!pattern;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      pattern: '',
      patternType: 'domain',
      nameEn: '',
      nameZh: '',
      nameJa: '',
      description: '',
      category: '',
      severity: 'medium',
      action: 'reject',
      replacement: '[链接已移除]',
      inherit: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (pattern) {
        reset({
          pattern: pattern.pattern,
          patternType: pattern.patternType,
          nameEn: pattern.nameEn,
          nameZh: pattern.nameZh || '',
          nameJa: pattern.nameJa || '',
          description: pattern.description || '',
          category: pattern.category || '',
          severity: pattern.severity,
          action: pattern.action,
          replacement: pattern.replacement,
          inherit: pattern.inherit,
        });
      } else {
        reset({
          pattern: '',
          patternType: 'domain',
          nameEn: '',
          nameZh: '',
          nameJa: '',
          description: '',
          category: '',
          severity: 'medium',
          action: 'reject',
          replacement: '[链接已移除]',
          inherit: true,
        });
      }
    }
  }, [open, pattern, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && pattern) {
        await externalBlocklistApi.update(pattern.id, {
          pattern: data.pattern,
          patternType: data.patternType,
          nameEn: data.nameEn,
          nameZh: data.nameZh || undefined,
          nameJa: data.nameJa || undefined,
          description: data.description || undefined,
          category: data.category || undefined,
          severity: data.severity,
          action: data.action,
          replacement: data.replacement,
          inherit: data.inherit,
          version: pattern.version,
        });
        toast.success(t('updateSuccess'));
      } else {
        const ownerScope = toExternalBlocklistOwnerScope(ownerType, ownerId);

        if (!ownerScope) {
          toast.error(t('saveError'));
          return;
        }

        await externalBlocklistApi.create({
          ...ownerScope,
          pattern: data.pattern,
          patternType: data.patternType,
          nameEn: data.nameEn,
          nameZh: data.nameZh || undefined,
          nameJa: data.nameJa || undefined,
          description: data.description || undefined,
          category: data.category || undefined,
          severity: data.severity,
          action: data.action,
          replacement: data.replacement,
          inherit: data.inherit,
        });
        toast.success(t('createSuccess'));
      }
      onClose(true);
    } catch (error: unknown) {
      console.error('Failed to save pattern:', error);
      toast.error(getThrownErrorMessage(error, t('saveError')));
    }
  };

  const selectedAction = watch('action');

  const categories = [
    'social',
    'code_hosting',
    'paste',
    'shortener',
    'adult',
    'gambling',
    'phishing',
    'other',
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editPattern') : t('addPattern')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editDescription') : t('addDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Pattern Type & Pattern */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('form.patternType')}</Label>
              <Select
                value={watch('patternType')}
                onValueChange={(value) => setValue('patternType', value as ExternalBlocklistPatternType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domain">{t('patternType.domain')}</SelectItem>
                  <SelectItem value="url_regex">{t('patternType.url_regex')}</SelectItem>
                  <SelectItem value="keyword">{t('patternType.keyword')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form.category')}</Label>
              <Select
                value={watch('category') || 'other'}
                onValueChange={(v) => setValue('category', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`category.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pattern */}
          <div className="space-y-2">
            <Label>{t('form.pattern')} *</Label>
              <Input
                {...register('pattern', { required: t('validation.patternRequired') })}
                placeholder={
                  watch('patternType') === 'domain'
                  ? t('form.patternPlaceholderDomain')
                  : watch('patternType') === 'url_regex'
                  ? t('form.patternPlaceholderUrlRegex')
                  : t('form.patternPlaceholderKeyword')
              }
              className="font-mono"
            />
            {errors.pattern && (
              <p className="text-sm text-red-500">{errors.pattern.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {watch('patternType') === 'domain' && t('help.domain')}
              {watch('patternType') === 'url_regex' && t('help.url_regex')}
              {watch('patternType') === 'keyword' && t('help.keyword')}
            </p>
          </div>

          {/* Names */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('form.nameEn')} *</Label>
              <Input
                {...register('nameEn', { required: t('validation.nameRequired') })}
                placeholder={t('form.nameEnPlaceholder')}
              />
              {errors.nameEn && (
                <p className="text-sm text-red-500">{errors.nameEn.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('form.nameZh')}</Label>
              <Input {...register('nameZh')} placeholder={t('form.nameZhPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('form.nameJa')}</Label>
              <Input {...register('nameJa')} placeholder={t('form.nameJaPlaceholder')} />
            </div>
          </div>

          {/* Severity & Action */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('form.severity')}</Label>
              <Select
                value={watch('severity')}
                onValueChange={(value) => setValue('severity', value as ExternalBlocklistSeverity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('severity.low')}</SelectItem>
                  <SelectItem value="medium">{t('severity.medium')}</SelectItem>
                  <SelectItem value="high">{t('severity.high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form.action')}</Label>
              <Select
                value={watch('action')}
                onValueChange={(value) => setValue('action', value as ExternalBlocklistAction)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reject">{t('action.reject')}</SelectItem>
                  <SelectItem value="flag">{t('action.flag')}</SelectItem>
                  <SelectItem value="replace">{t('action.replace')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Replacement (only if action is replace) */}
          {selectedAction === 'replace' && (
            <div className="space-y-2">
              <Label>{t('form.replacement')}</Label>
              <Input
                {...register('replacement')}
                placeholder="[链接已移除]"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>{t('form.description')}</Label>
            <Textarea
              {...register('description')}
              placeholder={t('form.descriptionPlaceholder')}
              rows={2}
            />
          </div>

          {/* Inherit */}
          {ownerType === 'tenant' && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>{t('form.inherit')}</Label>
                <p className="text-sm text-muted-foreground">{t('form.inheritDescription')}</p>
              </div>
              <Switch
                checked={watch('inherit')}
                onCheckedChange={(checked) => setValue('inherit', checked)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('saving') : isEdit ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
