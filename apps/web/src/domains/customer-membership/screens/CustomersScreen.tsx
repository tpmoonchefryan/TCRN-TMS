// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';
import { formatDistanceToNow, type Locale as DateFnsLocale } from 'date-fns';
import { enUS, ja, zhCN } from 'date-fns/locale';
import { Building2, Loader2, Plus, Search, Upload, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CustomerStatusBadge, CustomerTypeIcon } from '@/components/customer/CustomerShared';
import { getTranslatedApiErrorMessage } from '@/lib/api/error-utils';
import {
  customerApi,
  type CustomerListItemResponse,
  type CustomerListParams,
} from '@/lib/api/modules/customer';
import { getQueryNumber, getQueryString, replaceQueryState } from '@/platform/routing/query-state';
import { useTalentStore } from '@/platform/state/talent-store';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/platform/ui';

type CustomerTab = 'all' | NonNullable<CustomerListParams['profileType']>;

const DATE_LOCALES: Record<'en' | 'zh' | 'ja', DateFnsLocale> = {
  en: enUS,
  zh: zhCN,
  ja,
};

export function CustomersScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('customers');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const locale = useLocale() as 'en' | 'zh' | 'ja';
  const { currentTalent } = useTalentStore();

  // Helper to get translated error message from API error
  const getErrorMessage = useCallback(
    (error: unknown): string => {
      return getTranslatedApiErrorMessage(error, te, te('generic'));
    },
    [te]
  );

  const rawTab = getQueryString(searchParams, 'tab', 'all');
  const activeTab: CustomerTab = rawTab === 'individual' || rawTab === 'company' ? rawTab : 'all';
  const search = getQueryString(searchParams, 'search');
  const currentPage = getQueryNumber(searchParams, 'page', 1);
  const [customers, setCustomers] = useState<CustomerListItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(search);
  const [pagination, setPagination] = useState({
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Get talentId from current talent context
  const talentId = currentTalent?.id || '';

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const replaceCustomersQuery = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      replaceQueryState({
        router,
        pathname,
        searchParams,
        updates,
      });
    },
    [pathname, router, searchParams]
  );

  const handleTabChange = (value: string) => {
    if (value !== 'all' && value !== 'individual' && value !== 'company') {
      return;
    }

    replaceCustomersQuery({
      tab: value === 'all' ? null : value,
      page: null,
    });
  };

  const fetchCustomers = useCallback(async () => {
    if (!talentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Use real API
      const response = await customerApi.list({
        talentId,
        page: currentPage,
        pageSize: pagination.pageSize,
        search: search || undefined,
        profileType: activeTab !== 'all' ? activeTab : undefined,
      });

      if (response.success && response.data) {
        setCustomers(response.data);
        if (response.meta?.pagination) {
          setPagination({
            pageSize: response.meta.pagination.pageSize,
            total: response.meta.pagination.totalCount,
            totalPages: response.meta.pagination.totalPages,
          });
        }
      } else {
        throw response.error || new Error('Failed to fetch customers');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, getErrorMessage, pagination.pageSize, search, talentId]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === search) {
        return;
      }

      replaceCustomersQuery({
        search: nextSearch || null,
        page: null,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [replaceCustomersQuery, search, searchInput]);

  // Show message if no talent selected
  if (!currentTalent) {
    return (
      <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
        <Users className="mb-4 h-12 w-12 opacity-50" />
        <p>{t('selectTalentToView')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('manageForTalent', { name: currentTalent.displayName })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" /> {tc('import')}
            </Button>
          </Link>
          <Link href="/customers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {t('addCustomer')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-lg border bg-white p-1 md:flex-row dark:bg-slate-950">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all" className="w-20">
              {tc('all')}
            </TabsTrigger>
            <TabsTrigger value="individual" className="w-24">
              {t('individuals')}
            </TabsTrigger>
            <TabsTrigger value="company" className="w-24">
              {t('companies')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex w-full gap-2 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border bg-white dark:bg-slate-950">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
            <Users className="mb-4 h-12 w-12 opacity-50" />
            <p>{t('noCustomers')}</p>
            {search && <p className="text-sm">{t('adjustSearch')}</p>}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]"></TableHead>
                  <TableHead>{t('customer')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('tags')}</TableHead>
                  <TableHead>{t('source')}</TableHead>
                  <TableHead className="text-right">{t('lastUpdated')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell>
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/${customer.profileType === 'company' ? 'initials' : 'avataaars'}/svg?seed=${customer.nickname}`}
                        />
                        <AvatarFallback>
                          <CustomerTypeIcon type={customer.profileType} className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {customer.nickname}
                        {customer.profileType === 'company' && (
                          <Building2 size={14} className="text-slate-400" />
                        )}
                      </div>
                      {customer.profileType === 'company' && customer.companyShortName && (
                        <div className="text-muted-foreground text-xs">
                          {customer.companyShortName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomerStatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="h-5 px-1 text-[10px] font-normal"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length > 3 && (
                          <span className="text-muted-foreground text-xs">
                            +{customer.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">-</TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono text-xs">
                      {formatDistanceToNow(new Date(customer.updatedAt), {
                        addSuffix: true,
                        locale: DATE_LOCALES[locale] ?? enUS,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {t('showingRange', {
              start: (currentPage - 1) * pagination.pageSize + 1,
              end: Math.min(currentPage * pagination.pageSize, pagination.total),
              total: pagination.total,
            })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => replaceCustomersQuery({ page: currentPage - 1 })}
            >
              {tc('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => replaceCustomersQuery({ page: currentPage + 1 })}
            >
              {tc('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
