// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertCircle, Database, ExternalLink, Image, Plus, Save, Shield, Trash2 } from 'lucide-react';

import { UnifiedCustomDomainCard } from '@/components/settings/UnifiedCustomDomainCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { SocialLink, TalentData } from './types';

interface TalentDetailsTabProps {
  talentId: string;
  talent: TalentData;
  editedSocialLinks: SocialLink[];
  socialLinksChanged: boolean;
  isSaving: boolean;
  onTalentChange: (talent: TalentData) => void;
  onAddSocialLink: () => void;
  onUpdateSocialLink: (index: number, field: keyof SocialLink, value: string) => void;
  onRemoveSocialLink: (index: number) => void;
  onOpenSocialLink: (url: string) => void;
  onSave: () => void;
  onDomainChange: () => Promise<void>;
  t: (key: string) => string;
  tc: (key: string) => string;
  tTalent: (key: string) => string;
  tForms: (key: string) => string;
}

export function TalentDetailsTab({
  talentId,
  talent,
  editedSocialLinks,
  socialLinksChanged,
  isSaving,
  onTalentChange,
  onAddSocialLink,
  onUpdateSocialLink,
  onRemoveSocialLink,
  onOpenSocialLink,
  onSave,
  onDomainChange,
  t,
  tc,
  tTalent,
  tForms,
}: TalentDetailsTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('talentInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('talentCode')}</Label>
              <Input value={talent.code} disabled />
              <p className="text-xs text-muted-foreground">{tTalent('cannotChangeAfterCreation')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('displayName')}</Label>
              <Input
                value={talent.displayName}
                onChange={(event) =>
                  onTalentChange({ ...talent, displayName: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('path')}</Label>
              <Input value={talent.path} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Database size={14} /> {tTalent('profileStore')}
              </Label>
              {talent.profileStore ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{talent.profileStore.nameEn}</span>
                      {talent.profileStore.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          {tc('default')}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {talent.profileStore.code}
                    </Badge>
                  </div>
                  {talent.profileStore.piiProxyUrl && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield size={12} />
                      <span>{tTalent('piiEnabled')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                    <AlertCircle size={14} />
                    <span>{tTalent('noProfileStore')}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{tTalent('profileStoreDesc')}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image size={14} /> Avatar URL
              </Label>
              <Input
                value={talent.avatarUrl || ''}
                onChange={(event) =>
                  onTalentChange({
                    ...talent,
                    avatarUrl: event.target.value || null,
                  })
                }
                placeholder={tForms('placeholders.url')}
              />
            </div>
          </CardContent>
        </Card>

        <UnifiedCustomDomainCard
          talentId={talentId}
          talentCode={talent.code}
          onDomainChange={onDomainChange}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{tTalent('socialLinks')}</span>
              {socialLinksChanged && (
                <Badge variant="outline" className="text-xs">
                  {tc('unsaved')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {editedSocialLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={link.platform}
                    onChange={(event) =>
                      onUpdateSocialLink(index, 'platform', event.target.value)
                    }
                    placeholder={tTalent('platformPlaceholder')}
                    className="w-32"
                  />
                  <Input
                    value={link.url}
                    onChange={(event) => onUpdateSocialLink(index, 'url', event.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenSocialLink(link.url)}
                    disabled={!link.url}
                  >
                    <ExternalLink size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveSocialLink(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={onAddSocialLink}>
                <Plus size={14} className="mr-2" />
                {tTalent('addLink')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={onSave} disabled={isSaving}>
          <Save size={16} className="mr-2" />
          {isSaving ? tc('saving') : tc('saveChanges')}
        </Button>
      </div>
    </>
  );
}
