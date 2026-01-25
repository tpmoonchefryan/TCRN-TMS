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
} from '@/components/ui';

interface IpRuleFormProps {
  onSubmit: (data: { ruleType: string; ipPattern: string; scope: string; reason?: string }) => void;
  onCancel: () => void;
}

interface FormData {
  ruleType: 'whitelist' | 'blacklist';
  ipPattern: string;
  scope: 'global' | 'admin' | 'public' | 'api';
  reason: string;
  expiresInHours: string;
}

// IPv4 or CIDR regex
const IP_PATTERN = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

export function IpRuleForm({ onSubmit, onCancel }: IpRuleFormProps) {
  const t = useTranslations('security');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      ruleType: 'blacklist',
      ipPattern: '',
      scope: 'global',
      reason: '',
      expiresInHours: '',
    },
  });

  const selectedRuleType = watch('ruleType');

  const validateIpPattern = (value: string) => {
    if (!IP_PATTERN.test(value)) {
      return t('invalidIpPattern');
    }

    // Validate each octet
    const parts = value.split('/');
    const octets = parts[0].split('.');
    for (const octet of octets) {
      const num = parseInt(octet, 10);
      if (num < 0 || num > 255) {
        return t('invalidIpPattern');
      }
    }

    // Validate CIDR prefix
    if (parts[1]) {
      const prefix = parseInt(parts[1], 10);
      if (prefix < 0 || prefix > 32) {
        return t('invalidCidrPrefix');
      }
    }

    return true;
  };

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
              {...register('ipPattern', { 
                required: t('ipPatternRequired'),
                validate: validateIpPattern,
              })}
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
