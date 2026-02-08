// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { TestBlocklistSchema } from '@tcrn/shared';
import { AlertTriangle, CheckCircle2, Play, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

// Local enum to avoid import issues with @tcrn/shared in client components
const BlocklistPatternType = {
  KEYWORD: 'keyword',
  REGEX: 'regex',
  WILDCARD: 'wildcard',
} as const;

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@/components/ui';
import { securityApi } from '@/lib/api/client';
import { useZodForm } from '@/lib/form';

interface PatternTesterProps {
  defaultPattern?: string;
  defaultPatternType?: string;
}

export function PatternTester({
  defaultPattern = '',
  defaultPatternType = BlocklistPatternType.KEYWORD,
}: PatternTesterProps) {
  const t = useTranslations('security');
  const [result, setResult] = useState<{
    matched: boolean;
    positions: number[];
    highlightedContent: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useZodForm(TestBlocklistSchema, {
    defaultValues: {
      pattern: defaultPattern,
      patternType: defaultPatternType as 'keyword' | 'regex' | 'wildcard',
      testContent: 'This is a test message that might contain badword or spam.',
    },
  });

  const { register, handleSubmit } = form;

  // Keep form synced with props if needed, but for now simple state
  
  const onTest = async (data: { pattern: string; patternType: string; testContent: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { pattern, patternType, testContent } = data;
      
      if (!pattern || !testContent) {
        setResult(null);
        return;
      }

      // Call the backend API for pattern testing
      const response = await securityApi.testBlocklistPattern(testContent, pattern, patternType);
      
      if (response.success && response.data) {
        const apiResult = response.data;
        
        // If API returns highlighted_content, use it; otherwise build client-side
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let highlightedContent = (apiResult as any).highlighted_content || (apiResult as any).highlightedContent;
        
        if (!highlightedContent && apiResult.matched) {
          // Fallback: build highlighting client-side
          try {
            let regex: RegExp | null = null;
            if (patternType === 'keyword') {
              regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            } else if (patternType === 'regex') {
              regex = new RegExp(pattern, 'gi');
            } else if (patternType === 'wildcard') {
              const regexStr = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
              regex = new RegExp(regexStr, 'gi');
            }
            if (regex) {
              highlightedContent = testContent.replace(regex, (match: string) => 
                `<span class="bg-red-200 text-red-900 px-0.5 rounded border border-red-300">${match}</span>`
              );
            }
          } catch {
            highlightedContent = testContent;
          }
        }
        
        setResult({
          matched: apiResult.matched,
          positions: apiResult.positions || [],
          highlightedContent: highlightedContent || testContent,
        });
      } else {
        setError(t('testFailed'));
      }
    } catch (err: unknown) {
      setError((err as Error).message || t('testFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Play size={16} /> {t('patternSimulator')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">{t('pattern')}</Label>
            <Input 
              {...register('pattern')} 
              placeholder={t('patternPlaceholder')} 
              className="bg-white dark:bg-slate-950 font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t('patternType')}</Label>
            <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('patternType')}
            >
                <option value={BlocklistPatternType.KEYWORD}>{t('keyword')}</option>
                <option value={BlocklistPatternType.REGEX}>{t('regex')}</option>
                <option value={BlocklistPatternType.WILDCARD}>{t('wildcard')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{t('testContent')}</Label>
          <Textarea 
            {...register('testContent')} 
            className="bg-white dark:bg-slate-950 min-h-[80px]"
            placeholder={t('testContentPlaceholder')}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit(onTest)} disabled={isLoading} size="sm">
             {isLoading ? t('testing') : t('runTest')}
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-md border bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30 animate-in fade-in">
            <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400">
              <XCircle size={16} /> {error}
            </div>
          </div>
        )}

        {result && !error && (
          <div className={`p-4 rounded-md border ${result.matched ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30'} animate-in fade-in slide-in-from-top-1`}>
            <div className="flex items-center gap-2 font-medium mb-2">
              {result.matched ? (
                <span className="text-red-700 dark:text-red-400 flex items-center gap-1"><AlertTriangle size={16} /> {t('matchFound')}</span>
              ) : (
                <span className="text-green-700 dark:text-green-400 flex items-center gap-1"><CheckCircle2 size={16} /> {t('noMatch')}</span>
              )}
            </div>
            
            {result.matched && (
               <div className="mt-2 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 p-3 rounded border border-slate-100 dark:border-slate-800">
                  <div dangerouslySetInnerHTML={{ __html: result.highlightedContent }} />
               </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
