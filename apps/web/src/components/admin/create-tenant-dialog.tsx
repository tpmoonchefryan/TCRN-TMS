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
import { tenantApi } from '@/lib/api/client';

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTenantDialog({ open, onOpenChange, onSuccess }: CreateTenantDialogProps) {
  const t = useTranslations('adminConsole.tenants');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const tToast = useTranslations('toast');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    adminDisplayName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.code || !formData.name || !formData.adminUsername || !formData.adminEmail || !formData.adminPassword) {
      toast.error(tForms('validation.required'));
      return;
    }

    // Validate code format
    if (!/^[A-Z0-9_]{3,32}$/.test(formData.code)) {
      toast.error(tForms('validation.invalidCode'));
      return;
    }

    // Validate password length
    if (formData.adminPassword.length < 12) {
      toast.error(tForms('validation.minLength', { min: 12 }));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await tenantApi.create({
        code: formData.code,
        name: formData.name,
        adminUser: {
          username: formData.adminUsername,
          email: formData.adminEmail,
          password: formData.adminPassword,
          displayName: formData.adminDisplayName || formData.adminUsername,
        },
      });

      if (response.success) {
        toast.success(tToast('success.created'), {
          description: t('tenantCreated', { code: formData.code }),
        });
        // Reset form
        setFormData({
          code: '',
          name: '',
          adminUsername: '',
          adminEmail: '',
          adminPassword: '',
          adminDisplayName: '',
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(tToast('error.create'), {
          description: response.error?.message || tToast('error.generic'),
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
          <DialogTitle>{t('createTenant')}</DialogTitle>
          <DialogDescription>
            {t('createTenantDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant Info */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-medium text-slate-700">{t('tenantInfo')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">{tCommon('code')} *</Label>
                <Input
                  id="code"
                  placeholder={tForms('placeholders.code')}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500">{tForms('hints.codeFormat')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{tCommon('name')} *</Label>
                <Input
                  id="name"
                  placeholder={tForms('placeholders.name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Admin User */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700">{t('adminUser')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminUsername">{t('adminUsername')} *</Label>
                <Input
                  id="adminUsername"
                  placeholder={tForms('placeholders.username')}
                  value={formData.adminUsername}
                  onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">{t('adminEmail')} *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder={tForms('placeholders.email')}
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">{t('adminPassword')} *</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder={tForms('placeholders.password')}
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500">{tForms('hints.passwordStrength', { min: 12 })}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminDisplayName">{t('adminDisplayName')}</Label>
              <Input
                id="adminDisplayName"
                placeholder={tForms('placeholders.displayName')}
                value={formData.adminDisplayName}
                onChange={(e) => setFormData({ ...formData, adminDisplayName: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
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
                t('createTenant')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
