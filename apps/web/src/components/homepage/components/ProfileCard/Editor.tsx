// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useTranslations } from 'next-intl';
import React from 'react';

import { ProfileCardProps } from './schema';

import { ImageUploader } from '@/components/shared/ImageUploader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ProfileCardEditorProps {
  props: ProfileCardProps;
  onChange: (props: Partial<ProfileCardProps>) => void;
}

export const ProfileCardEditor: React.FC<ProfileCardEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');

  const handleUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('displayName')}</Label>
        <Input 
          value={props.displayName} 
          onChange={(e) => onChange({ displayName: e.target.value })}
          placeholder={t('enterName')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('bio')}</Label>
        <Textarea 
          value={props.bio || ''} 
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder={t('enterBio')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('avatarUrl')}</Label>
        <div className="flex gap-4 items-start">
             <ImageUploader 
               value={props.avatarUrl || null} 
               onChange={(url) => onChange({ avatarUrl: url || '' })}
               onUpload={handleUpload}
               className="h-24 w-24"
             />
             <div className="flex-1 space-y-2">
                <Input 
                  value={props.avatarUrl || ''} 
                  onChange={(e) => onChange({ avatarUrl: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Upload a local image or paste a URL.
                </p>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('avatarShape')}</Label>
          <Select 
            value={props.avatarShape} 
            onValueChange={(v: any) => onChange({ avatarShape: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="circle">{t('circle')}</SelectItem>
              <SelectItem value="rounded">{t('rounded')}</SelectItem>
              <SelectItem value="square">{t('square')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('nameSize')}</Label>
          <Select 
            value={props.nameFontSize} 
            onValueChange={(v: any) => onChange({ nameFontSize: v })}
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
      
       <div className="space-y-2">
        <Label>{t('maxBioLines')}</Label>
        <Input 
          type="number"
          min={1}
          max={10}
          value={props.bioMaxLines} 
          onChange={(e) => onChange({ bioMaxLines: parseInt(e.target.value) || 3 })}
        />
      </div>
    </div>
  );
};
