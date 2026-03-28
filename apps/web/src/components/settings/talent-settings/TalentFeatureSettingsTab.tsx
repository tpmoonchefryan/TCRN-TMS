// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Globe, MessageSquareHeart, Save } from 'lucide-react';

import type { ConfigEntity } from '@/components/shared/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

import type { TalentData } from './types';
import { countInheritedConfigEntities, countLocalConfigEntities } from './utils';

interface TalentFeatureSettingsTabProps {
  talent: TalentData;
  configEntities: Record<string, ConfigEntity[]>;
  isSaving: boolean;
  onTalentChange: (talent: TalentData) => void;
  onSave: () => void;
  tc: (key: string) => string;
  tTalent: (key: string) => string;
}

export function TalentFeatureSettingsTab({
  talent,
  configEntities,
  isSaving,
  onTalentChange,
  onSave,
  tc,
  tTalent,
}: TalentFeatureSettingsTabProps) {
  const localConfigCount = countLocalConfigEntities(configEntities);
  const inheritedConfigCount = countInheritedConfigEntities(configEntities);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tTalent('featureSettings')}</CardTitle>
        <CardDescription>{tTalent('featureSettingsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <Globe size={16} />
              {tTalent('homepage')}
            </h4>
            <p className="text-sm text-muted-foreground">{tTalent('enablePublicHomepage')}</p>
          </div>
          <Switch
            checked={talent.settings.homepageEnabled}
            onCheckedChange={(checked) =>
              onTalentChange({
                ...talent,
                settings: { ...talent.settings, homepageEnabled: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquareHeart size={16} />
              {tTalent('marshmallow')}
            </h4>
            <p className="text-sm text-muted-foreground">
              {tTalent('enableAnonymousMessages')}
            </p>
          </div>
          <Switch
            checked={talent.settings.marshmallowEnabled}
            onCheckedChange={(checked) =>
              onTalentChange({
                ...talent,
                settings: { ...talent.settings, marshmallowEnabled: checked },
              })
            }
          />
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">{tTalent('statistics')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold">{talent.customerCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{tTalent('customers')}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold">{localConfigCount}</p>
              <p className="text-xs text-muted-foreground">{tTalent('localConfigs')}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold">{inheritedConfigCount}</p>
              <p className="text-xs text-muted-foreground">{tTalent('inheritedConfigs')}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold">{talent.socialLinks.length}</p>
              <p className="text-xs text-muted-foreground">{tTalent('socialLinks')}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onSave} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? tc('saving') : tc('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
