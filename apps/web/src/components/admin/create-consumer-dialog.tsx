// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import {
  integrationApi,
  type IntegrationConsumerCategory,
  type IntegrationConsumerRecord,
} from '@/lib/api/modules/integration';

interface CreateConsumerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  consumer?: IntegrationConsumerRecord | null;
}

type ConsumerFormState = {
  code: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  consumerCategory: IntegrationConsumerCategory | '';
  contactName: string;
  contactEmail: string;
  allowedIps: string;
  rateLimit: string;
  notes: string;
};

const EMPTY_FORM: ConsumerFormState = {
  code: '',
  nameEn: '',
  nameZh: '',
  nameJa: '',
  consumerCategory: '',
  contactName: '',
  contactEmail: '',
  allowedIps: '',
  rateLimit: '',
  notes: '',
};

export function CreateConsumerDialog({
  open,
  onOpenChange,
  onSuccess,
  consumer = null,
}: CreateConsumerDialogProps) {
  const t = useTranslations('createConsumer');
  const tCommon = useTranslations('common');
  const isEditing = !!consumer;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ConsumerFormState>(EMPTY_FORM);

  const consumerCategories: Array<{
    value: IntegrationConsumerCategory;
    label: string;
    description: string;
  }> = [
    {
      value: 'external',
      label: t('categories.external.label'),
      description: t('categories.external.description'),
    },
    {
      value: 'partner',
      label: t('categories.partner.label'),
      description: t('categories.partner.description'),
    },
    {
      value: 'internal',
      label: t('categories.internal.label'),
      description: t('categories.internal.description'),
    },
  ];

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!consumer) {
      setFormData(EMPTY_FORM);
      return;
    }

    setFormData({
      code: consumer.code,
      nameEn: consumer.nameEn,
      nameZh: consumer.nameZh || '',
      nameJa: consumer.nameJa || '',
      consumerCategory: consumer.consumerCategory,
      contactName: consumer.contactName || '',
      contactEmail: consumer.contactEmail || '',
      allowedIps: consumer.allowedIps?.join('\n') || '',
      rateLimit: consumer.rateLimit ? String(consumer.rateLimit) : '',
      notes: consumer.notes || '',
    });
  }, [consumer, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.code || !formData.nameEn || !formData.consumerCategory) {
      toast.error(t('fillRequiredFields'));
      return;
    }

    if (!/^[A-Z0-9_]{3,32}$/.test(formData.code)) {
      toast.error(t('codeFormatError'));
      return;
    }

    const parsedRateLimit = formData.rateLimit.trim() ? Number(formData.rateLimit) : undefined;
    if (typeof parsedRateLimit !== 'undefined' && (!Number.isFinite(parsedRateLimit) || parsedRateLimit <= 0)) {
      toast.error(t('invalidRateLimit'));
      return;
    }

    const allowedIps = formData.allowedIps
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const payload = {
        nameEn: formData.nameEn,
        nameZh: formData.nameZh || undefined,
        nameJa: formData.nameJa || undefined,
        consumerCategory: formData.consumerCategory,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        allowedIps: allowedIps.length > 0 ? allowedIps : undefined,
        rateLimit: parsedRateLimit,
        notes: formData.notes || undefined,
      };

      const response = isEditing && consumer
        ? await integrationApi.updateConsumer(consumer.id, {
            ...payload,
            version: consumer.version,
          })
        : await integrationApi.createConsumer({
            code: formData.code,
            ...payload,
          });

      if (!response.success) {
        throw new Error(response.error?.message || tCommon('error'));
      }

      toast.success(isEditing ? t('updateSuccess') : t('createSuccess'), {
        description: isEditing
          ? t('updateSuccessDescription', { code: formData.code })
          : t('createSuccessDescription', { code: formData.code }),
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast.error(isEditing ? t('updateFailed') : t('createFailed'), {
        description: error instanceof Error ? error.message : tCommon('error'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTitle') : t('title')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editDescription') : t('description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">{tCommon('code')} *</Label>
              <Input
                id="code"
                placeholder={t('codePlaceholder')}
                value={formData.code}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                  }))
                }
                disabled={isSubmitting || isEditing}
              />
              <p className="text-xs text-slate-500">{t('codeHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consumerCategory">{t('category')} *</Label>
              <Select
                value={formData.consumerCategory}
                onValueChange={(value: IntegrationConsumerCategory) =>
                  setFormData((current) => ({ ...current, consumerCategory: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="consumerCategory">
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {consumerCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex flex-col">
                        <span>{category.label}</span>
                        <span className="text-xs text-slate-500">{category.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nameEn">{t('nameEnglish')} *</Label>
              <Input
                id="nameEn"
                placeholder={t('nameEnglishPlaceholder')}
                value={formData.nameEn}
                onChange={(e) => setFormData((current) => ({ ...current, nameEn: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameZh">{tCommon('nameZh')}</Label>
              <Input
                id="nameZh"
                placeholder={t('nameChinesePlaceholder')}
                value={formData.nameZh}
                onChange={(e) => setFormData((current) => ({ ...current, nameZh: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nameJa">{t('nameJapanese')}</Label>
              <Input
                id="nameJa"
                placeholder={t('nameJapanesePlaceholder')}
                value={formData.nameJa}
                onChange={(e) => setFormData((current) => ({ ...current, nameJa: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">{t('contactName')}</Label>
              <Input
                id="contactName"
                placeholder={t('contactNamePlaceholder')}
                value={formData.contactName}
                onChange={(e) => setFormData((current) => ({ ...current, contactName: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">{t('contactEmail')}</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder={t('contactEmailPlaceholder')}
                value={formData.contactEmail}
                onChange={(e) => setFormData((current) => ({ ...current, contactEmail: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rateLimit">{t('rateLimit')}</Label>
              <Input
                id="rateLimit"
                type="number"
                min="1"
                placeholder={t('rateLimitPlaceholder')}
                value={formData.rateLimit}
                onChange={(e) => setFormData((current) => ({ ...current, rateLimit: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowedIps">{t('allowedIps')}</Label>
            <Textarea
              id="allowedIps"
              placeholder={t('allowedIpsPlaceholder')}
              rows={3}
              value={formData.allowedIps}
              onChange={(e) => setFormData((current) => ({ ...current, allowedIps: e.target.value }))}
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500">{t('allowedIpsHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('notesPlaceholder')}
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData((current) => ({ ...current, notes: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {isEditing ? t('updating') : t('creating')}
                </>
              ) : (
                isEditing ? t('saveButton') : t('createButton')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
