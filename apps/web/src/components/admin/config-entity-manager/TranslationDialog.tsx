// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TranslationData {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
}

interface TranslationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TranslationData;
  onSave: (data: TranslationData) => void;
  title?: string;
  includeDescription?: boolean;
}

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function TranslationDialog({
  open,
  onOpenChange,
  data,
  onSave,
  title = 'Edit Translations',
  includeDescription = true,
}: TranslationDialogProps) {
  const [formData, setFormData] = useState<TranslationData>(data);
  const [activeTab, setActiveTab] = useState('en');

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const updateField = (field: keyof TranslationData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value || null,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Edit translations for all supported languages. English is required, others will fallback to English if empty.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            {languages.map((lang) => (
              <TabsTrigger key={lang.code} value={lang.code}>
                <span className="mr-1">{lang.flag}</span>
                {lang.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {languages.map((lang) => (
            <TabsContent key={lang.code} value={lang.code} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`name-${lang.code}`}>
                  Name {lang.code === 'en' && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={`name-${lang.code}`}
                  value={formData[`name${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}` as keyof TranslationData] || ''}
                  onChange={(e) =>
                    updateField(
                      `name${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}` as keyof TranslationData,
                      e.target.value
                    )
                  }
                  placeholder={lang.code === 'en' ? 'Required' : `Optional (fallback to English)`}
                  required={lang.code === 'en'}
                />
              </div>

              {includeDescription && (
                <div className="space-y-2">
                  <Label htmlFor={`desc-${lang.code}`}>Description</Label>
                  <Textarea
                    id={`desc-${lang.code}`}
                    value={formData[`description${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}` as keyof TranslationData] || ''}
                    onChange={(e) =>
                      updateField(
                        `description${lang.code.charAt(0).toUpperCase() + lang.code.slice(1)}` as keyof TranslationData,
                        e.target.value
                      )
                    }
                    placeholder={`Optional description in ${lang.label}`}
                    rows={3}
                  />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.nameEn}>
            Save Translations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
