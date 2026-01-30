/* eslint-disable @typescript-eslint/no-explicit-any */
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
    Switch,
} from '@/components/ui';
import { integrationApi } from '@/lib/api/client';

interface Platform {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  displayName: string;
  iconUrl?: string;
  baseUrl?: string;
  profileUrlTemplate?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
}

interface PlatformEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform | null; // null = create new
  onSuccess: () => void;
}

export function PlatformEditorDialog({ open, onOpenChange, platform, onSuccess }: PlatformEditorDialogProps) {
  const t = useTranslations('adminConsole.platforms');
  const tPlatform = useTranslations('platformEditor');
  const tCommon = useTranslations('common');
  
  const isEditing = !!platform;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    displayName: '',
    nameEn: '',
    nameZh: '',
    nameJa: '',
    iconUrl: '',
    baseUrl: '',
    profileUrlTemplate: '',
    color: '#8b5cf6',
    sortOrder: 0,
    isActive: true,
  });

  // Reset form when dialog opens/closes or platform changes
  useEffect(() => {
    if (open) {
      if (platform) {
        setFormData({
          code: platform.code,
          displayName: platform.displayName,
          nameEn: platform.nameEn,
          nameZh: platform.nameZh || '',
          nameJa: platform.nameJa || '',
          iconUrl: platform.iconUrl || '',
          baseUrl: platform.baseUrl || '',
          profileUrlTemplate: platform.profileUrlTemplate || '',
          color: platform.color || '#8b5cf6',
          sortOrder: platform.sortOrder,
          isActive: platform.isActive,
        });
      } else {
        setFormData({
          code: '',
          displayName: '',
          nameEn: '',
          nameZh: '',
          nameJa: '',
          iconUrl: '',
          baseUrl: '',
          profileUrlTemplate: '',
          color: '#8b5cf6',
          sortOrder: 0,
          isActive: true,
        });
      }
    }
  }, [open, platform]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.code || !formData.displayName || !formData.nameEn) {
      toast.error(tPlatform('fillRequiredFields'));
      return;
    }

    // Validate code format
    if (!/^[A-Z0-9_]{2,32}$/.test(formData.code)) {
      toast.error(tPlatform('codeFormatError'));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code,
        displayName: formData.displayName,
        nameEn: formData.nameEn,
        nameZh: formData.nameZh || undefined,
        nameJa: formData.nameJa || undefined,
        iconUrl: formData.iconUrl || undefined,
        baseUrl: formData.baseUrl || undefined,
        profileUrlTemplate: formData.profileUrlTemplate || undefined,
        color: formData.color || undefined,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };

      let response;
      if (isEditing) {
        response = await integrationApi.updatePlatform?.(platform.id, { ...payload, version: platform.version });
      } else {
        response = await integrationApi.createPlatform?.(payload);
      }

      if (response?.success) {
        toast.success(isEditing ? tPlatform('updateSuccess') : tPlatform('createSuccess'), {
          description: tPlatform('changesVisible'),
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(isEditing ? tPlatform('updateFailed') : tPlatform('createFailed'), {
          description: response?.error?.message || tCommon('error'),
        });
      }
    } catch (err: any) {
      toast.error(isEditing ? tPlatform('updateFailed') : tPlatform('createFailed'), {
        description: err.message || tCommon('error'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editPlatform') : t('createPlatform')}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? tPlatform('updateDescription')
              : tPlatform('createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t('platformCode')} *</Label>
              <Input
                id="code"
                placeholder="YOUTUBE"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                disabled={isSubmitting || isEditing}
              />
              {isEditing && <p className="text-xs text-slate-500">{tPlatform('codeCannotChange')}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">{tPlatform('displayName')} *</Label>
              <Input
                id="displayName"
                placeholder="YouTube"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Localized Names */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
            <Label className="text-xs text-slate-500 uppercase">{tPlatform('localizedNames')}</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nameEn" className="text-xs">{tPlatform('english')} *</Label>
                <Input
                  id="nameEn"
                  placeholder="YouTube"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nameZh" className="text-xs">{tPlatform('chinese')}</Label>
                <Input
                  id="nameZh"
                  placeholder="油管"
                  value={formData.nameZh}
                  onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nameJa" className="text-xs">{tPlatform('japanese')}</Label>
                <Input
                  id="nameJa"
                  placeholder="ユーチューブ"
                  value={formData.nameJa}
                  onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* URLs */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="iconUrl">{tPlatform('iconUrl')}</Label>
              <Input
                id="iconUrl"
                placeholder="https://example.com/youtube-icon.png"
                value={formData.iconUrl}
                onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="baseUrl">{tPlatform('baseUrl')}</Label>
              <Input
                id="baseUrl"
                placeholder="https://www.youtube.com"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileUrlTemplate">{tPlatform('profileUrlTemplate')}</Label>
              <Input
                id="profileUrlTemplate"
                placeholder="https://www.youtube.com/channel/{id}"
                value={formData.profileUrlTemplate}
                onChange={(e) => setFormData({ ...formData, profileUrlTemplate: e.target.value })}
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500">{tPlatform('profileUrlHint')}</p>
            </div>
          </div>

          {/* Styling */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">{tPlatform('brandColor')}</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={isSubmitting}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={isSubmitting}
                  className="flex-1"
                  placeholder="#8b5cf6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">{tPlatform('sortOrder')}</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label>{tPlatform('status')}</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  disabled={isSubmitting}
                />
                <span className="text-sm">{formData.isActive ? tCommon('active') : tCommon('inactive')}</span>
              </div>
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
                  {isEditing ? tPlatform('updating') : tPlatform('creating')}
                </>
              ) : (
                isEditing ? tCommon('save') : tCommon('create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
