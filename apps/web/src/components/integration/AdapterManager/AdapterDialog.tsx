// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
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
import { dictionaryApi, integrationApi } from '@/lib/api/client';

interface Platform {
  id: string;
  code: string;
  displayName: string;
  iconUrl?: string;
}

interface Adapter {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  platformId: string;
  adapterType: 'oauth' | 'api_key' | 'webhook';
  inherit: boolean;
  version: number;
}

interface AdapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adapter: Adapter | null;
  ownerType?: 'tenant' | 'subsidiary' | 'talent';
  ownerId?: string;
  onSuccess: () => void;
}

export function AdapterDialog({
  open,
  onOpenChange,
  adapter,
  ownerType = 'tenant',
  ownerId,
  onSuccess,
}: AdapterDialogProps) {
  const t = useTranslations('integrationManagement');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const tToast = useTranslations('toast');

  const isEdit = !!adapter;

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    platformId: '',
    code: '',
    nameEn: '',
    nameZh: '',
    nameJa: '',
    adapterType: 'oauth' as 'oauth' | 'api_key' | 'webhook',
    inherit: true,
  });

  // Load platforms from system dictionary API
  const fetchPlatforms = useCallback(async () => {
    setIsLoadingPlatforms(true);
    try {
      const response = await dictionaryApi.getByType('social_platforms');
      if (response.success && response.data) {
        setPlatforms(response.data.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          code: p.code as string,
          displayName: (p.nameEn || p.name) as string,
          iconUrl: p.iconUrl as string | undefined,
        })));
      }
    } catch (error) {
      // Fallback empty
    } finally {
      setIsLoadingPlatforms(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPlatforms();
      if (adapter) {
        setFormData({
          platformId: adapter.platformId,
          code: adapter.code,
          nameEn: adapter.nameEn,
          nameZh: adapter.nameZh || '',
          nameJa: adapter.nameJa || '',
          adapterType: adapter.adapterType,
          inherit: adapter.inherit,
        });
      } else {
        setFormData({
          platformId: '',
          code: '',
          nameEn: '',
          nameZh: '',
          nameJa: '',
          adapterType: 'oauth',
          inherit: true,
        });
      }
    }
  }, [open, adapter, fetchPlatforms]);

  const handleSubmit = async () => {
    if (!formData.platformId || !formData.code || !formData.nameEn) {
      toast.error(t('requiredFieldsMissing'));
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && adapter) {
        const response = await integrationApi.updateAdapter(adapter.id, {
          nameEn: formData.nameEn,
          nameJa: formData.nameJa || undefined,
          version: adapter.version,
        });
        if (response.success) {
          toast.success(tToast('success.updated'));
          onSuccess();
        }
      } else {
        const response = await integrationApi.createAdapter({
          platformId: formData.platformId,
          code: formData.code.toUpperCase().replace(/\s+/g, '_'),
          nameEn: formData.nameEn,
          adapterType: formData.adapterType,
          ownerType,
          ownerId: ownerId || undefined,
        });
        if (response.success) {
          toast.success(tToast('success.created'));
          onSuccess();
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tToast('error.update'), { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editAdapter') : t('createAdapter')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editAdapterDescription') : t('createAdapterDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('platform')} *</Label>
            <Select
              value={formData.platformId}
              onValueChange={(value) => setFormData({ ...formData, platformId: value })}
              disabled={isEdit || isLoadingPlatforms}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectPlatform')} />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{tCommon('code')} *</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder={t('placeholderCodeExample')}
              disabled={isEdit}
            />
            <p className="text-xs text-muted-foreground">{t('codeHint')}</p>
          </div>

          <div className="space-y-2">
            <Label>{t('adapterType')} *</Label>
            <Select
              value={formData.adapterType}
              onValueChange={(value: 'oauth' | 'api_key' | 'webhook') =>
                setFormData({ ...formData, adapterType: value })
              }
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oauth">{t('adapterTypeOAuth')}</SelectItem>
                <SelectItem value="api_key">{t('adapterTypeApiKey')}</SelectItem>
                <SelectItem value="webhook">{t('adapterTypeWebhook')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              placeholder={t('placeholderNameEn')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('nameZh')}</Label>
              <Input
                value={formData.nameZh}
                onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
                placeholder={t('placeholderNameZh')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('nameJa')}</Label>
              <Input
                value={formData.nameJa}
                onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                placeholder={t('placeholderNameJa')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>{t('inheritToChildren')}</Label>
              <p className="text-xs text-muted-foreground">{t('inheritDescription')}</p>
            </div>
            <Switch
              checked={formData.inherit}
              onCheckedChange={(checked) => setFormData({ ...formData, inherit: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? tCommon('save') : tCommon('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
