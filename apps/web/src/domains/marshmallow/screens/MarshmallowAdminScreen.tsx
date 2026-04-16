// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import type { MarshmallowRejectionReason } from '@tcrn/shared';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
  Inbox,
  Loader2,
  MessageSquareHeart,
  Radio,
  Settings,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { MarshmallowConfigDialog } from '@/components/marshmallow/admin/MarshmallowConfigDialog';
import { MessageCard } from '@/components/marshmallow/admin/MessageCard';
import {
  type AdminMessageTab,
  buildMarshmallowPublicPath,
  DEFAULT_MARSHMALLOW_STATS,
  filterMarshmallowMessages,
  marshmallowAdminApi,
} from '@/domains/marshmallow/api/marshmallow-admin.api';
import { getQueryNumber, getQueryString, replaceQueryState } from '@/platform/routing/query-state';
import { useTalentStore } from '@/platform/state/talent-store';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/platform/ui';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function MarshmallowAdminScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTalent } = useTalentStore();
  const t = useTranslations('marshmallowAdmin');
  const rawTab = getQueryString(searchParams, 'tab', 'pending');
  const activeTab: AdminMessageTab =
    rawTab === 'approved' || rawTab === 'rejected' || rawTab === 'flagged'
      ? rawTab
      : 'pending';
  const [messages, setMessages] = useState<ReturnType<typeof filterMarshmallowMessages>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(DEFAULT_MARSHMALLOW_STATS);
  const settingsOpen = getQueryString(searchParams, 'settings') === 'open';
  const currentPage = getQueryNumber(searchParams, 'page', 1);
  const pageSize = getQueryNumber(searchParams, 'pageSize', 20);

  const replaceWorkspaceQuery = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      replaceQueryState({
        router,
        pathname,
        searchParams,
        updates,
      });
    },
    [pathname, router, searchParams],
  );

  const fetchMessages = useCallback(async () => {
    if (!currentTalent?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await marshmallowAdminApi.getMessageList(currentTalent.id, activeTab);
      setMessages(response.messages);
      setStats(response.stats);
    } catch {
      toast.error(t('loadFailed'));
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentTalent?.id, t]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  const handleApprove = async (messageId: string) => {
    if (!currentTalent?.id) {
      return;
    }

    try {
      await marshmallowAdminApi.approveMessage(currentTalent.id, messageId);
      toast.success(t('messageApproved'));
      await fetchMessages();
    } catch {
      toast.error(t('approveFailed'));
    }
  };

  const handleReject = async (
    messageId: string,
    reason: MarshmallowRejectionReason = 'other',
  ) => {
    if (!currentTalent?.id) {
      return;
    }

    try {
      await marshmallowAdminApi.rejectMessage(currentTalent.id, messageId, reason);
      toast.success(t('messageRejected'));
      await fetchMessages();
    } catch {
      toast.error(t('rejectFailed'));
    }
  };

  const handleUnreject = async (messageId: string) => {
    if (!currentTalent?.id) {
      return;
    }

    try {
      await marshmallowAdminApi.unrejectMessage(currentTalent.id, messageId);
      toast.success(t('messageUnrejected'));
      await fetchMessages();
    } catch {
      toast.error(t('unrejectFailed'));
    }
  };

  const handleReply = async (messageId: string, content: string) => {
    if (!currentTalent?.id) {
      return;
    }

    try {
      await marshmallowAdminApi.replyMessage(currentTalent.id, messageId, content);
      toast.success(t('replySuccess'));
      await fetchMessages();
    } catch {
      toast.error(t('replyFailed'));
    }
  };

  const handleToggleStar = async (messageId: string, isStarred: boolean) => {
    if (!currentTalent?.id) {
      return;
    }

    try {
      await marshmallowAdminApi.toggleStar(currentTalent.id, messageId, isStarred);
      await fetchMessages();
    } catch {
      toast.error(t('updateFailed'));
    }
  };

  const handleStreamerMode = async () => {
    if (!currentTalent) {
      return;
    }

    try {
      const streamerUrl = await marshmallowAdminApi.createStreamerModeUrl(currentTalent);
      if (streamerUrl) {
        window.open(streamerUrl, '_blank');
      }
    } catch {
      toast.error(t('generateSsoFailed'));
    }
  };

  const allFilteredMessages = useMemo(
    () => filterMarshmallowMessages(messages, activeTab),
    [activeTab, messages],
  );
  const totalPages = Math.ceil(allFilteredMessages.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, allFilteredMessages.length);
  const pagedMessages = allFilteredMessages.slice(startIndex, endIndex);
  const flaggedCount = useMemo(
    () => messages.filter((message) => message.profanityFlags.length > 0).length,
    [messages],
  );

  const counts = {
    pending: stats.pendingCount,
    approved: stats.approvedCount,
    rejected: stats.rejectedCount,
    flagged: flaggedCount,
    unread: stats.unreadCount,
  };

  if (!currentTalent) {
    return (
      <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
        <MessageSquareHeart className="mb-4 h-12 w-12 opacity-50" />
        <p>{t('selectTalent')}</p>
      </div>
    );
  }

  const publicUrl = buildMarshmallowPublicPath(currentTalent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('manageMessages', { talentName: currentTalent.displayName })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => {
              void handleStreamerMode();
            }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Radio size={16} className="mr-2" />
            {t('streamerMode')}
          </Button>
          <Link href={publicUrl} target="_blank">
            <Button variant="outline">
              <ExternalLink size={16} className="mr-2" />
              {t('publicForm')}
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => replaceWorkspaceQuery({ settings: 'open' })}
          >
            <Settings size={16} className="mr-2" />
            {t('settings')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <Inbox size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pending}</p>
                <p className="text-muted-foreground text-xs">{t('pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <Archive size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.approved}</p>
                <p className="text-muted-foreground text-xs">{t('approved')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                <Trash2 size={20} className="text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.rejected}</p>
                <p className="text-muted-foreground text-xs">{t('rejected')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                <Flag size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.flagged}</p>
                <p className="text-muted-foreground text-xs">{t('flagged')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('messages')}</CardTitle>
          <CardDescription>{t('messagesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              replaceWorkspaceQuery({
                tab: value === 'pending' ? null : value,
                page: null,
              })
            }
          >
            <TabsList>
              <TabsTrigger value="pending">
                {t('pending')} {counts.pending > 0 && <Badge className="ml-2">{counts.pending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="approved">{t('approved')}</TabsTrigger>
              <TabsTrigger value="rejected">{t('rejected')}</TabsTrigger>
              <TabsTrigger value="flagged">
                {t('flagged')}{' '}
                {counts.flagged > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {counts.flagged}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                </div>
              ) : pagedMessages.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <MessageSquareHeart className="mx-auto mb-4 h-12 w-12 opacity-30" />
                  <p>{t('noMessages')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {pagedMessages.map((message) => (
                      <MessageCard
                        key={message.id}
                        message={message}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onUnreject={handleUnreject}
                        onReply={handleReply}
                        onToggleStar={handleToggleStar}
                      />
                    ))}
                  </div>

                  {allFilteredMessages.length > 0 && (
                    <div className="mt-6 flex items-center justify-between gap-2 border-t pt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(value) =>
                            replaceWorkspaceQuery({
                              pageSize: Number(value) === 20 ? null : Number(value),
                              page: null,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">
                          {t('showingItems', {
                            start: startIndex + 1,
                            end: endIndex,
                            total: allFilteredMessages.length,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            replaceWorkspaceQuery({
                              page: currentPage - 1 <= 1 ? null : currentPage - 1,
                            })
                          }
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-muted-foreground px-3">
                          {t('page')} {currentPage} {t('pageOf', { total: totalPages || 1 })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            replaceWorkspaceQuery({
                              page: Math.min(totalPages, currentPage + 1),
                            })
                          }
                          disabled={currentPage >= totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MarshmallowConfigDialog
        open={settingsOpen}
        onOpenChange={(open) => replaceWorkspaceQuery({ settings: open ? 'open' : null })}
        talentId={currentTalent.id}
        onSave={() => {
          void fetchMessages();
        }}
      />
    </div>
  );
}
