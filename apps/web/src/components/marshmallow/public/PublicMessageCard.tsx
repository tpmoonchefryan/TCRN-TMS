// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Check, MessageCircle, Plus, Share2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { memo, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getAvatarUrl } from '@/lib/utils/gravatar';

import { EmojiPicker } from './EmojiPicker';


// Message type matching backend API response (camelCase)
interface MarshmallowMessage {
  id: string;
  content: string;
  senderName: string | null;
  isAnonymous: boolean;
  replyContent: string | null;
  repliedAt: string | null;
  repliedBy?: { 
    id: string; 
    displayName: string;
    avatarUrl?: string | null;
    email?: string | null;
  } | null;
  reactionCounts: Record<string, number>;
  userReactions: string[];
  createdAt: string;
  imageUrl?: string | null;
  imageUrls?: string[];
}

interface PublicMessageCardProps {
  message: MarshmallowMessage;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  path: string;
  isStreamerMode?: boolean;
  isRead?: boolean;
  onReply?: (content: string) => void;
  onMarkRead?: () => void;
}

// Simple fingerprint generation for anonymous reactions
const getFingerprint = async (): Promise<string> => {
  // Use a simple hash of user agent + screen resolution + timezone
  const data = [
    navigator.userAgent,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export const PublicMessageCard = memo(function PublicMessageCard({ 
  message, 
  reactionsEnabled, 
  allowedReactions,
  path,
  isStreamerMode = false,
  isRead = false,
  onReply,
  onMarkRead,
}: PublicMessageCardProps) {
  const format = useFormatter();
  const t = useTranslations('publicMarshmallow');
  const [reactions, setReactions] = useState(message.reactionCounts || {});
  const [userReactions, setUserReactions] = useState<string[]>(message.userReactions || []);
  const [isReacting, setIsReacting] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Inline reply state (for streamer mode)
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    getFingerprint().then(setFingerprint);
  }, []);

  const handleReplySubmit = async () => {
    if (!onReply || !replyText.trim()) return;
    
    setIsSendingReply(true);
    try {
      await onReply(replyText.trim());
      setIsReplying(false);
      setReplyText('');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleReact = async (emoji: string) => {
    if (!reactionsEnabled || isReacting || !fingerprint) return;
    
    setIsReacting(true);
    const wasReacted = userReactions.includes(emoji);
    
    // Optimistic update
    if (wasReacted) {
      setUserReactions(prev => prev.filter(e => e !== emoji));
      setReactions(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
    } else {
      setUserReactions(prev => [...prev, emoji]);
      setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/v1/public/marshmallow/messages/${message.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction: emoji, fingerprint }),
      });

      if (!res.ok) throw new Error('Failed to react');
      
      const response = await res.json();
      const data = response.data || response;
      
      // Update with server response
      setReactions(data.counts || {});
      if (data.added) {
        setUserReactions(prev => prev.includes(emoji) ? prev : [...prev, emoji]);
      } else {
        setUserReactions(prev => prev.filter(e => e !== emoji));
      }
    } catch (error) {
      // Revert on error
      if (wasReacted) {
        setUserReactions(prev => [...prev, emoji]);
        setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
      } else {
        setUserReactions(prev => prev.filter(e => e !== emoji));
        setReactions(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
      }
      console.error('Failed to toggle reaction:', error);
    } finally {
      setIsReacting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/m/${path}#${message.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      // Fallback for older browsers
      toast.error('Failed to copy link');
    }
  };

  const senderDisplay = message.isAnonymous 
    ? t('anonymous') 
    : (message.senderName || t('someone'));

  return (
    <div className="rounded-2xl overflow-hidden mb-6 transition-all hover:translate-y-[-2px] bg-white border-slate-200 shadow-sm" id={message.id}>
      {/* Question */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <p className="text-lg font-medium text-slate-800 leading-relaxed whitespace-pre-wrap flex-1">
            {message.content}
          </p>
          {/* Mark as Read Button (for streamers only) */}
          {isStreamerMode && onMarkRead && (
            <Button
              variant={isRead ? "default" : "outline"}
              size="sm"
              onClick={onMarkRead}
              className={cn(
                "shrink-0 gap-1",
                isRead 
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "hover:bg-slate-100"
              )}
            >
              <Check size={14} />
              {isRead ? t('read') : t('markAsRead')}
            </Button>
          )}
        </div>
        <div className="mt-2 text-xs text-slate-400 font-medium">
          {senderDisplay} • {format.dateTime(new Date(message.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
        
        {/* Image Grid */}
        {(message.imageUrls?.length || message.imageUrl) && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(message.imageUrls && message.imageUrls.length > 0 ? message.imageUrls : [message.imageUrl]).filter(Boolean).map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group cursor-zoom-in shadow-sm">
                        <img 
                            src={img || ''} 
                            alt={`Attachment ${index}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(img || null);
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
      </div>

      {/* Answer/Reply - Parse multiple replies separated by --- */}
      {message.replyContent && (() => {
        // Split replies by separator and parse each one
        const replyParts = message.replyContent.split(/\n\n---\n\n/);
        
        // Get avatar URL for the first reply (from repliedBy data)
        const firstReplyAvatarUrl = message.repliedBy ? getAvatarUrl({
          avatarUrl: message.repliedBy.avatarUrl,
          email: message.repliedBy.email,
          size: 32,
        }) : null;
        
        return (
          <div className="bg-slate-50/50 border-t border-slate-100/50">
            {replyParts.map((part, index) => {
              // Try to parse author info from format: **name** (time):\ncontent
              const authorMatch = part.match(/^\*\*(.+?)\*\*\s*\((.+?)\):\n([\s\S]*)$/);
              
              let author = index === 0 ? message.repliedBy?.displayName : null;
              let time = index === 0 ? message.repliedAt : null;
              let content = part;
              let avatarUrl = index === 0 ? firstReplyAvatarUrl : null;
              
              if (authorMatch) {
                author = authorMatch[1];
                time = authorMatch[2];
                content = authorMatch[3];
                // For parsed replies, use the same avatar as first reply (same user typically)
                avatarUrl = firstReplyAvatarUrl;
              }
              
              // Get first letter of author name for fallback
              const authorInitial = author ? author.charAt(0).toUpperCase() : 'A';
              
              return (
                <div key={index} className={cn("p-6 pt-4", index > 0 && "border-t border-slate-100/50")}>
                  <div className="flex items-start gap-3">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={author || 'Reply author'} 
                        className="shrink-0 w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                        {authorInitial}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-700">{t('answer')}</span>
                        {author && (
                          <span className="text-xs text-slate-500">by {author}</span>
                        )}
                        {time && (
                          <span className="text-xs text-slate-400">
                            {typeof time === 'string' && time.includes('/') 
                              ? time 
                              : format.dateTime(new Date(time), { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Inline Reply Button (for streamer mode) */}
      {isStreamerMode && onReply && !isReplying && (
        <div className="px-6 py-3 border-t border-slate-100/50 bg-purple-50/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsReplying(true);
              setReplyText(''); // Always start fresh for appending
            }}
            className="gap-2 border-purple-200 text-purple-600 hover:bg-purple-100"
          >
            <MessageCircle size={14} />
            {message.replyContent ? t('continueReply') : t('reply')}
          </Button>
        </div>
      )}

      {/* Inline Reply Input (for streamer mode) */}
      {isStreamerMode && isReplying && (
        <div className="p-4 border-t border-purple-100 bg-purple-50/30 space-y-3">
          <Textarea
            placeholder={t('replyPlaceholder')}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="min-h-[80px] bg-white"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsReplying(false);
                setReplyText('');
              }}
              disabled={isSendingReply}
            >
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleReplySubmit}
              disabled={!replyText.trim() || isSendingReply}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {isSendingReply ? t('sending') : t('sendReply')}
            </Button>
          </div>
        </div>
      )}

      {/* Footer / Reactions */}
      <div className="px-6 py-3 border-t border-slate-100/50 flex items-center justify-between bg-white/50">
        {reactionsEnabled ? (
          <ReactionBar
            reactions={reactions}
            userReactions={userReactions}
            allowedReactions={allowedReactions}
            isReacting={isReacting}
            onReact={handleReact}
            t={t}
          />
        ) : (
          <div />
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-xs text-slate-400 hover:text-slate-600"
          onClick={handleShare}
        >
          <Share2 className="h-3 w-3 mr-1" />
          {t('share')}
        </Button>
      </div>
    </div>
  );
});

// Separated ReactionBar component for cleaner logic
function ReactionBar({
  reactions,
  userReactions,
  allowedReactions,
  isReacting,
  onReact,
  t,
}: {
  reactions: Record<string, number>;
  userReactions: string[];
  allowedReactions: string[];
  isReacting: boolean;
  onReact: (emoji: string) => void;
  t: (key: string) => string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  
  // Check if there are any reactions with count > 0
  const hasReactions = Object.values(reactions).some(count => count > 0);
  
  // Empty allowedReactions means all emojis are allowed - use full picker
  const useFullPicker = allowedReactions.length === 0;
  
  // Get active reactions from the current reaction counts (for when all allowed)
  const activeReactionsFromCounts = Object.entries(reactions)
    .filter(([, count]) => count > 0)
    .map(([emoji]) => emoji);
  
  // Reactions that have counts
  const activeReactions = useFullPicker 
    ? activeReactionsFromCounts 
    : allowedReactions.filter(emoji => (reactions[emoji] || 0) > 0);
  
  // Handle emoji selection from full picker
  const handleEmojiSelect = (emoji: string) => {
    onReact(emoji);
    setShowPicker(false);
  };
  
  // If no reactions, show just the "+" button
  if (!hasReactions) {
    if (useFullPicker) {
      // Use full emoji picker
      return (
        <EmojiPicker 
          onEmojiSelect={handleEmojiSelect} 
          disabled={isReacting}
        />
      );
    }
    
    // Use limited picker with allowed reactions
    return (
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "bg-slate-100 text-slate-500 hover:bg-slate-200",
              isReacting && "opacity-50 cursor-wait"
            )}
            disabled={isReacting}
          >
            <Plus size={14} />
            {t('addReaction')}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1 flex-wrap">
            {allowedReactions.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setShowPicker(false);
                }}
                disabled={isReacting}
                className="text-xl p-2 hover:bg-slate-100 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
  // If has reactions, show active ones with counts and a "+" button at the end
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {activeReactions.map(emoji => {
        const count = reactions[emoji] || 0;
        const isActive = userReactions.includes(emoji);
        
        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            disabled={isReacting}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
              isActive 
                ? "bg-pink-100 text-pink-600 ring-1 ring-pink-200" 
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              isReacting && "opacity-50 cursor-wait"
            )}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </button>
        );
      })}
      
      {/* Add more reactions button */}
      {useFullPicker ? (
        // Use full emoji picker
        <EmojiPicker 
          onEmojiSelect={handleEmojiSelect} 
          disabled={isReacting}
        />
      ) : (
        // Use limited picker with allowed reactions
        <Popover open={showPicker} onOpenChange={setShowPicker}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full transition-all",
                "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600",
                isReacting && "opacity-50 cursor-wait"
              )}
              disabled={isReacting}
            >
              <Plus size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top" align="start">
            <div className="flex gap-1 flex-wrap">
              {allowedReactions.map(emoji => {
                const isActive = userReactions.includes(emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setShowPicker(false);
                    }}
                    disabled={isReacting}
                    className={cn(
                      "text-xl p-2 rounded transition-colors",
                      isActive ? "bg-pink-100" : "hover:bg-slate-100"
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
