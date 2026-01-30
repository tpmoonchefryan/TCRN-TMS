/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ADAPTER_CONFIG_KEYS, integrationSchema } from '@tcrn/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

type AdapterConfig = integrationSchema.AdapterConfig;
type AdapterType = integrationSchema.AdapterType;

import { Button, Input, Label } from '@/components/ui';

interface AdapterConfigFormProps {
  type: AdapterType;
  configs?: AdapterConfig[];
  readOnly?: boolean;
}

export function AdapterConfigForm({ type, configs = [], readOnly = false }: AdapterConfigFormProps) {
  // Merge definitions with existing values
  const definitions = ADAPTER_CONFIG_KEYS[type === 'webhook' ? 'api_key' : type] || [];
  
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    configs.forEach(c => initial[c.config_key] = c.config_value);
    return initial;
  });

  return (
    <div className="space-y-4">
      {definitions.map(def => (
        <ConfigField 
          key={def.key}
          definition={def}
          value={values[def.key] || ''}
          onChange={(val: string) => setValues(prev => ({ ...prev, [def.key]: val }))}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

function ConfigField({ definition, value, onChange, readOnly }: any) {
  const t = useTranslations('integrationManagement');
  const tToast = useTranslations('toast');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  const handleReveal = async () => {
    if (isRevealed) {
      setIsRevealed(false);
      return;
    }
    
    setIsLoading(true);
    // Mock API
    await new Promise(r => setTimeout(r, 600));
    setDisplayValue('mock_secret_value_123'); // In real app, this comes from API
    setIsRevealed(true);
    setIsLoading(false);
    toast.success(t('secretRevealedSuccess'));
  };

  return (
    <div className="space-y-2">
      <Label>
        {definition.label}
        {definition.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input 
          value={definition.secret && !isRevealed ? '******' : displayValue}
          onChange={e => {
            if (!readOnly) {
              setDisplayValue(e.target.value);
              onChange(e.target.value);
            }
          }}
          disabled={readOnly}
          type={definition.secret && !isRevealed ? 'password' : 'text'}
          className="pr-20"
        />
        {definition.secret && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-7 text-xs text-muted-foreground"
            onClick={handleReveal}
            disabled={isLoading || readOnly}
          >
            {isLoading ? '...' : isRevealed ? t('hide') : t('reveal')}
          </Button>
        )}
      </div>
    </div>
  );
}
