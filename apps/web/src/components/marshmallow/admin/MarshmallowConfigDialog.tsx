/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmojiPicker } from '@/components/marshmallow/public/EmojiPicker';
import { ImageUploader } from '@/components/shared/ImageUploader';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { marshmallowApi } from '@/lib/api/client';


// Config interface matching backend API response
interface MarshmallowConfig {
  id: string;
  talentId: string;
  isEnabled: boolean;
  title: string | null;
  welcomeText: string | null;
  placeholderText: string | null;
  thankYouText: string | null;
  allowAnonymous: boolean;
  captchaMode: 'always' | 'never' | 'auto';
  moderationEnabled: boolean;
  autoApprove: boolean;
  profanityFilterEnabled: boolean;
  externalBlocklistEnabled: boolean;
  maxMessageLength: number;
  minMessageLength: number;
  rateLimitPerIp: number;
  rateLimitWindowHours: number;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  theme: Record<string, unknown>;
  avatarUrl: string | null;
  termsContentEn: string | null;
  termsContentZh: string | null;
  termsContentJa: string | null;
  privacyContentEn: string | null;
  privacyContentZh: string | null;
  privacyContentJa: string | null;
  stats: {
    totalMessages: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    unreadCount: number;
  };
  marshmallowUrl: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface MarshmallowConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talentId: string;
  onSave?: () => void;
}

const DEFAULT_REACTIONS = ['❤️', '👍', '😊', '🎉', '💯'];

