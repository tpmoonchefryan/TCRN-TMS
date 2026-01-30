/* eslint-disable @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Eye, EyeOff, Key, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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
import { integrationApi } from '@/lib/api/client';

interface AdapterConfig {
  id: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
}

interface Adapter {
  id: string;
  code: string;
  nameEn: string;
  adapterType: 'oauth' | 'api_key' | 'webhook';
  version: number;
}

interface AdapterConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adapter: Adapter | null;
  onSuccess: () => void;
}

// Config key definitions by adapter type
const CONFIG_DEFINITIONS: Record<string, Array<{ key: string; label: string; required: boolean; secret: boolean }>> = {
  oauth: [
    { key: 'client_id', label: 'Client ID', required: true, secret: false },
    { key: 'client_secret', label: 'Client Secret', required: true, secret: true },
    { key: 'scopes', label: 'Scopes', required: false, secret: false },
    { key: 'redirect_uri', label: 'Redirect URI', required: false, secret: false },
  ],
  api_key: [
    { key: 'api_key', label: 'API Key', required: true, secret: true },
    { key: 'api_secret', label: 'API Secret', required: false, secret: true },
    { key: 'endpoint_url', label: 'Endpoint URL', required: false, secret: false },
  ],
  webhook: [
    { key: 'callback_url', label: 'Callback URL', required: true, secret: false },
    { key: 'verify_token', label: 'Verify Token', required: false, secret: true },
  ],
};

export function AdapterConfigDialog({
  open,
  onOpenChange,
  adapter,
  onSuccess,
}: AdapterConfigDialogProps) {
  const t = useTranslations('integrationManagement');
  const tCommon = useTranslations('common');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [revealingKey, setRevealingKey] = useState<string | null>(null);
  const [adapterVersion, setAdapterVersion] = useState(0);

  const fetchConfigs = useCallback(async () => {
    if (!adapter) return;
    
    setIsLoading(true);
    try {
      const response = await integrationApi.getAdapter(adapter.id);
      if (response.success && response.data) {
        const data = response.data;
        setAdapterVersion(data.version);
        const configMap: Record<string, string> = {};
        for (const config of (data.configs || [])) {
          configMap[config.configKey] = config.configValue;
        }
        setConfigs(configMap);
      }
    } catch (error) {
      // Use empty configs
    } finally {
      setIsLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    if (open && adapter) {
      fetchConfigs();
      setRevealedKeys(new Set());
    }
  }, [open, adapter, fetchConfigs]);

  const handleReveal = async (configKey: string) => {
    if (!adapter) return;
    
    if (revealedKeys.has(configKey)) {
      setRevealedKeys((prev) => {
        const next = new Set(prev);
        next.delete(configKey);
        return next;
      });
      return;
    }

    setRevealingKey(configKey);
    try {
      const response = await integrationApi.revealConfig?.(adapter.id, configKey);
      if (response?.success && response.data) {
        setConfigs((prev) => ({ ...prev, [configKey]: response.data.configValue }));
        setRevealedKeys((prev) => new Set([...prev, configKey]));
        toast.success(t('secretRevealed'));
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
          setRevealedKeys((prev) => {
            const next = new Set(prev);
            next.delete(configKey);
            return next;
          });
        }, 30000);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setRevealingKey(null);
    }
  };

  const handleSave = async () => {
    if (!adapter) return;

    const configsToSave = Object.entries(configs)
      .filter(([_, value]) => value && value !== '******')
      .map(([configKey, configValue]) => ({ configKey, configValue }));

    if (configsToSave.length === 0) {
      toast.info(t('noChangesToSave'));
      return;
    }

    setIsSaving(true);
    try {
      const response = await integrationApi.updateAdapterConfigs?.(adapter.id, {
        configs: configsToSave,
        adapterVersion,
      });
      if (response?.success) {
        toast.success(t('configsSaved'));
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!adapter) return null;

  const definitions = CONFIG_DEFINITIONS[adapter.adapterType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key size={20} />
            {t('configureAdapter')}
          </DialogTitle>
          <DialogDescription>
            {t('configureAdapterDescription', { name: adapter.nameEn })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : (
          <div className="space-y-4">
            {definitions.map((def) => (
              <div key={def.key} className="space-y-2">
                <Label className="flex items-center gap-2">
                  {def.label}
                  {def.required && <span className="text-destructive">*</span>}
                  {def.secret && (
                    <Badge variant="outline" className="text-xs">
                      <Key size={10} className="mr-1" />
                      {t('encrypted')}
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    type={def.secret && !revealedKeys.has(def.key) ? 'password' : 'text'}
                    value={configs[def.key] || ''}
                    onChange={(e) => setConfigs((prev) => ({ ...prev, [def.key]: e.target.value }))}
                    placeholder={def.secret ? '••••••••' : `Enter ${def.label.toLowerCase()}`}
                    className="pr-20"
                  />
                  {def.secret && configs[def.key] === '******' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 text-xs"
                      onClick={() => handleReveal(def.key)}
                      disabled={revealingKey === def.key}
                    >
                      {revealingKey === def.key ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : revealedKeys.has(def.key) ? (
                        <>
                          <EyeOff size={12} className="mr-1" />
                          {t('hide')}
                        </>
                      ) : (
                        <>
                          <Eye size={12} className="mr-1" />
                          {t('reveal')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save size={14} className="mr-1" />
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
