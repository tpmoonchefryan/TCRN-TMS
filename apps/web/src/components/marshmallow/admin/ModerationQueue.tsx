// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    Archive,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Inbox,
    Search,
    XCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { MarshmallowMessage, MessageCard } from './MessageCard';

import {
    Badge,
    Button,
    Input,
    ScrollArea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Tabs,
    TabsList,
    TabsTrigger
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface ModerationQueueProps {
  messages: MarshmallowMessage[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onReply: (id: string, content: string) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function ModerationQueue({ messages, onApprove, onReject, onReply }: ModerationQueueProps) {
  const t = useTranslations('marshmallowAdmin');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      const matchesSearch = msg.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'pending' ? msg.status === 'pending' :
        activeTab === 'approved' ? msg.status === 'approved' :
        activeTab === 'rejected' ? (msg.status === 'rejected' || msg.status === 'spam') :
        true;
      
      return matchesSearch && matchesTab;
    });
  }, [messages, activeTab, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMessages.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredMessages.length);
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, pageSize]);

  // Selected message detail
  const selectedMessage = messages.find(m => m.id === selectedId) || paginatedMessages[0];

  // Stats
  const stats = useMemo(() => ({
    pending: messages.filter(m => m.status === 'pending').length,
    approved: messages.filter(m => m.status === 'approved').length,
    rejected: messages.filter(m => m.status === 'rejected' || m.status === 'spam').length
  }), [messages]);

  // Keyboard shortcuts (Mock)
  // In real app, use useHotkeys hook

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      
      {/* Sidebar: List */}
      <div className="w-full md:w-1/3 min-w-[320px] flex flex-col border-r bg-slate-50/50 dark:bg-slate-900/50">
        {/* Toolbar */}
        <div className="p-4 border-b space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t('searchMessages')} 
              className="pl-9 bg-white dark:bg-slate-950"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 h-9">
              <TabsTrigger value="pending" className="text-xs">
                {t('pending')}
                <Badge variant="secondary" className="ml-1.5 h-5 px-1 bg-yellow-100 text-yellow-700">{stats.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">
                {t('approved')}
                <Badge variant="secondary" className="ml-1.5 h-5 px-1 bg-green-100 text-green-700">{stats.approved}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs">
                {t('rejected')}
                <Badge variant="secondary" className="ml-1.5 h-5 px-1 bg-red-100 text-red-700">{stats.rejected}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {paginatedMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {t('noMessagesFound')}
              </div>
            ) : (
              paginatedMessages.map(msg => (
                <div 
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors border",
                    selectedId === msg.id || (!selectedId && msg === selectedMessage)
                      ? "bg-white border-primary shadow-sm dark:bg-slate-800"
                      : "bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50 hover:border-slate-200"
                  )}
                  onClick={() => setSelectedId(msg.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded",
                      msg.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                      msg.status === 'approved' ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {msg.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2 text-slate-700 dark:text-slate-300">
                    {msg.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Pagination Controls */}
        {filteredMessages.length > 0 && (
          <div className="p-3 border-t bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[70px] h-7 text-xs">
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
                  total: filteredMessages.length 
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-muted-foreground">
                {t('page')} {currentPage} {t('pageOf', { total: totalPages || 1 })}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Area: Detail & Audit */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-black/20">
        {selectedMessage ? (
          <div className="flex-1 p-6 md:p-8 flex flex-col max-w-3xl mx-auto w-full">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Inbox size={18} />
                {t('messageReview')}
              </h2>
              {/* Audit Controls */}
              {selectedMessage.status === 'pending' && (
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground self-center mr-2">{t('shortcut')}: A / R</span>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={() => onApprove(selectedMessage.id)}
                  >
                    <CheckCircle2 size={18} /> {t('approve')}
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="gap-2"
                    onClick={() => onReject(selectedMessage.id)}
                  >
                    <XCircle size={18} /> {t('reject')}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1">
              <MessageCard 
                message={selectedMessage} 
                selected={true}
                onApprove={onApprove}
                onReject={onReject}
                onReply={onReply}
              />
            </div>

            {/* Context Info */}
            <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-lg border text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="block text-xs uppercase tracking-wider opacity-70">{t('ipAddress')}</span>
                <span className="font-mono">{selectedMessage.ipAddress || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider opacity-70">{t('fingerprint')}</span>
                <span className="font-mono truncate" title="Hash">a1b2c3d4...</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider opacity-70">{t('history')}</span>
                <span>{t('historyStats', { approved: 3, rejected: 0 })}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider opacity-70">{t('riskScore')}</span>
                <span className="text-green-600 font-medium">{t('lowRisk', { percent: 5 })}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Archive size={32} className="opacity-50" />
            </div>
            <p>{t('selectMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
