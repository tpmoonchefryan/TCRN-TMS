// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { securityApi } from '@/lib/api/client';

export function IpChecker() {
  const t = useTranslations('security');
  const [ip, setIp] = useState('');
  const [scope, setScope] = useState<'global' | 'admin' | 'public' | 'api'>('global');
  const [result, setResult] = useState<{
    allowed: boolean;
    reason?: string;
    matchedRule?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkIp = async () => {
    if (!ip) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await securityApi.checkIpAccess(ip, scope);
      if (response.success && response.data) {
        setResult({
          allowed: response.data.allowed,
          reason: response.data.reason,
          matchedRule: response.data.matched_rule || response.data.matchedRule,
        });
      } else {
        setError(t('checkFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('checkFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Globe size={18} /> {t('ipCheckTool')}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex gap-2">
                <Input 
                    placeholder={t('ipPlaceholder')} 
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="font-mono flex-1"
                />
                <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                    <option value="global">{t('scopeGlobal')}</option>
                    <option value="admin">{t('scopeAdmin')}</option>
                    <option value="public">{t('scopePublic')}</option>
                    <option value="api">{t('scopeApi')}</option>
                </select>
                <Button onClick={checkIp} disabled={isLoading || !ip}>
                    {isLoading ? t('checking') : t('checkAccess')}
                </Button>
            </div>

            {error && (
                <div className="p-4 rounded-lg border bg-red-50 border-red-200 text-red-800 flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" />
                    <div>{error}</div>
                </div>
            )}

            {result && !error && (
                <div className={`p-4 rounded-lg border flex items-start gap-3 ${result.allowed ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'}`}>
                    {result.allowed ? <CheckCircle className="shrink-0 mt-0.5" /> : <AlertCircle className="shrink-0 mt-0.5" />}
                    <div>
                        <div className="font-bold">{result.allowed ? t('accessAllowed') : t('accessDenied')}</div>
                        {!result.allowed && result.reason && (
                            <div className="text-sm mt-1">{t('reason')}: {result.reason}</div>
                        )}
                        {result.matchedRule && (
                            <div className="text-xs mt-2 bg-white/50 dark:bg-black/20 p-1.5 rounded font-mono">
                                {t('ruleMatch')}: {result.matchedRule.ip_pattern || result.matchedRule.ipPattern}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="text-xs text-muted-foreground mt-4">
                <p>{t('ipCheckDescription')}</p>
            </div>
        </CardContent>
    </Card>
  );
}
