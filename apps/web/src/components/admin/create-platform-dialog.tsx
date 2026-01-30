/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
} from '@/components/ui';

interface CreatePlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePlatformDialog({ open, onOpenChange, onSuccess }: CreatePlatformDialogProps) {
  const t = useTranslations('adminConsole.platforms');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const tToast = useTranslations('toast');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameZh: '',
    nameJa: '',
    iconUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.code || !formData.nameEn) {
      toast.error(tForms('validation.required'));
      return;
    }

    // Validate code format
    if (!/^[A-Z0-9_]{2,32}$/.test(formData.code)) {
      toast.error(tForms('validation.invalidCode'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Note: This requires a backend API endpoint to be implemented
      // POST /api/v1/social-platforms
      const response = await fetch('/api/v1/social-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          nameEn: formData.nameEn,
          nameZh: formData.nameZh || undefined,
          nameJa: formData.nameJa || undefined,
          iconUrl: formData.iconUrl || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(tToast('success.created'), {
          description: t('platformCreated', { code: formData.code }),
        });
        // Reset form
        setFormData({
          code: '',
          nameEn: '',
          nameZh: '',
          nameJa: '',
          iconUrl: '',
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(tToast('error.create'), {
          description: data.error?.message || tToast('error.generic'),
        });
      }
    } catch (err: any) {
      toast.error(tToast('error.create'), {
        description: err.message || tToast('error.generic'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('createPlatform')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t('platformCode')} *</Label>
              <Input
                id="code"
                placeholder={tForms('placeholders.code')}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500">{tForms('hints.codeFormat')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn">{t('platformName')} (EN) *</Label>
              <Input
                id="nameEn"
                placeholder={tForms('placeholders.name')}
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nameZh">{t('platformName')} (中文)</Label>
              <Input
                id="nameZh"
                placeholder={tForms('placeholders.name')}
                value={formData.nameZh}
                onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameJa">{t('platformName')} (日本語)</Label>
              <Input
                id="nameJa"
                placeholder={tForms('placeholders.name')}
                value={formData.nameJa}
                onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconUrl">{t('iconUrl')}</Label>
            <Input
              id="iconUrl"
              placeholder={tForms('placeholders.url')}
              value={formData.iconUrl}
              onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500">{tForms('hints.optionalField')}</p>
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
                  {tCommon('loading')}
                </>
              ) : (
                tCommon('create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
