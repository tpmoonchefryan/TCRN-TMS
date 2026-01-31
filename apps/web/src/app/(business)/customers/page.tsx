/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

// Using local interface as API returns camelCase, not matching shared types
interface CustomerListItem {
  id: string;
  profileType: 'individual' | 'company';
  nickname: string;
  primaryLanguage?: string;
  status: { id: string; code: string; name: string; color: string | null } | null;
  tags: string[];
  isActive: boolean;
  companyShortName?: string;
  originTalent?: { id: string; displayName: string };
  membershipSummary?: { highestLevel: { name: string; rank: number } };
  createdAt: string;
  updatedAt: string;
}
import { formatDistanceToNow } from 'date-fns';
import { Building2, Filter, Loader2, Plus, Search, Upload, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CustomerStatusBadge, CustomerTypeIcon } from '@/components/customer/CustomerShared';
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
    TabsTrigger
} from '@/components/ui';
import { customerApi } from '@/lib/api/client';
import { useTalentStore } from '@/stores/talent-store';

export default function CustomersPage() {
  const router = useRouter();
  const t = useTranslations('customers');
  const te = useTranslations('errors');
  const { currentTalent } = useTalentStore();

  // Helper to get translated error message from API error
  const getErrorMessage = useCallback((error: any): string => {
    const errorCode = error?.code;
    if (errorCode && typeof errorCode === 'string') {
      try {
        const translated = te(errorCode as any);
        if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
          return translated;
        }
      } catch {
        // Fall through
      }
    }
    return error?.message || te('generic');
  }, [te]);
  
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Get talentId from current talent context
  const talentId = currentTalent?.id || '';

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
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search || undefined,
        profileType: activeTab !== 'all' ? (activeTab as 'individual' | 'company') : undefined,
      });

      if (response.success && response.data) {
        setCustomers(response.data);
        if (response.meta?.pagination) {
          setPagination({
            page: response.meta.pagination.page,
            pageSize: response.meta.pagination.pageSize,
            total: response.meta.pagination.totalCount,
            totalPages: response.meta.pagination.totalPages,
          });
        }
      } else {
        throw response.error || new Error('Failed to fetch customers');
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err));
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [talentId, pagination.page, pagination.pageSize, search, activeTab]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== '') {
        fetchCustomers();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredCustomers = customers;

  // Show message if no talent selected
  if (!currentTalent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-50" />
        <p>Please select a talent to view customers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Manage customers for {currentTalent.displayName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          </Link>
          <Link href="/customers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Customer
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-950 p-1 rounded-lg border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all" className="w-20">All</TabsTrigger>
            <TabsTrigger value="individual" className="w-24">Individuals</TabsTrigger>
            <TabsTrigger value="company" className="w-24">Companies</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t('searchPlaceholder')} 
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-white dark:bg-slate-950 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>No customers found</p>
            {search && <p className="text-sm">Try adjusting your search</p>}
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]"></TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(customer => (
                  <TableRow 
                    key={customer.id} 
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell>
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={`https://api.dicebear.com/7.x/${customer.profileType === 'company' ? 'initials' : 'avataaars'}/svg?seed=${customer.nickname}`} />
                        <AvatarFallback>
                          <CustomerTypeIcon type={customer.profileType} className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {customer.nickname}
                        {customer.profileType === 'company' && <Building2 size={14} className="text-slate-400" />}
                      </div>
                      {customer.profileType === 'company' && (customer as any).company?.companyShortName && (
                        <div className="text-xs text-muted-foreground">{(customer as any).company.companyShortName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomerStatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1 h-5 font-normal">
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{customer.tags.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {customer.originTalent?.displayName || '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {formatDistanceToNow(new Date(customer.updatedAt), { addSuffix: true })}
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} customers
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