export function MarshmallowConfigDialog({
  open,
  onOpenChange,
  talentId,
  onSave,
}: MarshmallowConfigDialogProps) {
  const t = useTranslations('marshmallowConfig');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<MarshmallowConfig | null>(null);
  const [localConfig, setLocalConfig] = useState<Partial<MarshmallowConfig>>({});

  // Load config when dialog opens
  useEffect(() => {
    if (open && talentId) {
      loadConfig();
    }
  }, [open, talentId]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const response = await marshmallowApi.getConfig(talentId);
      if (response.success && response.data) {
        setConfig(response.data);
        setLocalConfig(response.data);
      }
    } catch (error) {
      toast.error(t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      // Only send editable fields to the API (exclude read-only fields)
      const editableFields = {
        isEnabled: localConfig.isEnabled,
        title: localConfig.title,
        welcomeText: localConfig.welcomeText,
        placeholderText: localConfig.placeholderText,
        thankYouText: localConfig.thankYouText,
        allowAnonymous: localConfig.allowAnonymous,
        captchaMode: localConfig.captchaMode,
        moderationEnabled: localConfig.moderationEnabled,
        autoApprove: localConfig.autoApprove,
        profanityFilterEnabled: localConfig.profanityFilterEnabled,
        externalBlocklistEnabled: localConfig.externalBlocklistEnabled,
        maxMessageLength: localConfig.maxMessageLength,
        minMessageLength: localConfig.minMessageLength,
        rateLimitPerIp: localConfig.rateLimitPerIp,
        rateLimitWindowHours: localConfig.rateLimitWindowHours,
        reactionsEnabled: localConfig.reactionsEnabled,
        allowedReactions: localConfig.allowedReactions,
        theme: localConfig.theme,
        avatarUrl: localConfig.avatarUrl,
        termsContentEn: localConfig.termsContentEn,
        termsContentZh: localConfig.termsContentZh,
        termsContentJa: localConfig.termsContentJa,
        privacyContentEn: localConfig.privacyContentEn,
        privacyContentZh: localConfig.privacyContentZh,
        privacyContentJa: localConfig.privacyContentJa,
        version: config.version,
      };
      
      const response = await marshmallowApi.updateConfig(talentId, editableFields);

      if (response.success) {
        toast.success(t('saveSuccess'));
        setConfig(response.data);
        setLocalConfig(response.data);
        onSave?.();
      } else {
        throw new Error(response.error?.message || t('saveFailed'));
      }
    } catch (error: any) {
      toast.error(error.message || t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof MarshmallowConfig>(
    field: K,
    value: MarshmallowConfig[K]
  ) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const addReaction = (emoji: string) => {
    if (emoji && !localConfig.allowedReactions?.includes(emoji)) {
      updateField('allowedReactions', [
        ...(localConfig.allowedReactions || []),
        emoji,
      ]);
    }
  };

  const removeReaction = (reaction: string) => {
    updateField(
      'allowedReactions',
      (localConfig.allowedReactions || []).filter((r) => r !== reaction)
    );
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">{t('general')}</TabsTrigger>
            <TabsTrigger value="moderation">{t('moderation')}</TabsTrigger>
            <TabsTrigger value="appearance">{t('appearance')}</TabsTrigger>
            <TabsTrigger value="legal">{t('legal')}</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('enableMarshmallow')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('enableDescription')}
                </p>
              </div>
              <Switch
                checked={localConfig.isEnabled ?? false}
                onCheckedChange={(checked) => updateField('isEnabled', checked)}
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('pageTitle')}</Label>
              <Input
                id="title"
                value={localConfig.title || ''}
                onChange={(e) => updateField('title', e.target.value || null)}
                placeholder={t('pageTitlePlaceholder')}
              />
            </div>

            {/* Welcome Text */}
            <div className="space-y-2">
              <Label htmlFor="welcomeText">{t('welcomeText')}</Label>
              <Textarea
                id="welcomeText"
                value={localConfig.welcomeText || ''}
                onChange={(e) =>
                  updateField('welcomeText', e.target.value || null)
                }
                placeholder={t('welcomeTextPlaceholder')}
                rows={3}
              />
            </div>

            {/* Placeholder Text */}
            <div className="space-y-2">
              <Label htmlFor="placeholderText">{t('placeholderText')}</Label>
              <Input
                id="placeholderText"
                value={localConfig.placeholderText || ''}
                onChange={(e) =>
                  updateField('placeholderText', e.target.value || null)
                }
                placeholder={t('placeholderTextPlaceholder')}
              />
            </div>

            {/* Thank You Text */}
            <div className="space-y-2">
              <Label htmlFor="thankYouText">{t('thankYouText')}</Label>
              <Textarea
                id="thankYouText"
                value={localConfig.thankYouText || ''}
                onChange={(e) =>
                  updateField('thankYouText', e.target.value || null)
                }
                placeholder={t('thankYouTextPlaceholder')}
                rows={2}
              />
            </div>

            {/* Message Length */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minLength">{t('minMessageLength')}</Label>
                <Input
                  id="minLength"
                  type="number"
                  min={1}
                  max={100}
                  value={localConfig.minMessageLength || 1}
                  onChange={(e) =>
                    updateField('minMessageLength', parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLength">{t('maxMessageLength')}</Label>
                <Input
                  id="maxLength"
                  type="number"
                  min={100}
                  max={2000}
                  value={localConfig.maxMessageLength || 500}
                  onChange={(e) =>
                    updateField(
                      'maxMessageLength',
                      parseInt(e.target.value) || 500
                    )
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* Moderation Settings */}
          <TabsContent value="moderation" className="space-y-4 mt-4">
            {/* Allow Anonymous */}
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('allowAnonymous')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('allowAnonymousDescription')}
                </p>
              </div>
              <Switch
                checked={localConfig.allowAnonymous ?? true}
                onCheckedChange={(checked) =>
                  updateField('allowAnonymous', checked)
                }
              />
            </div>

            {/* Moderation Enabled */}
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('moderationEnabled')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('moderationEnabledDescription')}
                </p>
              </div>
              <Switch
                checked={localConfig.moderationEnabled ?? true}
                onCheckedChange={(checked) =>
                  updateField('moderationEnabled', checked)
                }
              />
            </div>

            {/* Auto Approve */}
            {localConfig.moderationEnabled && (
              <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
                <div>
                  <Label>{t('autoApprove')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('autoApproveDescription')}
                  </p>
                </div>
                <Switch
                  checked={localConfig.autoApprove ?? false}
                  onCheckedChange={(checked) =>
                    updateField('autoApprove', checked)
                  }
                />
              </div>
            )}

            {/* Profanity Filter */}
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('profanityFilter')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('profanityFilterDescription')}
                </p>
              </div>
              <Switch
                checked={localConfig.profanityFilterEnabled ?? true}
                onCheckedChange={(checked) =>
                  updateField('profanityFilterEnabled', checked)
                }
              />
            </div>

            {/* CAPTCHA Mode */}
            <div className="space-y-2">
              <Label>{t('captchaMode')}</Label>
              <Select
                value={localConfig.captchaMode || 'auto'}
                onValueChange={(value) =>
                  updateField('captchaMode', value as 'always' | 'never' | 'auto')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('captchaModeAuto')}</SelectItem>
                  <SelectItem value="always">{t('captchaModeAlways')}</SelectItem>
                  <SelectItem value="never">{t('captchaModeNever')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('captchaModeDescription')}
              </p>
            </div>

            {/* Rate Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rateLimit">{t('rateLimitPerIp')}</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  min={1}
                  max={100}
                  value={localConfig.rateLimitPerIp || 5}
                  onChange={(e) =>
                    updateField('rateLimitPerIp', parseInt(e.target.value) || 5)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rateLimitWindow">{t('rateLimitWindow')}</Label>
                <Input
                  id="rateLimitWindow"
                  type="number"
                  min={1}
                  max={24}
                  value={localConfig.rateLimitWindowHours || 1}
                  onChange={(e) =>
                    updateField(
                      'rateLimitWindowHours',
                      parseInt(e.target.value) || 1
                    )
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            {/* Custom Avatar URL */}
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">{t('customAvatar')}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {t('customAvatarDescription')}
              </p>
              <div className="flex items-center gap-4">
                <ImageUploader 
                  value={localConfig.avatarUrl || null}
                  onChange={(url) => updateField('avatarUrl', url)}
                  onUpload={(file) => marshmallowApi.uploadAvatar(talentId, file).then(res => res.url)}
                />
                <div className="flex-1 text-sm text-muted-foreground">
                  <p>{t('avatarUploadHint')}</p>
                  <p className="text-xs mt-1 text-muted-foreground/80">Max 5MB. JPG, PNG, GIF, WEBP.</p>
                </div>
              </div>
            </div>

            {/* Reactions Enabled */}
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('reactionsEnabled')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('reactionsEnabledDescription')}
                </p>
              </div>
              <Switch
                checked={localConfig.reactionsEnabled ?? true}
                onCheckedChange={(checked) =>
                  updateField('reactionsEnabled', checked)
                }
              />
            </div>

            {/* Allowed Reactions */}
            {localConfig.reactionsEnabled && (
              <div className="space-y-2">
                <Label>{t('allowedReactions')}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {(localConfig.allowedReactions || []).length === 0 
                    ? t('allEmojisAllowed')
                    : t('restrictedEmojisDescription')}
                </p>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[60px]">
                  {(localConfig.allowedReactions || []).length === 0 ? (
                    <span className="text-muted-foreground text-sm italic">
                      {t('noRestrictionsHint')}
                    </span>
                  ) : (
                    (localConfig.allowedReactions || []).map((reaction) => (
                      <Badge
                        key={reaction}
                        variant="secondary"
                        className="text-lg px-3 py-1"
                      >
                        {reaction}
                        <button
                          type="button"
                          className="ml-2 hover:text-destructive"
                          onClick={() => removeReaction(reaction)}
                        >
                          <X size={14} />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <EmojiPicker onEmojiSelect={addReaction} />
                  <span className="text-sm text-muted-foreground">
                    {(localConfig.allowedReactions || []).length === 0 
                      ? t('addToRestrict')
                      : t('clickToAddReaction')}
                  </span>
                  <div className="flex-1" />
                  {(localConfig.allowedReactions || []).length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateField('allowedReactions', [])}
                    >
                      {t('allowAll')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Legal Settings (Terms & Privacy) */}
          <TabsContent value="legal" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">{t('termsOfService')}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('termsDescription')}
                </p>
              </div>
              
              {/* Terms - English */}
              <div className="space-y-2">
                <Label htmlFor="termsEn">{t('termsEn')}</Label>
                <Textarea
                  id="termsEn"
                  value={localConfig.termsContentEn || ''}
                  onChange={(e) => updateField('termsContentEn', e.target.value || null)}
                  placeholder={t('termsPlaceholder')}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              
              {/* Terms - Chinese */}
              <div className="space-y-2">
                <Label htmlFor="termsZh">{t('termsZh')}</Label>
                <Textarea
                  id="termsZh"
                  value={localConfig.termsContentZh || ''}
                  onChange={(e) => updateField('termsContentZh', e.target.value || null)}
                  placeholder={t('termsPlaceholder')}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              
              {/* Terms - Japanese */}
              <div className="space-y-2">
                <Label htmlFor="termsJa">{t('termsJa')}</Label>
                <Textarea
                  id="termsJa"
                  value={localConfig.termsContentJa || ''}
                  onChange={(e) => updateField('termsContentJa', e.target.value || null)}
                  placeholder={t('termsPlaceholder')}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <Label className="text-base font-semibold">{t('privacyPolicy')}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('privacyDescription')}
                </p>
              </div>
              
              {/* Privacy - English */}
              <div className="space-y-2">
                <Label htmlFor="privacyEn">{t('privacyEn')}</Label>
                <Textarea
                  id="privacyEn"
                  value={localConfig.privacyContentEn || ''}
                  onChange={(e) => updateField('privacyContentEn', e.target.value || null)}
                  placeholder={t('privacyPlaceholder')}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              
              {/* Privacy - Chinese */}
              <div className="space-y-2">
                <Label htmlFor="privacyZh">{t('privacyZh')}</Label>
                <Textarea
                  id="privacyZh"
                  value={localConfig.privacyContentZh || ''}
                  onChange={(e) => updateField('privacyContentZh', e.target.value || null)}
                  placeholder={t('privacyPlaceholder')}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              
              {/* Privacy - Japanese */}
              <div className="space-y-2">
                <Label htmlFor="privacyJa">{t('privacyJa')}</Label>
                <Textarea
                  id="privacyJa"
                  value={localConfig.privacyContentJa || ''}
                  onChange={(e) => updateField('privacyContentJa', e.target.value || null)}
                  placeholder={t('privacyPlaceholder')}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
