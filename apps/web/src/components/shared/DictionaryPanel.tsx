// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    BookOpen,
    Loader2,
    Search,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { dictionaryApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { DICTIONARY_TYPES, DictionaryRecord } from './constants';

interface DictionaryPanelProps {
  showCounts?: boolean;
  searchable?: boolean;
}

export function DictionaryPanel({
  showCounts = true,
  searchable = true,
}: DictionaryPanelProps) {
  const t = useTranslations('settingsPage');
  const tc = useTranslations('common');

  // State
  const [dictionaryRecords, setDictionaryRecords] = useState<Record<string, DictionaryRecord[]>>({});
  const [selectedDictType, setSelectedDictType] = useState<string>(DICTIONARY_TYPES[0].code);
  const [dictSearch, setDictSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dictCounts, setDictCounts] = useState<Record<string, number>>({});

  // Fetch dictionary records for selected type
  const fetchDictionaryRecords = useCallback(async (dictType: string) => {
    setIsLoading(true);
    try {
      const response = await dictionaryApi.getByType(dictType);
      if (response.success && response.data) {
        const records = response.data.map((item: Record<string, unknown>) => ({
          code: item.code as string,
          nameEn: (item.nameEn as string) || '',
          nameZh: (item.nameZh as string) || '',
          nameJa: (item.nameJa as string) || '',
          isActive: (item.isActive as boolean) ?? true,
        }));
        setDictionaryRecords(prev => ({
          ...prev,
          [dictType]: records,
        }));
        setDictCounts(prev => ({
          ...prev,
          [dictType]: records.length,
        }));
      }
    } catch {
      // Keep empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch records when type changes
  useEffect(() => {
    fetchDictionaryRecords(selectedDictType);
  }, [selectedDictType, fetchDictionaryRecords]);

  // Filter dictionary records
  const filteredDictRecords = useMemo(() => {
    const records = dictionaryRecords[selectedDictType] || [];
    if (!dictSearch) return records;
    const search = dictSearch.toLowerCase();
    return records.filter(r =>
      r.code.toLowerCase().includes(search) ||
      r.nameEn.toLowerCase().includes(search) ||
      r.nameZh.includes(search)
    );
  }, [selectedDictType, dictSearch, dictionaryRecords]);

  const selectedDictInfo = DICTIONARY_TYPES.find(t => t.code === selectedDictType);

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Left Panel - Dictionary Types */}
      <Card className="col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('dictionaryTypes')}</CardTitle>
          <CardDescription className="text-xs">
            {t('inheritedFromTenant')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-1">
              {DICTIONARY_TYPES.map((type) => (
                <button
                  key={type.code}
                  onClick={() => setSelectedDictType(type.code)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                    selectedDictType === type.code
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{type.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{type.name}</p>
                      <p className="text-xs text-muted-foreground">{type.nameZh}</p>
                    </div>
                  </div>
                  {showCounts && (
                    <Badge variant="secondary" className="text-xs">
                      {dictCounts[type.code] ?? '-'}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel - Dictionary Records */}
      <Card className="col-span-9">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{selectedDictInfo?.icon}</span>
                {selectedDictInfo?.name}
              </CardTitle>
              <CardDescription>
                {t('systemDictReadOnly')}
              </CardDescription>
            </div>
            <Badge variant="outline">
              <BookOpen size={12} className="mr-1" />
              {tc('readOnly')}
            </Badge>
          </div>
          {searchable && (
            <div className="flex items-center gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder={t('searchDictionary')}
                  value={dictSearch}
                  onChange={(e) => setDictSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[calc(100vh-500px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDictRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{t('noDictionaryRecords')}</p>
                <p className="text-sm mt-1">{t('tryDifferentSearch')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">{tc('code')}</TableHead>
                    <TableHead>{tc('english')}</TableHead>
                    <TableHead>{tc('chinese')}</TableHead>
                    <TableHead>{tc('japanese')}</TableHead>
                    <TableHead className="w-[80px]">{tc('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDictRecords.map((record) => (
                    <TableRow key={record.code}>
                      <TableCell className="font-mono text-sm">{record.code}</TableCell>
                      <TableCell>{record.nameEn}</TableCell>
                      <TableCell>{record.nameZh}</TableCell>
                      <TableCell>{record.nameJa}</TableCell>
                      <TableCell>
                        {record.isActive ? (
                          <Badge variant="default" className="text-xs">{tc('active')}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{tc('inactive')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
