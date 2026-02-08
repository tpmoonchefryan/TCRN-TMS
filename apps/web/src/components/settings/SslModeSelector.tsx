// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Cloud, ExternalLink, Lock, Server } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type SslMode = 'auto' | 'self_hosted' | 'cloudflare';

interface SslModeSelectorProps {
  value: SslMode;
  onChange: (mode: SslMode) => void;
  disabled?: boolean;
}

const SSL_MODES: { value: SslMode; icon: React.ReactNode }[] = [
  { value: 'auto', icon: <Lock className="h-5 w-5 text-green-500" /> },
  { value: 'self_hosted', icon: <Server className="h-5 w-5 text-blue-500" /> },
  { value: 'cloudflare', icon: <Cloud className="h-5 w-5 text-orange-500" /> },
];

export function SslModeSelector({ value, onChange, disabled }: SslModeSelectorProps) {
  const t = useTranslations('talentSettings.sslMode');

  const getLabel = (mode: SslMode) => {
    switch (mode) {
      case 'auto':
        return t('auto');
      case 'self_hosted':
        return t('selfHosted');
      case 'cloudflare':
        return t('cloudflare');
    }
  };

  const getDescription = (mode: SslMode) => {
    switch (mode) {
      case 'auto':
        return t('autoDesc');
      case 'self_hosted':
        return t('selfHostedDesc');
      case 'cloudflare':
        return t('cloudflareDesc');
    }
  };

  const getDocsUrl = (mode: SslMode) => {
    switch (mode) {
      case 'self_hosted':
        return t('selfHostedDocsUrl');
      case 'cloudflare':
        return t('cloudflareDocsUrl');
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{t('title')}</Label>
        <p className="text-xs text-muted-foreground">{t('description')}</p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(val: string) => onChange(val as SslMode)}
        disabled={disabled}
        className="space-y-2"
      >
        {SSL_MODES.map((mode) => {
          const docsUrl = getDocsUrl(mode.value);
          return (
            <div
              key={mode.value}
              className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                value === mode.value
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !disabled && onChange(mode.value)}
            >
              <RadioGroupItem value={mode.value} id={`ssl-${mode.value}`} className="mt-1" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {mode.icon}
                  <Label
                    htmlFor={`ssl-${mode.value}`}
                    className={`font-medium ${disabled ? '' : 'cursor-pointer'}`}
                  >
                    {getLabel(mode.value)}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">{getDescription(mode.value)}</p>
                {docsUrl && (
                  <a
                    href={docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('viewDocs')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
