// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface ReactionBarProps {
  messageId: string;
  reactionCounts: Record<string, number>;
  userReactions: string[];
  allowedReactions: string[];
  fingerprint: string;
  onReactionChange?: (counts: Record<string, number>, userReactions: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ReactionBar({
  messageId,
  reactionCounts: initialCounts,
  userReactions: initialUserReactions,
  allowedReactions,
  fingerprint,
  onReactionChange,
  disabled = false,
  className,
}: ReactionBarProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [userReactions, setUserReactions] = useState(initialUserReactions);
  const [isReacting, setIsReacting] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);

  const handleReact = async (emoji: string) => {
    if (disabled || isReacting || !fingerprint) return;

    setIsReacting(true);
    setReactingEmoji(emoji);
    const wasReacted = userReactions.includes(emoji);

    // Optimistic update
    const newUserReactions = wasReacted
      ? userReactions.filter((e) => e !== emoji)
      : [...userReactions, emoji];
    const newCounts = {
      ...counts,
      [emoji]: wasReacted
        ? Math.max(0, (counts[emoji] || 0) - 1)
        : (counts[emoji] || 0) + 1,
    };

    setUserReactions(newUserReactions);
    setCounts(newCounts);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(
        `${apiUrl}/api/v1/public/marshmallow/messages/${messageId}/react`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction: emoji, fingerprint }),
        }
      );

      if (!res.ok) throw new Error('Failed to react');

      const response = await res.json();
      const data = response.data || response;

      // Update with server response
      setCounts(data.counts || newCounts);
      
      const finalUserReactions = data.added
        ? [...new Set([...userReactions, emoji])]
        : userReactions.filter((e) => e !== emoji);
      setUserReactions(finalUserReactions);

      onReactionChange?.(data.counts || newCounts, finalUserReactions);
    } catch (error) {
      // Revert on error
      setUserReactions(wasReacted ? [...userReactions, emoji] : userReactions.filter((e) => e !== emoji));
      setCounts(counts);
      console.error('Failed to toggle reaction:', error);
    } finally {
      setIsReacting(false);
      setReactingEmoji(null);
    }
  };

  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {allowedReactions.map((emoji) => {
        const count = counts[emoji] || 0;
        const isActive = userReactions.includes(emoji);
        const isCurrentlyReacting = reactingEmoji === emoji;

        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={disabled || isReacting}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
              isActive
                ? 'bg-pink-100 text-pink-600 ring-1 ring-pink-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              (disabled || isReacting) && 'opacity-50 cursor-not-allowed',
              isCurrentlyReacting && 'animate-pulse'
            )}
          >
            {isCurrentlyReacting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span>{emoji}</span>
            )}
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
