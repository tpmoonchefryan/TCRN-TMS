// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { BookOpen, Loader2, Lock, Search } from 'lucide-react';
import { useMemo } from 'react';

import {
  DICTIONARY_TYPES,
  type DictionaryRecord,
} from '@/components/shared/constants';
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
import { cn } from '@/lib/utils';

import { filterDictionaryRecords } from './utils';

interface TalentDictionaryTabProps {
  dictionaryRecords: Record<string, DictionaryRecord[]>;
  dictCounts: Record<string, number>;
  selectedDictType: string;
  dictSearch: string;
  isLoadingDict: boolean;
  onSelectedDictTypeChange: (value: string) => void;
  onDictSearchChange: (value: string) => void;
  t: (key: string) => string;
  tc: (key: string) => string;
  tTalent: (key: string) => string;
}

export function TalentDictionaryTab({
  dictionaryRecords,
  dictCounts,
  selectedDictType,
  dictSearch,
  isLoadingDict,
  onSelectedDictTypeChange,
  onDictSearchChange,
  t,
  tc,
  tTalent,
}: TalentDictionaryTabProps) {
  const filteredDictRecords = useMemo(
    () => filterDictionaryRecords(dictionaryRecords, selectedDictType, dictSearch),
    [dictionaryRecords, selectedDictType, dictSearch]
  );

  const selectedDictInfo = DICTIONARY_TYPES.find((type) => type.code === selectedDictType);

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
      <Card className="col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tTalent('dictionaryTypes')}</CardTitle>
          <CardDescription className="text-xs">{tTalent('inheritedFromTenant')}</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-1">
              {DICTIONARY_TYPES.map((type) => (
                <button
                  key={type.code}
                  onClick={() => onSelectedDictTypeChange(type.code)}
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
                  <Badge variant="secondary" className="text-xs">
                    {dictCounts[type.code] ?? '-'}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="col-span-9">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">{selectedDictInfo?.icon}</span>
                {selectedDictInfo?.name}
              </CardTitle>
              <CardDescription>{tTalent('systemDictReadOnly')}</CardDescription>
            </div>
            <Badge variant="outline">
              <Lock size={12} className="mr-1" />
              {tc('readOnly')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                placeholder={t('searchDictionary')}
                value={dictSearch}
                onChange={(event) => onDictSearchChange(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[calc(100vh-500px)]">
            {isLoadingDict ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDictRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No records found for this dictionary type.</p>
                <p className="text-sm mt-1">Try a different search term.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Code</TableHead>
                    <TableHead>English</TableHead>
                    <TableHead>Chinese</TableHead>
                    <TableHead>Japanese</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
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
                          <Badge variant="default" className="text-xs">
                            {tc('active')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {tc('inactive')}
                          </Badge>
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
