// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Archive, ChevronLeft, ChevronRight, ExternalLink, Flag, Inbox, Loader2, MessageSquareHeart, Radio, Settings, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { MarshmallowConfigDialog } from '@/components/marshmallow/admin/MarshmallowConfigDialog';
import { MessageCard } from '@/components/marshmallow/admin/MessageCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { marshmallowApi } from '@/lib/api/client';
import { useTalentStore } from '@/stores/talent-store';


// Message interface matching backend API response (camelCase)
interface MarshmallowMessage {
  id: string;
  content: string;
  senderName: string | null;
  isAnonymous: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  rejectionReason: string | null;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
  replyContent: string | null;
  repliedAt: string | null;
  repliedBy: { id: string; username: string } | null;
  reactionCounts: Record<string, number>;
  profanityFlags: string[];
  imageUrl?: string | null;
  imageUrls?: string[];
  socialLink?: string | null;
  createdAt: string;
}

// Stats interface matching backend response
interface MarshmallowStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  unreadCount: number;
}

export default function MarshmallowPage() {
  const { currentTalent } = useTalentStore();
  const t = useTranslations('marshmallowAdmin');
  const [activeTab, setActiveTab] = useState('pending');
  const [messages, setMessages] = useState<MarshmallowMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<MarshmallowStats>({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    unreadCount: 0,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    if (!currentTalent?.id) return;
    
    setIsLoading(true);
    try {
      const response = await marshmallowApi.getMessages(currentTalent.id, activeTab === 'flagged' ? undefined : activeTab);
      if (response.success && response.data) {
        // Backend returns { items: [], meta: { total, stats } } wrapped in response.data
        const data = response.data as { items?: MarshmallowMessage[]; meta?: { stats?: MarshmallowStats } };
        setMessages(data.items || []);
        // Update stats from response.data.meta.stats
        if (data.meta?.stats) {
          setStats(data.meta.stats);
        }
      }
    } catch (error) {
      toast.error(t('loadFailed'));
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTalent?.id, activeTab, t]);

  // Load messages on mount and when tab changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Handle approve message
  const handleApprove = async (messageId: string) => {
    if (!currentTalent?.id) return;
    try {
      await marshmallowApi.approveMessage(currentTalent.id, messageId);
      toast.success(t('messageApproved'));
      fetchMessages();
    } catch (error) {
      toast.error(t('approveFailed'));
    }
  };

  // Handle reject message
  const handleReject = async (messageId: string, reason: string = 'other') => {
    if (!currentTalent?.id) return;
    try {
      await marshmallowApi.rejectMessage(currentTalent.id, messageId, reason);
      toast.success(t('messageRejected'));
      fetchMessages();
    } catch (error) {
      toast.error(t('rejectFailed'));
    }
  };

  // Handle unreject message - restore to pending
  const handleUnreject = async (messageId: string) => {
    if (!currentTalent?.id) return;
    try {
      await marshmallowApi.unrejectMessage(currentTalent.id, messageId);
      toast.success(t('messageUnrejected'));
      fetchMessages();
    } catch (error) {
      toast.error(t('unrejectFailed'));
    }
  };

  // Handle reply message
  const handleReply = async (messageId: string, content: string) => {
    if (!currentTalent?.id) return;
    try {
      await marshmallowApi.replyMessage(currentTalent.id, messageId, content);
      toast.success(t('replySuccess'));
      fetchMessages();
    } catch (error) {
      toast.error(t('replyFailed'));
    }
  };

  // Handle star/unstar message
  const handleToggleStar = async (messageId: string, isStarred: boolean) => {
    if (!currentTalent?.id) return;
    try {
      await marshmallowApi.updateMessage(currentTalent.id, messageId, { isStarred: !isStarred });
      fetchMessages();
    } catch (error) {
      toast.error(t('updateFailed'));
    }
  };

  // Handle open in streamer mode
  const handleStreamerMode = async () => {
    if (!currentTalent?.id) return;
    try {
      const response = await marshmallowApi.generateSsoToken(currentTalent.id);
      if (response.success && response.data?.token) {
        const publicPath = currentTalent.homepagePath || currentTalent.code?.toLowerCase() || currentTalent.id;
        const streamerUrl = `/m/${publicPath}?sso=${response.data.token}`;
        window.open(streamerUrl, '_blank');
      }
    } catch (error) {
      toast.error(t('generateSsoFailed'));
    }
  };

  if (!currentTalent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <MessageSquareHeart className="h-12 w-12 mb-4 opacity-50" />
        <p>{t('selectTalent')}</p>
      </div>
    );
  }

  // Reset to page 1 when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, pageSize]);

  // Filter messages by tab (for flagged tab which filters client-side based on profanityFlags)
  const allFilteredMessages = activeTab === 'flagged' 
    ? messages.filter((msg) => msg.profanityFlags && msg.profanityFlags.length > 0)
    : messages;

  // Pagination calculations
  const totalPages = Math.ceil(allFilteredMessages.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, allFilteredMessages.length);
  const filteredMessages = allFilteredMessages.slice(startIndex, endIndex);

  // Count messages flagged by profanity filter
  const flaggedCount = messages.filter((m) => m.profanityFlags && m.profanityFlags.length > 0).length;

  const counts = {
    pending: stats.pendingCount,
    approved: stats.approvedCount,
    rejected: stats.rejectedCount,
    flagged: flaggedCount,
    unread: stats.unreadCount,
  };

  // Get public marshmallow URL
  const publicUrl = `/m/${currentTalent.homepagePath || currentTalent.code?.toLowerCase() || currentTalent.id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
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
            onClick={handleStreamerMode}
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
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} className="mr-2" />
            {t('settings')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Inbox size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pending}</p>
                <p className="text-xs text-muted-foreground">{t('pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Archive size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.approved}</p>
                <p className="text-xs text-muted-foreground">{t('approved')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Trash2 size={20} className="text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.rejected}</p>
                <p className="text-xs text-muted-foreground">{t('rejected')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Flag size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.flagged}</p>
                <p className="text-xs text-muted-foreground">{t('flagged')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>{t('messages')}</CardTitle>
          <CardDescription>{t('messagesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                {t('pending')} {counts.pending > 0 && <Badge className="ml-2">{counts.pending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="approved">{t('approved')}</TabsTrigger>
              <TabsTrigger value="rejected">{t('rejected')}</TabsTrigger>
              <TabsTrigger value="flagged">
                {t('flagged')} {counts.flagged > 0 && (
                  <Badge variant="destructive" className="ml-2">{counts.flagged}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquareHeart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>{t('noMessages')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {filteredMessages.map((message) => (
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
                  
                  {/* Pagination Controls */}
                  {allFilteredMessages.length > 0 && (
                    <div className="mt-6 pt-4 border-t flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(value) => setPageSize(Number(value))}
                        >
                          <SelectTrigger className="w-[80px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map(size => (
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
                            total: allFilteredMessages.length 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-muted-foreground">
                          {t('page')} {currentPage} {t('pageOf', { total: totalPages || 1 })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

      {/* Config Dialog */}
      <MarshmallowConfigDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        talentId={currentTalent.id}
        onSave={fetchMessages}
      />
    </div>
  );
}
