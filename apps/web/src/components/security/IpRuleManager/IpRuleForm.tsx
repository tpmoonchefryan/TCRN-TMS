// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { CreateIpRuleSchema } from '@tcrn/shared';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

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
} from '@/components/ui';
import { useZodForm } from '@/lib/form';

interface IpRuleFormProps {
  onSubmit: (data: { ruleType: string; ipPattern: string; scope: string; reason?: string }) => void;
  onCancel: () => void;
}

// Frontend form schema - extend CreateIpRuleSchema for form-specific needs
const IpRuleFormSchema = CreateIpRuleSchema.omit({ expiresAt: true }).extend({
  expiresInHours: z.string().optional(),
});

type FormData = z.infer<typeof IpRuleFormSchema>;

export function IpRuleForm({ onSubmit, onCancel }: IpRuleFormProps) {
  const t = useTranslations('security');

  const form = useZodForm(IpRuleFormSchema, {
    defaultValues: {
      ruleType: 'blacklist',
      ipPattern: '',
      scope: 'global',
      reason: '',
      expiresInHours: '',
    },
  });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = form;

  const selectedRuleType = watch('ruleType');

  const onFormSubmit = (data: FormData) => {
    onSubmit({
      ruleType: data.ruleType,
      ipPattern: data.ipPattern,
      scope: data.scope,
      reason: data.reason || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createIpRule')}</DialogTitle>
          <DialogDescription>{t('createIpRuleDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Rule Type */}
          <div className="space-y-2">
            <Label htmlFor="ruleType">{t('ruleType')} *</Label>
            <select
              id="ruleType"
              {...register('ruleType')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="blacklist">{t('blacklist')} - {t('blockIp')}</option>
              <option value="whitelist">{t('whitelist')} - {t('allowIp')}</option>
            </select>
          </div>

          {/* IP Pattern */}
          <div className="space-y-2">
            <Label htmlFor="ipPattern">{t('ipPattern')} *</Label>
            <Input
              id="ipPattern"
              {...register('ipPattern')}
              placeholder={t('ipPatternPlaceholder')}
              className="font-mono"
            />
            {errors.ipPattern && (
              <p className="text-sm text-destructive">{errors.ipPattern.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('ipPatternHelp')}
            </p>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label htmlFor="scope">{t('scope')}</Label>
            <select
              id="scope"
              {...register('scope')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="global">{t('scopeGlobal')} - {t('scopeGlobalDesc')}</option>
              <option value="admin">{t('scopeAdmin')} - {t('scopeAdminDesc')}</option>
              <option value="public">{t('scopePublic')} - {t('scopePublicDesc')}</option>
              <option value="api">{t('scopeApi')} - {t('scopeApiDesc')}</option>
            </select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              {t('reason')} {selectedRuleType === 'blacklist' && '*'}
            </Label>
            <Textarea
              id="reason"
              {...register('reason', {
                required: selectedRuleType === 'blacklist' ? t('reasonRequired') : false,
              })}
              placeholder={t('reasonPlaceholder')}
              rows={2}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('saving') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
