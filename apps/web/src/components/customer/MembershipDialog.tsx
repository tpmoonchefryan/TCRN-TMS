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
    Textarea,
} from '@/components/ui';
import { configurationEntityApi, membershipApi, systemDictionaryApi } from '@/lib/api/client';

interface Platform {
  id?: string;
  code: string;
  displayName: string;
}

interface MembershipLevel {
  id: string;
  code: string;
  name: string;
  rank: number;
  color?: string;
  typeId: string;
}

interface MembershipType {
  id: string;
  code: string;
  name: string;
  classId: string;
  levels: MembershipLevel[];
}

interface MembershipClass {
  id: string;
  code: string;
  name: string;
  types: MembershipType[];
}

interface MembershipRecord {
  id: string;
  platform: Platform;
  membershipClass?: { code: string; name: string };
  membershipType?: { code: string; name: string };
  membershipLevel: { code: string; name: string; rank?: number; color?: string };
  validFrom: string;
  validTo?: string;
  autoRenew: boolean;
  note?: string;
}

interface MembershipDialogProps {
  customerId: string;
  talentId: string;
  membership?: MembershipRecord | null;
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
  
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [membershipClasses, setMembershipClasses] = useState<MembershipClass[]>([]);
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

  // Get types for selected class
  const selectedClass = membershipClasses.find(c => c.code === selectedClassCode);
  const availableTypes = selectedClass?.types || [];
  
  // Get levels for selected type
  const selectedType = availableTypes.find(t => t.code === selectedTypeCode);
  const availableLevels = selectedType?.levels || [];

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Load platforms from system dictionary API (separate try-catch)
      try {
        const platformsResponse = await systemDictionaryApi.get('social_platforms');
        if (platformsResponse.success && platformsResponse.data) {
          // System dictionary API returns paginated data, extract items array
          const items = Array.isArray(platformsResponse.data) 
            ? platformsResponse.data 
            : (platformsResponse.data.items || platformsResponse.data);
          if (items.length > 0) {
            setPlatforms(items.map((item: any) => ({
              id: item.id,
              code: item.code,
              displayName: item.extraData?.displayName || item.nameEn || item.name_en || item.code,
            })));
          } else {
            // Empty response, use fallback
            setPlatforms([
              { id: '1', code: 'YOUTUBE', displayName: 'YouTube' },
              { id: '2', code: 'TWITCH', displayName: 'Twitch' },
            ]);
          }
        }
      } catch (error) {
        console.error('Failed to load platforms from system dictionary:', error);
        // Use default platforms if API fails
        setPlatforms([
          { id: '1', code: 'YOUTUBE', displayName: 'YouTube' },
          { id: '2', code: 'TWITCH', displayName: 'Twitch' },
        ]);
      }

      // Load membership hierarchy from configuration entity API (separate try-catch)
      try {
        const classesResponse = await configurationEntityApi.list('membership-class', {
          includeInherited: true,
          includeInactive: false,
        });
        if (classesResponse.success && classesResponse.data && classesResponse.data.length > 0) {
          // Build hierarchy
          const classes: MembershipClass[] = [];
          for (const cls of classesResponse.data) {
            const typesResponse = await configurationEntityApi.list('membership-type', { 
              parentId: cls.id,
              includeInherited: true,
              includeInactive: false,
            });
            const types: MembershipType[] = [];
            
            if (typesResponse.success && typesResponse.data) {
              for (const type of typesResponse.data) {
                const levelsResponse = await configurationEntityApi.list('membership-level', { 
                  parentId: type.id,
                  includeInherited: true,
                  includeInactive: false,
                });
                
                types.push({
                  id: type.id,
                  code: type.code,
                  name: type.nameEn || type.name_en || type.code,
                  classId: cls.id,
                  levels: (levelsResponse.success && levelsResponse.data) 
                    ? levelsResponse.data.map((l: any) => ({
                        id: l.id,
                        code: l.code,
                        name: l.nameEn || l.name_en || l.code,
                        rank: l.rank || 1,
                        color: l.color,
                        typeId: type.id,
                      }))
                    : [],
                });
              }
            }
            
            classes.push({
              id: cls.id,
              code: cls.code,
              name: cls.nameEn || cls.name_en || cls.code,
              types,
            });
          }
          setMembershipClasses(classes);
        } else {
          // Empty response, use fallback
          setMembershipClasses([
            {
              id: '1',
              code: 'SUBSCRIPTION',
              name: 'Subscription',
              types: [
                {
                  id: '1',
                  code: 'CHANNEL_MEMBERSHIP',
                  name: 'Channel Membership',
                  classId: '1',
                  levels: [
                    { id: '1', code: 'TIER1', name: 'Tier 1', rank: 1, color: '#10b981', typeId: '1' },
                    { id: '2', code: 'TIER2', name: 'Tier 2', rank: 2, color: '#3b82f6', typeId: '1' },
                    { id: '3', code: 'TIER3', name: 'Tier 3', rank: 3, color: '#8b5cf6', typeId: '1' },
                  ],
                },
              ],
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to load membership hierarchy:', error);
        // Use default membership classes if API fails
        setMembershipClasses([
          {
            id: '1',
            code: 'SUBSCRIPTION',
            name: 'Subscription',
            types: [
              {
                id: '1',
                code: 'CHANNEL_MEMBERSHIP',
                name: 'Channel Membership',
                classId: '1',
                levels: [
                  { id: '1', code: 'TIER1', name: 'Tier 1', rank: 1, color: '#10b981', typeId: '1' },
                  { id: '2', code: 'TIER2', name: 'Tier 2', rank: 2, color: '#3b82f6', typeId: '1' },
                  { id: '3', code: 'TIER3', name: 'Tier 3', rank: 3, color: '#8b5cf6', typeId: '1' },
                ],
              },
            ],
          },
        ]);
      }
      
      setIsLoading(false);
    };
    
    if (open) {
      loadData();
    }
  }, [open]);

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
    } catch (error: any) {
      toast.error(error.message || tToast('error.save'));
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
