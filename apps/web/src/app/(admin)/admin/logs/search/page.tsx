// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Loader2,
  Search,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { logApi } from '@/lib/api/client';

interface LogResult {
  timestamp: string;
  level: string;
  message: string;
  labels: Record<string, string>;
}

export default function LogSearchPage() {
  const t = useTranslations('logsPage');
  const tCommon = useTranslations('common');

  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<LogResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Search params
  const [query, setQuery] = useState('');
  const [timeRange, setTimeRange] = useState('1h');
  const [limit, setLimit] = useState('100');
  const [app, setApp] = useState('all');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error(t('queryRequired'));
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await logApi.searchLoki?.({
        query,
        timeRange,
        limit: parseInt(limit),
        app: app !== 'all' ? app : undefined,
      });
      if (response?.success && response.data) {
        setResults(response.data.results || []);
        if (response.data.results?.length === 0) {
          toast.info(t('noResults'));
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(tCommon('error'), { description: err.message });
    } finally {
      setIsSearching(false);
    }
  }, [query, timeRange, limit, app, t, tCommon]);

  const getLevelBadge = (level: string) => {
    const levelColors: Record<string, string> = {
      debug: 'bg-gray-100 text-gray-700',
      info: 'bg-blue-100 text-blue-700',
      warn: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={levelColors[level.toLowerCase()] || 'bg-gray-100'}>
        {level}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <Terminal size={24} />
            {t('logExplorer')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('logExplorerDescription')}</p>
        </div>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search size={18} />
            {t('searchQuery')}
          </CardTitle>
          <CardDescription>{t('searchQueryDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('lokiQuery')}</Label>
            <Textarea
              placeholder='{app="api"} |= "error"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="font-mono text-sm"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{t('lokiQueryHint')}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar size={14} />
                {t('timeRange')}
              </Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">{t('last15Minutes')}</SelectItem>
                  <SelectItem value="1h">{t('lastHour')}</SelectItem>
                  <SelectItem value="6h">{t('last6Hours')}</SelectItem>
                  <SelectItem value="24h">{t('last24Hours')}</SelectItem>
                  <SelectItem value="7d">{t('last7Days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('application')}</Label>
              <Select value={app} onValueChange={setApp}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allApps')}</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('maxResults')}</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSearch} disabled={isSearching} className="w-full">
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('searching')}
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                {t('search')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('results')} ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Terminal className="mx-auto mb-4 opacity-30" size={48} />
                <p>{t('noResults')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-muted/50 border font-mono text-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {getLevelBadge(result.level)}
                        {Object.entries(result.labels).slice(0, 3).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}={value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap break-all">
                      {result.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
