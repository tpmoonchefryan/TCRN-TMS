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
import { fetchPublicMarshmallowConfig, fetchPublicMarshmallowMessages } from '@/lib/api/modules/public-marshmallow-fetch';

export default async function MarshmallowFeedPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const t = await getTranslations('publicMarshmallow');
  
  const config = await fetchPublicMarshmallowConfig(path, { revalidate: 10 });
  
  if (!config) {
    notFound();
  }

  const messagesResponse = await fetchPublicMarshmallowMessages(
    path,
    { limit: 200, bustCache: true },
    { revalidate: 0, cache: 'no-store' },
  );
  const messages = messagesResponse?.messages ?? [];
  
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
