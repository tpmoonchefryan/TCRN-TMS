// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { TestBlocklistSchema } from '@tcrn/shared';
import { AlertTriangle, CheckCircle2, Play, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@/components/ui';
import {
  type BlocklistPatternType,
  securityApi,
  type TestBlocklistPatternResponse,
} from '@/lib/api/modules/security';
import { useZodForm } from '@/lib/form';

interface PatternTesterProps {
  defaultPattern?: string;
  defaultPatternType?: BlocklistPatternType;
}

const DEFAULT_PATTERN_TYPE: BlocklistPatternType = 'keyword';

export function PatternTester({
  defaultPattern = '',
  defaultPatternType = DEFAULT_PATTERN_TYPE,
}: PatternTesterProps) {
  const t = useTranslations('security');
  const [result, setResult] = useState<TestBlocklistPatternResponse | null>(null);
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

  const onTest = async (data: {
    pattern: string;
    patternType: BlocklistPatternType;
    testContent: string;
  }) => {
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
        setResult(response.data);
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
                <option value="keyword">{t('keyword')}</option>
                <option value="regex">{t('regex')}</option>
                <option value="wildcard">{t('wildcard')}</option>
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
