/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { ImageGalleryProps } from './schema';

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
import { Switch } from '@/components/ui/switch';


interface ImageGalleryEditorProps {
  props: ImageGalleryProps;
  onChange: (props: Partial<ImageGalleryProps>) => void;
}

export const ImageGalleryEditor: React.FC<ImageGalleryEditorProps> = ({ props, onChange }) => {
  const t = useTranslations('homepageComponentEditor');
  
  const addImage = () => {
    onChange({
      images: [...(props.images || []), { url: '', caption: '' }]
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...(props.images || [])];
    newImages.splice(index, 1);
    onChange({ images: newImages });
  };

  const updateImage = (index: number, field: string, value: string) => {
    const newImages = [...(props.images || [])];
    newImages[index] = { ...newImages[index], [field]: value };
    onChange({ images: newImages });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('layoutMode')}</Label>
          <Select 
            value={props.layoutMode} 
            onValueChange={(v: any) => onChange({ layoutMode: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="carousel">{t('carousel')}</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="masonry">{t('masonry')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {props.layoutMode !== 'carousel' && (
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>{t('columns')}</Label>
              <Select 
                value={String(props.columns)} 
                onValueChange={(v) => onChange({ columns: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label>{t('gap')}</Label>
              <Select 
                value={props.gap} 
                onValueChange={(v: any) => onChange({ gap: v })}
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
        )}

        <div className="flex items-center justify-between">
          <Label>{t('showCaptions')}</Label>
          <Switch 
            checked={props.showCaptions} 
            onCheckedChange={(checked) => onChange({ showCaptions: checked })} 
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('images')}</Label>
          <Button variant="outline" size="sm" onClick={addImage} className="h-8 gap-1">
            <Plus size={14} /> {t('addImage')}
          </Button>
        </div>
        
        <div className="space-y-3">
          {props.images?.map((img, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30 group">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-slate-200 rounded overflow-hidden shrink-0 flex items-center justify-center">
                   {img.url ? (
                     <img src={img.url} alt="" className="h-full w-full object-cover" />
                   ) : (
                     <ImageIcon size={16} className="text-muted-foreground" />
                   )}
                </div>
                
                <Input 
                  value={img.url} 
                  onChange={(e) => updateImage(idx, 'url', e.target.value)}
                  placeholder={t('imageUrl')}
                  className="h-9"
                />
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeImage(idx)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              
              <Input 
                value={img.caption || ''} 
                onChange={(e) => updateImage(idx, 'caption', e.target.value)}
                placeholder={t('captionOptional')}
                className="h-8 text-xs"
              />
            </div>
          ))}
          
           {(!props.images || props.images.length === 0) && (
            <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
              {t('noImages')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
