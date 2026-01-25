// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { CalendarIcon, ChevronLeft, ChevronRight, Filter, User, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { publicApi } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { PublicMessageCard } from './PublicMessageCard';
import { useStreamerMode } from './StreamerModeContext';

// Message type
interface MarshmallowMessage {
  id: string;
  content: string;
  senderName: string | null;
  isAnonymous: boolean;
  replyContent: string | null;
  repliedAt: string | null;
  repliedBy?: { id: string; displayName: string } | null;
  reactionCounts: Record<string, number>;
  userReactions: string[];
  createdAt: string;
  isRead?: boolean;
}

interface MessageFeedProps {
  path: string;
  initialMessages: MarshmallowMessage[];
  reactionsEnabled: boolean;
  allowedReactions: string[];
}

// Filter by read status (changed from reply status)
type ReadFilter = 'all' | 'read' | 'unread';

export function MessageFeed({
  path,
  initialMessages,
  reactionsEnabled,
  allowedReactions,
}: MessageFeedProps) {
  const t = useTranslations('publicMarshmallow');
  const { isStreamerMode, user, ssoToken } = useStreamerMode();
  const [messages, setMessages] = useState<MarshmallowMessage[]>(initialMessages);
  const [filteredMessages, setFilteredMessages] = useState<MarshmallowMessage[]>(initialMessages);
  
  // Filter states (changed from replyFilter to readFilter)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  
  // Read status tracking (local state for UI)
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());

  // Fetch fresh data on client mount to get user-specific data (fingerprint, isRead)
  // Uses cache-busting to ensure fresh data is fetched every time
  useEffect(() => {
    const fetchFreshData = async () => {
      try {
        // Get fingerprint from localStorage or generate one
        let fingerprint = localStorage.getItem('mm_fingerprint');
        if (!fingerprint) {
          fingerprint = crypto.randomUUID();
          localStorage.setItem('mm_fingerprint', fingerprint);
        }
        
        // Always bust cache to get fresh isRead status
        const response = await publicApi.getPublicMessages(path, undefined, 200, fingerprint, true);
        if (response.success && response.data?.messages) {
          setMessages(response.data.messages);
        }
      } catch (error) {
        console.error('Failed to fetch fresh messages:', error);
      }
    };
    
    fetchFreshData();
  }, [path]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

  // Apply filters
  useEffect(() => {
    let filtered = [...messages];
    
    // Read filter (changed from reply filter)
    if (readFilter === 'read') {
      filtered = filtered.filter(m => m.isRead === true || readMessages.has(m.id));
    } else if (readFilter === 'unread') {
      filtered = filtered.filter(m => m.isRead !== true && !readMessages.has(m.id));
    }
    
    // Date filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(m => new Date(m.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => new Date(m.createdAt) <= end);
    }
    
    setFilteredMessages(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [messages, readFilter, startDate, endDate, readMessages]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMessages.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredMessages.length);
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  // Mark message as read (SSO authenticated)
  const handleMarkRead = useCallback(async (messageId: string) => {
    if (!isStreamerMode || !ssoToken) {
      toast.error(t('streamerModeRequired'));
      return;
    }
    
    try {
      const response = await publicApi.markMarshmallowReadAuth(path, messageId, ssoToken);
      // Backend returns { success, isRead } directly (not wrapped in data)
      const isReadResult = (response as any).isRead ?? response.data?.isRead;
      if (response.success) {
        // Update local readMessages Set for immediate UI feedback
        setReadMessages(prev => {
          const next = new Set(prev);
          if (isReadResult) {
            next.add(messageId);
          } else {
            next.delete(messageId);
          }
          return next;
        });
        // Also update the messages array so state persists across filter changes
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, isRead: isReadResult } : m
        ));
        toast.success(isReadResult ? t('markedAsRead') : t('markedAsUnread'));
      }
    } catch (error) {
      toast.error(t('markReadFailed'));
    }
  }, [path, ssoToken, isStreamerMode, t]);

  // Reply to message (SSO authenticated)
  const handleReply = useCallback(async (messageId: string, content: string) => {
    if (!isStreamerMode || !ssoToken) {
      toast.error(t('streamerModeRequired'));
      return;
    }
    
    try {
      const response = await publicApi.replyMarshmallowAuth(path, messageId, content, ssoToken);
      // Backend returns { success, replyContent, repliedAt, repliedBy } directly (not wrapped in data)
      const replyData = response.data || response;
      if (response.success && (replyData as any).replyContent) {
        // Update the message with the reply
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { 
                ...m, 
                replyContent: (replyData as any).replyContent,
                repliedAt: (replyData as any).repliedAt,
                repliedBy: (replyData as any).repliedBy,
              }
            : m
        ));
        toast.success(t('replySuccess'));
      }
    } catch (error) {
      toast.error(t('replyFailed'));
    }
  }, [path, ssoToken, isStreamerMode, t]);

  // Clear filters
  const clearFilters = () => {
    setReadFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = readFilter !== 'all' || startDate || endDate;

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return null;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Streamer Mode Banner */}
      {isStreamerMode && user && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 flex items-center gap-3">
          <User size={20} />
          <div className="flex-1">
            <p className="font-medium">{t('streamerMode')}</p>
            <p className="text-sm text-white/80">{t('loggedInAs', { name: user.displayName })}</p>
          </div>
        </div>
      )}

      {/* Filter Toggle Button */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "gap-2",
            hasActiveFilters && "border-primary text-primary"
          )}
        >
          <Filter size={16} />
          {t('filter')}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {(readFilter !== 'all' ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0)}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X size={14} className="mr-1" />
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-slate-200 space-y-4 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Read Filter (changed from Reply Filter) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">{t('readStatus')}</label>
              <Select value={readFilter} onValueChange={(v) => setReadFilter(v as ReadFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allMessages')}</SelectItem>
                  <SelectItem value="read">{t('readMessages')}</SelectItem>
                  <SelectItem value="unread">{t('unreadMessages')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">{t('fromDate')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? formatDate(startDate) : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">{t('toDate')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? formatDate(endDate) : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="space-y-6">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400">{hasActiveFilters ? t('noMatchingMessages') : t('noAnswered')}</p>
            {!hasActiveFilters && (
              <p className="text-sm text-slate-400 mt-1">{t('beFirst')}</p>
            )}
          </div>
        ) : (
          paginatedMessages.map((message) => {
            // Explicitly check for boolean true value from backend, or local read state
            const isMessageRead = message.isRead === true || readMessages.has(message.id);
            return (
              <PublicMessageCard
                key={message.id}
                message={message}
                reactionsEnabled={reactionsEnabled}
                allowedReactions={allowedReactions}
                path={path}
                isStreamerMode={isStreamerMode}
                isRead={isMessageRead}
                onReply={isStreamerMode ? (content) => handleReply(message.id, content) : undefined}
                onMarkRead={isStreamerMode ? () => handleMarkRead(message.id) : undefined}
              />
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {filteredMessages.length > 0 && (
        <div className="mt-6 bg-white/80 backdrop-blur rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
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
            <span className="text-muted-foreground text-xs sm:text-sm">
              {t('showingItems', { 
                start: startIndex + 1, 
                end: endIndex, 
                total: filteredMessages.length 
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
    </div>
  );
}
