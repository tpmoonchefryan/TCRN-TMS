/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    ArrowLeft,
    Building2,
    Edit,
    ExternalLink,
    History,
    Loader2,
    Plus,
    ShieldCheck,
    User
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { use, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CustomerStatusBadge } from '@/components/customer/CustomerShared';
import { MembershipDialog } from '@/components/customer/MembershipDialog';
import { PiiReveal } from '@/components/customer/PiiReveal';
import { PlatformIdentityDialog } from '@/components/customer/PlatformIdentityDialog';
import { Watermark } from '@/components/security/Watermark';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui';
import {
  customerApi,
  type CustomerCompanyDetailResponse,
  type CustomerDetailResponse,
  type CustomerMembershipRecord,
  type CustomerPlatformIdentity,
  type CustomerPlatformIdentityHistoryItem,
  type CustomerRecentAccessLogEntry,
  membershipApi,
  platformIdentityApi,
} from '@/lib/api/modules/customer';
import { useTalentStore } from '@/stores/talent-store';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params Promise (Next.js 15+ requirement)
  const { id: customerId } = use(params);
  
  const router = useRouter();
  const t = useTranslations('customerDetail');
  const tCommon = useTranslations('common');
  const { currentTalent } = useTalentStore();
  
  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [platformIdentities, setPlatformIdentities] = useState<CustomerPlatformIdentity[]>([]);
  const [identityHistory, setIdentityHistory] = useState<CustomerPlatformIdentityHistoryItem[]>([]);
  const [memberships, setMemberships] = useState<CustomerMembershipRecord[]>([]);
  const [accessLogs, setAccessLogs] = useState<CustomerRecentAccessLogEntry[]>([]);
  const [loadingIdentities, setLoadingIdentities] = useState(false);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  
  // Dialog states
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
  const [editingIdentity, setEditingIdentity] = useState<CustomerPlatformIdentity | null>(null);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<CustomerMembershipRecord | null>(null);

  const talentId = currentTalent?.id || '';

  // Fetch customer data
  const fetchCustomer = useCallback(async () => {
    // Guard: ensure customerId and talentId are valid before fetching
    if (!customerId || customerId === 'undefined' || !talentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await customerApi.get(customerId, talentId);
      if (response.success && response.data) {
        setCustomer(response.data);
        // Set access logs from customer data
        if (response.data.recentAccessHistory) {
          setAccessLogs(response.data.recentAccessHistory);
        }
      } else {
        throw new Error(response.error?.message || t('fetchFailed'));
      }
    } catch (err: any) {
      toast.error(t('loadFailed'));
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, talentId, t]);

  // Fetch platform identities
  const fetchPlatformIdentities = useCallback(async () => {
    if (!talentId) return;
    setLoadingIdentities(true);

    try {
      const [identitiesResponse, historyResponse] = await Promise.all([
        platformIdentityApi.list(customerId, talentId),
        platformIdentityApi.history(customerId, talentId),
      ]);

      if (identitiesResponse.success && identitiesResponse.data) {
        setPlatformIdentities(identitiesResponse.data);
      }
      if (historyResponse.success && historyResponse.data) {
        setIdentityHistory(historyResponse.data.items);
      }
    } catch (err: any) {
      // Silently fail - identities might not exist
    } finally {
      setLoadingIdentities(false);
    }
  }, [customerId, talentId]);

  // Fetch memberships
  const fetchMemberships = useCallback(async () => {
    if (!talentId) return;
    setLoadingMemberships(true);

    try {
      const response = await membershipApi.list(customerId, talentId, { includeExpired: true });
      if (response.success && response.data) {
        setMemberships(response.data.items);
      }
    } catch (err: any) {
      // Silently fail
    } finally {
      setLoadingMemberships(false);
    }
  }, [customerId, talentId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  useEffect(() => {
    if (customer && talentId) {
      fetchPlatformIdentities();
      fetchMemberships();
    }
  }, [customer, talentId, fetchPlatformIdentities, fetchMemberships]);

  // Handle deactivate
  const handleDeactivate = async () => {
    if (!customer || !talentId) return;
    
    try {
      await customerApi.deactivate(
        customer.id,
        'MANUAL_DEACTIVATION',
        customer.version || 1,
        talentId
      );
      toast.success(t('deactivateSuccess'));
      fetchCustomer();
    } catch (err: any) {
      toast.error(err.message || t('deactivateFailed'));
    }
  };

  // Handle reactivate
  const handleReactivate = async () => {
    if (!customer || !talentId) return;
    
    try {
      await customerApi.reactivate(customer.id, talentId);
      toast.success(t('reactivateSuccess'));
      fetchCustomer();
    } catch (err: any) {
      toast.error(err.message || t('reactivateFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">{t('notFound')}</p>
        <Button variant="outline" onClick={() => router.push('/customers')}>
          {t('backToCustomers')}
        </Button>
      </div>
    );
  }

  const isIndividual = customer.profileType === 'individual';
  const companyCustomer: CustomerCompanyDetailResponse | null =
    customer.profileType === 'company' ? customer : null;

  return (
    <Watermark className="min-h-screen">
      <div className="space-y-6 max-w-7xl mx-auto pb-20">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                  <AvatarImage src={`https://api.dicebear.com/7.x/${isIndividual ? 'avataaars' : 'initials'}/svg?seed=${customer.nickname}`} />
                  <AvatarFallback>
                    {isIndividual ? <User /> : <Building2 />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{customer.nickname}</h1>
                    <CustomerStatusBadge status={customer.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    {isIndividual ? t('individual') : t('company')} 
                    <span>•</span>
                    <span>{t('customerId')}: <span className="font-mono text-xs">{customer.id.slice(0, 8)}...</span></span>
                    {customer.originTalent && (
                      <>
                        <span>•</span>
                        <span>{t('origin')}: {customer.originTalent.displayName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {customer.isActive ? (
                  <Button variant="outline" onClick={handleDeactivate}>{t('deactivate')}</Button>
                ) : (
                  <Button variant="outline" onClick={handleReactivate}>{t('reactivate')}</Button>
                )}
                <Button onClick={() => router.push(`/customers/${customer.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" /> {t('editProfile')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">{t('overview')}</TabsTrigger>
            <TabsTrigger value="identities" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">{t('platformIdentities')}</TabsTrigger>
            <TabsTrigger value="memberships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">{t('memberships')}</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">{t('auditLogs')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {isIndividual ? (
                  <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-500" />
                        {t('personalInfoPii')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PiiReveal 
                        customer={customer as any} 
                        onReveal={(data) => {}} 
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {t('companyDetails')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('legalName')}</div>
                          <div className="font-medium">{companyCustomer?.company.companyLegalName || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('regNumber')}</div>
                          <div className="font-mono">{companyCustomer?.company.registrationNumber || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('website')}</div>
                          {companyCustomer?.company.website ? (
                            <a href={companyCustomer.company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              {companyCustomer.company.website}
                            </a>
                          ) : '-'}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">{t('contact')}</div>
                          <div>{companyCustomer?.company.contactEmail || '-'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('notes')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {customer.notes || t('noNotes')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('tags')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {customer.tags?.map((tag: string) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                      {(!customer.tags || customer.tags.length === 0) && (
                        <span className="text-sm text-muted-foreground">No tags</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex justify-between items-center">
                      {t('identities')}
                      <span className="text-xs font-normal text-muted-foreground">
                        {platformIdentities.length} linked
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {platformIdentities.slice(0, 3).map((identity) => (
                      <div key={identity.id} className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold"
                          style={{ color: identity.platform?.color || undefined }}
                        >
                          {identity.platform?.name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{identity.platformNickname || identity.platformUid}</div>
                          <div className="text-xs text-muted-foreground truncate">{identity.platform?.name}</div>
                        </div>
                        {identity.isVerified && <ShieldCheck size={14} className="text-blue-500" />}
                      </div>
                    ))}
                    {platformIdentities.length === 0 && (
                      <p className="text-sm text-muted-foreground">No platform identities</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Platform Identities Tab */}
          <TabsContent value="identities" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('platformIdentities')}</h2>
              <Button size="sm" onClick={() => { setEditingIdentity(null); setIdentityDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> {t('addIdentity')}
              </Button>
            </div>
            
            {loadingIdentities ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : platformIdentities.length === 0 ? (
              <Card className="py-12 text-center">
                <p className="text-muted-foreground">{t('noIdentities')}</p>
                <Button variant="outline" className="mt-4" onClick={() => { setEditingIdentity(null); setIdentityDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> {t('addFirstIdentity')}
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platformIdentities.map((identity) => (
                  <Card key={identity.id}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div 
                        className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border"
                        style={{ borderColor: identity.platform?.color ? `${identity.platform.color}40` : undefined }}
                      >
                        <span style={{ color: identity.platform?.color || undefined }} className="font-bold">
                          {identity.platform?.name?.[0] || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{identity.platformNickname || 'Unknown'}</h3>
                          {identity.isVerified && <ShieldCheck size={16} className="text-blue-500 fill-blue-50" />}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{identity.platform?.name}</span>
                          <span>•</span>
                          <span className="font-mono text-xs">{identity.platformUid}</span>
                        </div>
                        {identity.profileUrl && (
                          <a href={identity.profileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                            {t('viewProfile')} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setEditingIdentity(identity); setIdentityDialogOpen(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {identityHistory.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <History size={16} /> {t('identityHistory')}
                </h3>
                <div className="border rounded-lg bg-slate-50 dark:bg-slate-900 p-4">
                  {identityHistory.map((hist) => (
                    <div key={hist.id} className="flex gap-4 text-sm py-2 border-b last:border-0 border-slate-200 dark:border-slate-800">
                      <div className="w-32 shrink-0 text-muted-foreground text-xs pt-0.5">
                        {new Date(hist.capturedAt).toLocaleDateString()}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{hist.platform?.name}</span>
                        <span className="mx-2 text-slate-400">→</span>
                        <span className="text-muted-foreground">
                          {hist.changeType.replace('_', ' ')}:
                          {hist.oldValue && <span className="font-mono mx-1 line-through opacity-70">{hist.oldValue}</span>}
                          {hist.newValue && <span className="font-mono mx-1 font-medium text-slate-700 dark:text-slate-300">{hist.newValue}</span>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Memberships Tab */}
          <TabsContent value="memberships" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('memberships')}</h2>
              <Button size="sm" onClick={() => { setEditingMembership(null); setMembershipDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> {t('addMembership')}
              </Button>
            </div>

            {loadingMemberships ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : memberships.length === 0 ? (
              <Card className="py-12 text-center">
                <p className="text-muted-foreground">{t('noMemberships')}</p>
                <Button variant="outline" className="mt-4" onClick={() => { setEditingMembership(null); setMembershipDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> {t('addFirstMembership')}
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {memberships.map((mem) => (
                  <Card key={mem.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: mem.membershipLevel?.color || '#6b7280' }}
                      >
                        {mem.membershipLevel?.rank || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{mem.membershipLevel?.name || 'Unknown Level'}</div>
                        <div className="text-sm text-muted-foreground">
                          {mem.platform?.name}
                          {mem.validTo && (
                            <>
                              <span className="mx-1">•</span>
                              <span className={mem.isExpired ? 'text-red-500' : ''}>
                                {mem.isExpired ? 'Expired' : `Valid until ${new Date(mem.validTo).toLocaleDateString()}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {mem.autoRenew && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">{t('autoRenew')}</Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setEditingMembership(mem); setMembershipDialogOpen(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-6">
            <h2 className="text-lg font-semibold">{t('accessLogs')}</h2>
            
            {accessLogs.length === 0 ? (
              <Card className="py-12 text-center">
                <p className="text-muted-foreground">No access logs found</p>
              </Card>
            ) : (
              <div className="border rounded-md divide-y">
                {accessLogs.map((log, idx) => (
                  <div key={`${log.occurredAt}-${idx}`} className="p-3 text-sm flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-20 justify-center font-mono text-[10px]">{log.action}</Badge>
                      <div>
                        <span className="font-medium">{log.operator?.username || 'System'}</span>
                        <span className="text-muted-foreground mx-1">{t('via')}</span>
                        <span className="text-slate-600 font-medium">{log.talent?.displayName || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.occurredAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Platform Identity Dialog */}
      <PlatformIdentityDialog
        customerId={customerId}
        talentId={talentId}
        identity={editingIdentity}
        open={identityDialogOpen}
        onOpenChange={setIdentityDialogOpen}
        onSuccess={fetchPlatformIdentities}
      />

      {/* Membership Dialog */}
      <MembershipDialog
        customerId={customerId}
        talentId={talentId}
        membership={editingMembership}
        open={membershipDialogOpen}
        onOpenChange={setMembershipDialogOpen}
        onSuccess={fetchMemberships}
      />
    </Watermark>
  );
}
