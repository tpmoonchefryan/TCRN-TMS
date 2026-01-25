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
  Switch,
} from '@/components/ui';
import { platformIdentityApi, systemDictionaryApi } from '@/lib/api/client';

interface Platform {
  id: string;
  code: string;
  displayName: string;
}

interface PlatformIdentity {
  id: string;
  platform: Platform;
  platformUid: string;
  platformNickname?: string;
  platformAvatarUrl?: string;
  isVerified: boolean;
  isCurrent: boolean;
}

interface PlatformIdentityDialogProps {
  customerId: string;
  talentId: string;
  identity?: PlatformIdentity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PlatformIdentityDialog({
  customerId,
  talentId,
  identity,
  open,
  onOpenChange,
  onSuccess,
}: PlatformIdentityDialogProps) {
  const t = useTranslations('platformIdentityDialog');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const tToast = useTranslations('toast');
  
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [platformCode, setPlatformCode] = useState('');
  const [platformUid, setPlatformUid] = useState('');
  const [platformNickname, setPlatformNickname] = useState('');
  const [platformAvatarUrl, setPlatformAvatarUrl] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const isEdit = !!identity;

  // Load platforms from system dictionary API
  useEffect(() => {
    const loadPlatforms = async () => {
      setIsLoading(true);
      try {
        // Use system dictionary API with 'social_platforms' type code
        const response = await systemDictionaryApi.get('social_platforms');
        if (response.success && response.data) {
          // System dictionary API returns paginated data, extract items array
          const items = Array.isArray(response.data) ? response.data : (response.data.items || response.data);
          setPlatforms(items.map((item: any) => ({
            id: item.id,
            code: item.code,
            displayName: item.extraData?.displayName || item.nameEn || item.name_en || item.code,
          })));
        }
      } catch (error) {
        // Use default platforms if API fails
        setPlatforms([
          { id: '1', code: 'YOUTUBE', displayName: 'YouTube' },
          { id: '2', code: 'TWITCH', displayName: 'Twitch' },
          { id: '3', code: 'TWITTER', displayName: 'Twitter/X' },
          { id: '4', code: 'BILIBILI', displayName: 'Bilibili' },
          { id: '5', code: 'TIKTOK', displayName: 'TikTok' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (open) {
      loadPlatforms();
    }
  }, [open]);

  // Initialize form when editing
  useEffect(() => {
    if (identity) {
      setPlatformCode(identity.platform?.code || '');
      setPlatformUid(identity.platformUid || '');
      setPlatformNickname(identity.platformNickname || '');
      setPlatformAvatarUrl(identity.platformAvatarUrl || '');
      setIsVerified(identity.isVerified || false);
    } else {
      // Reset form for new identity
      setPlatformCode('');
      setPlatformUid('');
      setPlatformNickname('');
      setPlatformAvatarUrl('');
      setIsVerified(false);
    }
  }, [identity, open]);

  const handleSubmit = async () => {
    if (!platformCode) {
      toast.error(tForms('validation.required'));
      return;
    }
    if (!platformUid.trim()) {
      toast.error(tForms('validation.required'));
      return;
    }

    setIsSaving(true);

    try {
      if (isEdit && identity) {
        await platformIdentityApi.update(
          customerId,
          identity.id,
          {
            platformUid: platformUid.trim(),
            platformNickname: platformNickname.trim() || undefined,
            platformAvatarUrl: platformAvatarUrl.trim() || undefined,
            isVerified,
          },
          talentId
        );
        toast.success(tToast('success.updated'));
      } else {
        await platformIdentityApi.create(
          customerId,
          {
            platformCode,
            platformUid: platformUid.trim(),
            platformNickname: platformNickname.trim() || undefined,
            platformAvatarUrl: platformAvatarUrl.trim() || undefined,
            isVerified,
          },
          talentId
        );
        toast.success(tToast('success.created'));
      }
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || tToast('error.save'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editTitle') : t('addTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editDescription') : t('addDescription')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform">{t('platform')} *</Label>
              <Select
                value={platformCode}
                onValueChange={setPlatformCode}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPlatform')} />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.code} value={platform.code}>
                      {platform.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uid">{t('uid')} *</Label>
              <Input
                id="uid"
                value={platformUid}
                onChange={(e) => setPlatformUid(e.target.value)}
                placeholder={t('uidPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">{t('nickname')}</Label>
              <Input
                id="nickname"
                value={platformNickname}
                onChange={(e) => setPlatformNickname(e.target.value)}
                placeholder={t('nicknamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">{t('avatarUrl')}</Label>
              <Input
                id="avatar"
                value={platformAvatarUrl}
                onChange={(e) => setPlatformAvatarUrl(e.target.value)}
                placeholder={tForms('placeholders.url')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="verified">{t('verified')}</Label>
              <Switch
                id="verified"
                checked={isVerified}
                onCheckedChange={setIsVerified}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? t('save') : t('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
