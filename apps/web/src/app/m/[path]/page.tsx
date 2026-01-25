// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Send } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { MessageFeedWrapper } from '@/components/marshmallow/public/MessageFeedWrapper';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Config type matching backend API response
interface MarshmallowConfig {
  talent: {
    displayName: string;
    avatarUrl: string | null;
  };
  title: string | null;
  welcomeText: string | null;
  placeholderText: string | null;
  allowAnonymous: boolean;
  maxMessageLength: number;
  minMessageLength: number;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  theme: Record<string, unknown>;
}

// Message type matching backend API response
interface MarshmallowMessage {
  id: string;
  content: string;
  senderName: string | null;
  isAnonymous: boolean;
  replyContent: string | null;
  repliedAt: string | null;
  reactionCounts: Record<string, number>;
  userReactions: string[];
  createdAt: string;
  isRead?: boolean;
}

// Fetch config from API
const getConfig = async (path: string): Promise<MarshmallowConfig | null> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/marshmallow/${path}/config`, {
      next: { revalidate: 10 }  // Short cache for faster updates
    });
    
    if (!res.ok) return null;
    const response = await res.json();
    return response.data || response;
  } catch (error) {
    console.error('Error fetching marshmallow config:', error);
    return null;
  }
};

// Fetch messages from API
// Note: Using short revalidate time and cache-busting to ensure fresh isRead status
const getMessages = async (path: string): Promise<{ messages: MarshmallowMessage[]; hasMore: boolean }> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  try {
    // Add timestamp for cache-busting to get fresh isRead status on every request
    const res = await fetch(`${apiUrl}/api/v1/public/marshmallow/${path}/messages?limit=200&_t=${Date.now()}`, {
      next: { revalidate: 0 }, // Disable SSR caching for messages to ensure fresh isRead status
      cache: 'no-store', // Also disable fetch caching
    });
    
    if (!res.ok) return { messages: [], hasMore: false };
    const response = await res.json();
    const data = response.data || response;
    return {
      messages: data.messages || [],
      hasMore: data.hasMore || false,
    };
  } catch (error) {
    console.error('Error fetching marshmallow messages:', error);
    return { messages: [], hasMore: false };
  }
};

export default async function MarshmallowFeedPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const t = await getTranslations('publicMarshmallow');
  
  const config = await getConfig(path);
  
  if (!config) {
    notFound();
  }

  const { messages } = await getMessages(path);
  
  // Get initials for avatar fallback
  const initials = config.talent.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-4 pt-12 pb-8 flex-1">
      {/* Profile Header */}
      <div className="text-center mb-10">
        <div className="inline-block relative mb-4">
          <Avatar className="w-24 h-24 border-4 border-white shadow-lg mx-auto">
            <AvatarImage src={config.talent.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.talent.displayName}`} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-400 border-2 border-white rounded-full" title={t('online')} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {config.title || `${config.talent.displayName}'s Marshmallow`}
        </h1>
        {config.welcomeText && (
          <p className="text-slate-600 max-w-md mx-auto whitespace-pre-wrap">
            {config.welcomeText}
          </p>
        )}
      </div>

      {/* Action Area */}
      <div className="mb-10 flex justify-center">
        <Button 
          size="lg" 
          className="rounded-full px-8 h-12 text-base font-semibold shadow-xl shadow-pink-200 hover:shadow-pink-300 hover:translate-y-[-1px] transition-all bg-[var(--mm-primary)] hover:bg-[var(--mm-primary)]/90 text-white"
          asChild
        >
          <Link href={`/m/${path}/ask`}>
            <Send className="mr-2 h-5 w-5" />
            {t('sendMarshmallow')}
          </Link>
        </Button>
      </div>

      {/* Message Feed with Filters - Wrapped in Suspense for useSearchParams */}
      <Suspense fallback={
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      }>
        <MessageFeedWrapper
          path={path}
          initialMessages={messages}
          reactionsEnabled={config.reactionsEnabled}
          allowedReactions={config.allowedReactions}
        />
      </Suspense>
    </div>
  );
}
