/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { SocialLinksProps } from './schema';


interface SocialLinksEditorProps {
  props: SocialLinksProps;
  onChange: (props: Partial<SocialLinksProps>) => void;
}

export const SocialLinksEditor: React.FC<SocialLinksEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');
  
  const addPlatform = () => {
    onChange({
      platforms: [...(props.platforms || []), { platformCode: 'twitter', url: '', label: '' }]
    });
  };

  const removePlatform = (index: number) => {
    const newPlatforms = [...(props.platforms || [])];
    newPlatforms.splice(index, 1);
    onChange({ platforms: newPlatforms });
  };

  const updatePlatform = (index: number, field: string, value: string) => {
    const newPlatforms = [...(props.platforms || [])];
    newPlatforms[index] = { ...newPlatforms[index], [field]: value };
    onChange({ platforms: newPlatforms });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('style')}</Label>
          <Select 
            value={props.style} 
            onValueChange={(v: any) => onChange({ style: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="icon">{t('iconOnly')}</SelectItem>
              <SelectItem value="button">{t('solid')}</SelectItem>
              <SelectItem value="pill">{t('outline')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('layout')}</Label>
          <Select 
            value={props.layout} 
            onValueChange={(v: any) => onChange({ layout: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">{t('horizontal')}</SelectItem>
              <SelectItem value="vertical">{t('vertical')}</SelectItem>
              <SelectItem value="grid">{t('grid2Col')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>{t('size')}</Label>
          <Select 
            value={props.iconSize} 
            onValueChange={(v: any) => onChange({ iconSize: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">{t('small')}</SelectItem>
              <SelectItem value="medium">{t('medium')}</SelectItem>
              <SelectItem value="large">{t('large')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('links')}</Label>
          <Button variant="outline" size="sm" onClick={addPlatform} className="h-8 gap-1">
            <Plus size={14} /> {t('addLink')}
          </Button>
        </div>
        
        <div className="space-y-3">
          {props.platforms?.map((platform, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30 group">
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Select 
                    value={platform.platformCode} 
                    onValueChange={(v) => updatePlatform(idx, 'platformCode', v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder={t('platform')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">{t('twitterX')}</SelectItem>
                      <SelectItem value="youtube">{t('youtube')}</SelectItem>
                      <SelectItem value="github">{t('github')}</SelectItem>
                      <SelectItem value="instagram">{t('instagram')}</SelectItem>
                      <SelectItem value="facebook">{t('facebook')}</SelectItem>
                      <SelectItem value="email">{t('email')}</SelectItem>
                      <SelectItem value="custom">{t('customLink')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input 
                    value={platform.label || ''} 
                    onChange={(e) => updatePlatform(idx, 'label', e.target.value)}
                    placeholder={`${t('label')} (optional)`}
                    className="h-8"
                  />
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removePlatform(idx)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              
              <Input 
                value={platform.url} 
                onChange={(e) => updatePlatform(idx, 'url', e.target.value)}
                placeholder="https://..."
                className="h-8"
              />
            </div>
          ))}
          
          {(!props.platforms || props.platforms.length === 0) && (
            <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
              {t('noPlatforms')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
