// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { format as formatDate } from 'date-fns';
import { AlertTriangle, CalendarIcon, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { configurationEntityApi, dictionaryApi, reportApi, ReportFormat } from '@/lib/api/client';
import { useTalentStore } from '@/stores/talent-store';

interface MfrConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filters: Record<string, unknown>, format: ReportFormat) => void;
}

interface FilterState {
  platformCodes: string[];
  membershipClassCodes: string[];
  membershipTypeCodes: string[];
  membershipLevelCodes: string[];
  statusCodes: string[];
  validFromStart: string;
  validFromEnd: string;
  validToStart: string;
  validToEnd: string;
  includeExpired: boolean;
  includeInactive: boolean;
}

interface PreviewRow {
  nickname: string;
  platformName: string;
  membershipLevelName: string;
  validFrom: string;
  validTo: string | null;
  statusName: string;
}

interface PreviewData {
  totalCount: number;
  preview: PreviewRow[];
  filterSummary: {
    platforms: string[];
    dateRange: string | null;
    includeExpired: boolean;
  };
}

interface DictionaryItem {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
}

const MAX_ROWS = 50000;

export function MfrConfigDialog({ isOpen, onClose, onSubmit }: MfrConfigDialogProps) {
  const t = useTranslations('report');
  const tCommon = useTranslations('common');
  const { currentTalent } = useTalentStore();
  
  const [step, setStep] = useState(1); // 1: Filter, 2: Preview
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [format, setFormat] = useState<ReportFormat>('xlsx');
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    platformCodes: [],
    membershipClassCodes: [],
    membershipTypeCodes: [],
    membershipLevelCodes: [],
    statusCodes: [],
    validFromStart: '',
    validFromEnd: '',
    validToStart: '',
    validToEnd: '',
    includeExpired: false,
    includeInactive: false,
  });
  
  // Options from API
  const [platforms, setPlatforms] = useState<DictionaryItem[]>([]);
  const [membershipClasses, setMembershipClasses] = useState<DictionaryItem[]>([]);
  const [membershipTypes, setMembershipTypes] = useState<DictionaryItem[]>([]);
  const [membershipLevels, setMembershipLevels] = useState<DictionaryItem[]>([]);
  const [customerStatuses, setCustomerStatuses] = useState<DictionaryItem[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  
  // Selected class/type IDs for cascading
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  
  // Load filter options from system dictionary and configuration entity
  useEffect(() => {
    if (!isOpen) return;
    
    const loadOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const [platformsRes, classesRes, statusesRes] = await Promise.all([
          // Platform from system dictionary (social_platforms)
          dictionaryApi.getByType('social_platforms'),
          // Membership class from configuration entity
          configurationEntityApi.list('membership-class'),
          // Customer status from configuration entity
          configurationEntityApi.list('customer-status'),
        ]);
        
        if (platformsRes.success && platformsRes.data) {
          // Handle both { items: [...] } and [...] response formats
          const items = Array.isArray(platformsRes.data) 
            ? platformsRes.data 
            : (platformsRes.data as { items?: DictionaryItem[] }).items || [];
          setPlatforms(items);
        }
        if (classesRes.success && classesRes.data) {
          const items = Array.isArray(classesRes.data) 
            ? classesRes.data 
            : (classesRes.data as { items?: DictionaryItem[] }).items || [];
          setMembershipClasses(items);
        }
        if (statusesRes.success && statusesRes.data) {
          const items = Array.isArray(statusesRes.data) 
            ? statusesRes.data 
            : (statusesRes.data as { items?: DictionaryItem[] }).items || [];
          setCustomerStatuses(items);
        }
      } catch {
        toast.error(t('loadOptionsFailed'));
      } finally {
        setIsLoadingOptions(false);
      }
    };
    
    loadOptions();
  }, [isOpen, t]);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setPreviewData(null);
      setFormat('xlsx');
      setSelectedClassId(null);
      setSelectedTypeId(null);
      setMembershipTypes([]);
      setMembershipLevels([]);
      setFilters({
        platformCodes: [],
        membershipClassCodes: [],
        membershipTypeCodes: [],
        membershipLevelCodes: [],
        statusCodes: [],
        validFromStart: '',
        validFromEnd: '',
        validToStart: '',
        validToEnd: '',
        includeExpired: false,
        includeInactive: false,
      });
    }
  }, [isOpen]);

  // Load membership types when class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setMembershipTypes([]);
      setMembershipLevels([]);
      setSelectedTypeId(null);
      return;
    }

    const loadTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const res = await configurationEntityApi.getMembershipTypesByClass(selectedClassId);
        if (res.success && res.data) {
          const items = Array.isArray(res.data) 
            ? res.data 
            : (res.data as { items?: DictionaryItem[] }).items || [];
          setMembershipTypes(items);
        }
      } catch {
        setMembershipTypes([]);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    loadTypes();
  }, [selectedClassId]);

  // Load membership levels when type is selected
  useEffect(() => {
    if (!selectedTypeId) {
      setMembershipLevels([]);
      return;
    }

    const loadLevels = async () => {
      setIsLoadingLevels(true);
      try {
        const res = await configurationEntityApi.getMembershipLevelsByType(selectedTypeId);
        if (res.success && res.data) {
          const items = Array.isArray(res.data) 
            ? res.data 
            : (res.data as { items?: DictionaryItem[] }).items || [];
          setMembershipLevels(items);
        }
      } catch {
        setMembershipLevels([]);
      } finally {
        setIsLoadingLevels(false);
      }
    };

    loadLevels();
  }, [selectedTypeId]);

  const handlePreview = async () => {
    if (!currentTalent?.id) return;
    
    setIsLoading(true);
    try {
      const response = await reportApi.search(currentTalent.id, filters, 20);
      
      if (response.success && response.data) {
        setPreviewData(response.data as PreviewData);
        setStep(2);
      }
    } catch (error: any) {
      toast.error(error.message || t('previewFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    // Build filters object (only include non-empty values)
    const submitFilters: Record<string, unknown> = {};
    
    if (filters.platformCodes.length > 0) {
      submitFilters.platformCodes = filters.platformCodes;
    }
    if (filters.membershipClassCodes.length > 0) {
      submitFilters.membershipClassCodes = filters.membershipClassCodes;
    }
    if (filters.membershipTypeCodes.length > 0) {
      submitFilters.membershipTypeCodes = filters.membershipTypeCodes;
    }
    if (filters.membershipLevelCodes.length > 0) {
      submitFilters.membershipLevelCodes = filters.membershipLevelCodes;
    }
    if (filters.statusCodes.length > 0) {
      submitFilters.statusCodes = filters.statusCodes;
    }
    if (filters.validFromStart) {
      submitFilters.validFromStart = filters.validFromStart;
    }
    if (filters.validFromEnd) {
      submitFilters.validFromEnd = filters.validFromEnd;
    }
    if (filters.validToStart) {
      submitFilters.validToStart = filters.validToStart;
    }
    if (filters.validToEnd) {
      submitFilters.validToEnd = filters.validToEnd;
    }
    if (filters.includeExpired) {
      submitFilters.includeExpired = true;
    }
    if (filters.includeInactive) {
      submitFilters.includeInactive = true;
    }
    
    onSubmit(submitFilters, format);
    setStep(1);
    setPreviewData(null);
  };

  const handlePlatformChange = (value: string) => {
    if (value === 'all') {
      setFilters(prev => ({ ...prev, platformCodes: [] }));
    } else {
      setFilters(prev => ({ ...prev, platformCodes: [value] }));
    }
  };

  const handleMembershipClassChange = (value: string, classId?: string) => {
    if (value === 'all') {
      setFilters(prev => ({ 
        ...prev, 
        membershipClassCodes: [],
        membershipTypeCodes: [],
        membershipLevelCodes: [],
      }));
      setSelectedClassId(null);
      setSelectedTypeId(null);
    } else {
      setFilters(prev => ({ 
        ...prev, 
        membershipClassCodes: [value],
        membershipTypeCodes: [],
        membershipLevelCodes: [],
      }));
      setSelectedClassId(classId || null);
      setSelectedTypeId(null);
    }
  };

  const handleMembershipTypeChange = (value: string, typeId?: string) => {
    if (value === 'all') {
      setFilters(prev => ({ 
        ...prev, 
        membershipTypeCodes: [],
        membershipLevelCodes: [],
      }));
      setSelectedTypeId(null);
    } else {
      setFilters(prev => ({ 
        ...prev, 
        membershipTypeCodes: [value],
        membershipLevelCodes: [],
      }));
      setSelectedTypeId(typeId || null);
    }
  };

  const handleMembershipLevelChange = (value: string) => {
    if (value === 'all') {
      setFilters(prev => ({ ...prev, membershipLevelCodes: [] }));
    } else {
      setFilters(prev => ({ ...prev, membershipLevelCodes: [value] }));
    }
  };

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      setFilters(prev => ({ ...prev, statusCodes: [] }));
    } else {
      setFilters(prev => ({ ...prev, statusCodes: [value] }));
    }
  };

  const exceedsLimit = !!(previewData && previewData.totalCount > MAX_ROWS);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('configureReport')}</DialogTitle>
          <DialogDescription>
            {step === 1 ? t('selectFilters') : t('previewData')}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-6 py-4">
            {isLoadingOptions ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Platform and Membership Class */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('platform')}</Label>
                    <Select
                      value={filters.platformCodes[0] || 'all'}
                      onValueChange={handlePlatformChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('allPlatforms')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allPlatforms')}</SelectItem>
                        {platforms.map(p => (
                          <SelectItem key={p.id} value={p.code}>
                            {p.nameZh || p.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('membershipClass')}</Label>
                    <Select
                      value={filters.membershipClassCodes[0] || 'all'}
                      onValueChange={(value) => {
                        const classItem = membershipClasses.find(c => c.code === value);
                        handleMembershipClassChange(value, classItem?.id);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('allClasses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allClasses')}</SelectItem>
                        {membershipClasses.map(c => (
                          <SelectItem key={c.id} value={c.code}>
                            {c.nameZh || c.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Membership Type and Level (Cascading) */}
                {selectedClassId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('membershipType')}</Label>
                      <Select
                        value={filters.membershipTypeCodes[0] || 'all'}
                        onValueChange={(value) => {
                          const typeItem = membershipTypes.find(t => t.code === value);
                          handleMembershipTypeChange(value, typeItem?.id);
                        }}
                        disabled={isLoadingTypes}
                      >
                        <SelectTrigger>
                          {isLoadingTypes ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue placeholder={t('allTypes')} />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('allTypes')}</SelectItem>
                          {membershipTypes.map(mt => (
                            <SelectItem key={mt.id} value={mt.code}>
                              {mt.nameZh || mt.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedTypeId && (
                      <div className="space-y-2">
                        <Label>{t('membershipLevel')}</Label>
                        <Select
                          value={filters.membershipLevelCodes[0] || 'all'}
                          onValueChange={handleMembershipLevelChange}
                          disabled={isLoadingLevels}
                        >
                          <SelectTrigger>
                            {isLoadingLevels ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder={t('allLevels')} />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('allLevels')}</SelectItem>
                            {membershipLevels.map(ml => (
                              <SelectItem key={ml.id} value={ml.code}>
                                {ml.nameZh || ml.nameEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('customerStatus')}</Label>
                    <Select
                      value={filters.statusCodes[0] || 'all'}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('allStatuses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allStatuses')}</SelectItem>
                        {customerStatuses.map(s => (
                          <SelectItem key={s.id} value={s.code}>
                            {s.nameZh || s.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Range - Valid From */}
                <div className="space-y-2">
                  <Label>{t('validFromRange')}</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!filters.validFromStart && 'text-muted-foreground'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.validFromStart 
                            ? formatDate(new Date(filters.validFromStart), 'yyyy-MM-dd') 
                            : t('startDate')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.validFromStart ? new Date(filters.validFromStart) : undefined}
                          onSelect={(date) => setFilters(prev => ({ 
                            ...prev, 
                            validFromStart: date ? formatDate(date, 'yyyy-MM-dd') : '' 
                          }))}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!filters.validFromEnd && 'text-muted-foreground'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.validFromEnd 
                            ? formatDate(new Date(filters.validFromEnd), 'yyyy-MM-dd') 
                            : t('endDate')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.validFromEnd ? new Date(filters.validFromEnd) : undefined}
                          onSelect={(date) => setFilters(prev => ({ 
                            ...prev, 
                            validFromEnd: date ? formatDate(date, 'yyyy-MM-dd') : '' 
                          }))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Date Range - Valid To */}
                <div className="space-y-2">
                  <Label>{t('validToRange')}</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!filters.validToStart && 'text-muted-foreground'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.validToStart 
                            ? formatDate(new Date(filters.validToStart), 'yyyy-MM-dd') 
                            : t('startDate')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.validToStart ? new Date(filters.validToStart) : undefined}
                          onSelect={(date) => setFilters(prev => ({ 
                            ...prev, 
                            validToStart: date ? formatDate(date, 'yyyy-MM-dd') : '' 
                          }))}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!filters.validToEnd && 'text-muted-foreground'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.validToEnd 
                            ? formatDate(new Date(filters.validToEnd), 'yyyy-MM-dd') 
                            : t('endDate')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.validToEnd ? new Date(filters.validToEnd) : undefined}
                          onSelect={(date) => setFilters(prev => ({ 
                            ...prev, 
                            validToEnd: date ? formatDate(date, 'yyyy-MM-dd') : '' 
                          }))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeExpired"
                      checked={filters.includeExpired}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, includeExpired: !!checked }))
                      }
                    />
                    <Label htmlFor="includeExpired" className="text-sm font-normal">
                      {t('includeExpired')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeInactive"
                      checked={filters.includeInactive}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, includeInactive: !!checked }))
                      }
                    />
                    <Label htmlFor="includeInactive" className="text-sm font-normal">
                      {t('includeInactive')}
                    </Label>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && previewData && (
          <div className="py-4 space-y-4">
            {/* Summary */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              exceedsLimit ? 'bg-destructive/10 border-destructive' : 'bg-slate-50 dark:bg-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                {exceedsLimit && <AlertTriangle className="h-4 w-4 text-destructive" />}
                <span className="text-sm text-muted-foreground">
                  {t('totalEstimate')}: 
                  <span className={`font-bold ml-1 ${exceedsLimit ? 'text-destructive' : 'text-foreground'}`}>
                    {previewData.totalCount.toLocaleString()}
                  </span> 
                  {' '}{t('rows')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {exceedsLimit && (
                  <Badge variant="destructive">{t('exceedsLimit', { limit: MAX_ROWS.toLocaleString() })}</Badge>
                )}
                <Badge variant="outline">{t('previewNonPii')}</Badge>
              </div>
            </div>
            
            {/* Preview Table */}
            <div className="border rounded-md max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('nickname')}</TableHead>
                    <TableHead>{t('platform')}</TableHead>
                    <TableHead>{t('level')}</TableHead>
                    <TableHead>{t('validFrom')}</TableHead>
                    <TableHead>{t('validTo')}</TableHead>
                  <TableHead>{t('statusLabel')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.preview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewData.preview.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.nickname}</TableCell>
                        <TableCell>{row.platformName}</TableCell>
                        <TableCell>{row.membershipLevelName}</TableCell>
                        <TableCell>{row.validFrom}</TableCell>
                        <TableCell>{row.validTo || '-'}</TableCell>
                        <TableCell>{row.statusName}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {previewData.preview.length > 0 && (
              <p className="text-xs text-muted-foreground">{t('previewNote')}</p>
            )}

            {/* Export Format Selection */}
            <div className="space-y-2 pt-2 border-t">
              <Label>{t('format')}</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="xlsx"
                    checked={format === 'xlsx'}
                    onChange={() => setFormat('xlsx')}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">{t('formatXlsx')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={() => setFormat('csv')}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">{t('formatCsv')}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <Button onClick={handlePreview} disabled={isLoading || isLoadingOptions}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('previewDataButton')}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>{tCommon('back')}</Button>
              <Button onClick={handleSubmit} disabled={exceedsLimit}>
                {t('generateReport')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
