/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { formatDistanceToNow } from 'date-fns';
import {
    Check,
    Clock,
    ExternalLink,
    MessageCircle,
    MoreHorizontal,
    Reply,
    RotateCcw,
    ShieldAlert,
    Star,
    X
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Message interface matching backend API response (camelCase)
export interface MarshmallowMessage {
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
  createdAt: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  socialLink?: string | null;
  ipAddress?: string; // Admin only
}

interface MessageCardProps {
  message: MarshmallowMessage;
  selected?: boolean;
  onSelect?: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onUnreject?: (id: string) => void;
  onReply: (id: string, content: string) => void;
  onToggleStar?: (id: string, isStarred: boolean) => void;
}

export const MessageCard = memo(function MessageCard({ 
  message, 
  selected, 
  onSelect,
  onApprove,
  onReject,
  onUnreject,
  onReply,
  onToggleStar,
}: MessageCardProps) {
  const t = useTranslations('marshmallowAdmin');
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleReplySubmit = () => {
    onReply(message.id, replyText);
    setIsReplying(false);
    setReplyText('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{t('approved')}</Badge>;
      case 'rejected': return <Badge variant="destructive">{t('rejected')}</Badge>;
      case 'spam': return <Badge variant="destructive" className="bg-red-900">{t('spam')}</Badge>;
      default: return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{t('pending')}</Badge>;
    }
  };

  // Check if message was auto-rejected (has profanity flags with rejected status)
  const hasProfanityFlags = message.profanityFlags && message.profanityFlags.length > 0;
  const isAutoRejected = message.status === 'rejected' && hasProfanityFlags;

  // Get translated rejection reason
  const getRejectionReasonLabel = (reason: string | null) => {
    if (!reason) return null;
    const reasonKey = `rejectionReason.${reason}` as any;
    // Try to get translated key, fallback to raw reason
    try {
      return t(reasonKey);
    } catch {
      return reason;
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 border-l-4",
        selected ? "border-primary shadow-md ring-1 ring-primary/20" : "border-transparent hover:border-slate-200",
        message.status === 'pending' && !selected ? "border-l-yellow-400" : "",
        message.status === 'spam' && !selected ? "border-l-red-500 bg-red-50/10" : "",
        !message.isRead && "bg-blue-50/30 dark:bg-blue-900/10"
      )}
      onClick={onSelect}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(message.status)}
            {isAutoRejected && (
              <Badge variant="outline" className="text-xs border-red-300 text-red-600 bg-red-50">
                {t('autoRejected')}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={12} />
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {hasProfanityFlags && (
              <span className="flex items-center gap-1 text-xs text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded">
                <ShieldAlert size={12} />
                {t('flagged')}
              </span>
            )}
      {!message.isRead && (
              <Badge variant="outline" className="text-xs">{t('unread')}</Badge>
            )}
            {message.socialLink && (
              <a 
                href={message.socialLink} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <ExternalLink size={12} />
                Bilibili
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar?.(message.id, message.isStarred);
              }}
            >
              <Star 
                size={16} 
                className={message.isStarred ? "text-yellow-400 fill-yellow-400" : "text-gray-400"} 
              />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onToggleStar?.(message.id, message.isStarred)}>
                  {message.isStarred ? t('unstarMessage') : t('starMessage')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onReject(message.id, 'manual')}
                >
                  {t('reject')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className={cn(
            "text-sm md:text-base whitespace-pre-wrap leading-relaxed",
            hasProfanityFlags && "text-red-700 dark:text-red-400"
          )}>
            {message.content}
          </p>

          {/* Image Grid */}
          {(message.imageUrls?.length || message.imageUrl) && (
             <div className="mt-3 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                 {(message.imageUrls && message.imageUrls.length > 0 ? message.imageUrls : [message.imageUrl]).filter(Boolean).map((img, index) => (
                     <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-slate-100 border border-slate-200 group cursor-zoom-in">
                         <img 
                            src={img!} 
                            alt={`Attachment ${index}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(img!);
                            }}
                         />
                     </div>
                 ))}
             </div>
          )}

          <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
              <DialogTitle className="sr-only">{t('imagePreview')}</DialogTitle>
              {previewImage && (
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              )}
            </DialogContent>
          </Dialog>
          
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {message.isAnonymous ? t('anonymous') : (message.senderName || t('unknown'))}
            </span>
            <span>•</span>
            <span className="font-mono opacity-50">{message.id.slice(0, 8)}</span>
            {hasProfanityFlags && (
              <>
                <span>•</span>
                <span className="text-red-500">{message.profanityFlags.join(', ')}</span>
              </>
            )}
          </div>
        </div>

        {/* Rejection Reason (for rejected messages) */}
        {message.status === 'rejected' && (message.rejectionReason || hasProfanityFlags) && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm border-l-2 border-red-400">
            <div className="flex items-center gap-2 mb-1 text-xs text-red-600 dark:text-red-400 font-medium">
              <ShieldAlert size={12} />
              {t('rejectionDetails')}
            </div>
            {message.rejectionReason && (
              <p className="text-red-700 dark:text-red-300">
                <span className="font-medium">{t('reason')}:</span> {getRejectionReasonLabel(message.rejectionReason)}
              </p>
            )}
            {hasProfanityFlags && (
              <div className="mt-1">
                <span className="font-medium text-red-700 dark:text-red-300">{t('detectedIssues')}:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {message.profanityFlags.map((flag, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-red-300 text-red-600">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reply Preview (if exists) */}
        {message.replyContent && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm border-l-2 border-primary">
            <div className="flex items-center gap-2 mb-1 text-xs text-primary font-medium">
              <Reply size={12} />
              {t('replied')}
              {message.repliedBy && (
                <span className="text-muted-foreground">by {message.repliedBy.username}</span>
              )}
            </div>
            <p className="whitespace-pre-wrap">{message.replyContent}</p>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {message.status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white gap-1"
                  onClick={(e) => { e.stopPropagation(); onApprove(message.id); }}
                >
                  <Check size={16} /> {t('approve')}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="gap-1"
                  onClick={(e) => { e.stopPropagation(); onReject(message.id, 'manual'); }}
                >
                  <X size={16} /> {t('reject')}
                </Button>
              </>
            )}
            
            {message.status === 'rejected' && onUnreject && (
              <Button 
                size="sm" 
                variant="outline"
                className="gap-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                onClick={(e) => { e.stopPropagation(); onUnreject(message.id); }}
              >
                <RotateCcw size={16} /> {t('unreject')}
              </Button>
            )}
            
            {message.status === 'approved' && !message.replyContent && !isReplying && (
              <Button 
                size="sm" 
                variant="outline"
                className="gap-1"
                onClick={(e) => { e.stopPropagation(); setIsReplying(true); }}
              >
                <MessageCircle size={16} /> {t('reply')}
              </Button>
            )}
          </div>
        </div>

        {/* Inline Reply Editor */}
        {isReplying && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
            <Textarea 
              placeholder={t('replyPlaceholder')} 
              className="min-h-[100px] mb-2"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>{t('cancel')}</Button>
              <Button size="sm" onClick={handleReplySubmit} disabled={!replyText.trim()}>{t('sendReply')}</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});
