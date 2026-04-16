// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
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
  Textarea,
} from '@/components/ui';
import type { SystemDictionaryItemRecord } from '@/lib/api/modules/configuration';
import {
  configurationEntityApi,
  systemDictionaryApi,
} from '@/lib/api/modules/configuration';
import type { CustomerMembershipRecord } from '@/lib/api/modules/customer';
import { membershipApi } from '@/lib/api/modules/customer';

import {
  buildDefaultMembershipClasses,
  DEFAULT_PLATFORM_OPTIONS,
  type DialogMembershipClass,
  type DialogPlatformOption,
  mapMembershipTree,
  mapPlatformOptions,
} from './dialog-option-mappers';

interface MembershipDialogProps {
  customerId: string;
  talentId: string;
  membership?: CustomerMembershipRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MembershipDialog({
  customerId,
  talentId,
  membership,
  open,
  onOpenChange,
  onSuccess,
}: MembershipDialogProps) {
  const t = useTranslations('membershipDialog');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const tToast = useTranslations('toast');

  const [platforms, setPlatforms] = useState<DialogPlatformOption[]>([]);
  const [membershipClasses, setMembershipClasses] = useState<DialogMembershipClass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [platformCode, setPlatformCode] = useState('');
  const [selectedClassCode, setSelectedClassCode] = useState('');
  const [selectedTypeCode, setSelectedTypeCode] = useState('');
  const [selectedLevelCode, setSelectedLevelCode] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [note, setNote] = useState('');

  const isEdit = !!membership;
  const fallbackMembershipClasses = useMemo(
    () =>
      buildDefaultMembershipClasses({
        subscription: t('fallbackMembership.subscription'),
        channelMembership: t('fallbackMembership.channelMembership'),
        tier1: t('fallbackMembership.tier1'),
        tier2: t('fallbackMembership.tier2'),
        tier3: t('fallbackMembership.tier3'),
      }),
    [t],
  );

  // Get types for selected class
  const selectedClass = membershipClasses.find((c) => c.code === selectedClassCode);
  const availableTypes = selectedClass?.types || [];

  // Get levels for selected type
  const selectedType = availableTypes.find((t) => t.code === selectedTypeCode);
  const availableLevels = selectedType?.levels || [];

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const [platformsResponse, membershipTreeResponse] = await Promise.all([
          systemDictionaryApi.get<SystemDictionaryItemRecord>('social_platforms'),
          configurationEntityApi.getMembershipTree({ includeInactive: false }),
        ]);

        if (platformsResponse.success && platformsResponse.data?.length) {
          setPlatforms(mapPlatformOptions(platformsResponse.data));
        } else {
          setPlatforms(DEFAULT_PLATFORM_OPTIONS);
        }
        if (membershipTreeResponse.success && membershipTreeResponse.data?.length) {
          setMembershipClasses(mapMembershipTree(membershipTreeResponse.data));
        } else {
          setMembershipClasses(fallbackMembershipClasses);
        }
      } catch {
        setPlatforms(DEFAULT_PLATFORM_OPTIONS);
        setMembershipClasses(fallbackMembershipClasses);
      }

      setIsLoading(false);
    };

    if (open) {
      loadData();
    }
  }, [fallbackMembershipClasses, open]);

  // Initialize form when editing
  useEffect(() => {
    if (membership) {
      setPlatformCode(membership.platform?.code || '');
      setSelectedClassCode(membership.membershipClass?.code || '');
      setSelectedTypeCode(membership.membershipType?.code || '');
      setSelectedLevelCode(membership.membershipLevel?.code || '');
      setValidFrom(membership.validFrom ? membership.validFrom.split('T')[0] : '');
      setValidTo(membership.validTo ? membership.validTo.split('T')[0] : '');
      setAutoRenew(membership.autoRenew || false);
      setNote(membership.note || '');
    } else {
      // Reset form for new membership
      setPlatformCode('');
      setSelectedClassCode('');
      setSelectedTypeCode('');
      setSelectedLevelCode('');
      setValidFrom(new Date().toISOString().split('T')[0]);
      setValidTo('');
      setAutoRenew(false);
      setNote('');
    }
  }, [membership, open]);

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (!isEdit) {
      setSelectedTypeCode('');
      setSelectedLevelCode('');
    }
  }, [selectedClassCode, isEdit]);

  useEffect(() => {
    if (!isEdit) {
      setSelectedLevelCode('');
    }
  }, [selectedTypeCode, isEdit]);

  const handleSubmit = async () => {
    if (!platformCode) {
      toast.error(tForms('validation.required'));
      return;
    }
    if (!selectedLevelCode) {
      toast.error(tForms('validation.required'));
      return;
    }
    if (!validFrom) {
      toast.error(tForms('validation.required'));
      return;
    }

    setIsSaving(true);

    try {
      if (isEdit && membership) {
        await membershipApi.update(
          customerId,
          membership.id,
          {
            validTo: validTo || undefined,
            autoRenew,
            note: note.trim() || undefined,
          },
          talentId
        );
        toast.success(tToast('success.updated'));
      } else {
        await membershipApi.create(
          customerId,
          {
            platformCode,
            membershipLevelCode: selectedLevelCode,
            validFrom,
            validTo: validTo || undefined,
            autoRenew,
            note: note.trim() || undefined,
          },
          talentId
        );
        toast.success(tToast('success.created'));
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : tToast('error.save'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
              <Label>{t('platform')} *</Label>
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

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>{t('class')} *</Label>
                <Select
                  value={selectedClassCode}
                  onValueChange={setSelectedClassCode}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectClass')} />
                  </SelectTrigger>
                  <SelectContent>
                    {membershipClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.code}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('type')} *</Label>
                <Select
                  value={selectedTypeCode}
                  onValueChange={setSelectedTypeCode}
                  disabled={isEdit || !selectedClassCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((type) => (
                      <SelectItem key={type.id} value={type.code}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('level')} *</Label>
                <Select
                  value={selectedLevelCode}
                  onValueChange={setSelectedLevelCode}
                  disabled={isEdit || !selectedTypeCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectLevel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLevels.map((level) => (
                      <SelectItem key={level.id} value={level.code}>
                        <div className="flex items-center gap-2">
                          {level.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: level.color }}
                            />
                          )}
                          {level.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('validFrom')} *</Label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  disabled={isEdit}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('validTo')}</Label>
                <Input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  min={validFrom}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t('autoRenew')}</Label>
              <Switch
                checked={autoRenew}
                onCheckedChange={setAutoRenew}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('note')}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('notePlaceholder')}
                rows={2}
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
