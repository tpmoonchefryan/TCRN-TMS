// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Send } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { MessageFeedWrapper } from '@/components/marshmallow/public/MessageFeedWrapper';
import {
  fetchPublicMarshmallowConfig,
  fetchPublicMarshmallowMessages,
} from '@/lib/api/modules/public-marshmallow-fetch';
import { Avatar, AvatarFallback, AvatarImage, Button, Skeleton } from '@/platform/ui';

export async function PublicMarshmallowFeedScreen({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const t = await getTranslations('publicMarshmallow');

  const config = await fetchPublicMarshmallowConfig(path, { revalidate: 10 });

  if (!config) {
    notFound();
  }

  const messagesResponse = await fetchPublicMarshmallowMessages(
    path,
    { limit: 200, bustCache: true },
    { revalidate: 0, cache: 'no-store' }
  );
  const messages = messagesResponse?.messages ?? [];

  // Get initials for avatar fallback
  const initials = config.talent.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex-1 px-4 pb-8 pt-12">
      {/* Profile Header */}
      <div className="mb-10 text-center">
        <div className="relative mb-4 inline-block">
          <Avatar className="mx-auto h-24 w-24 border-4 border-white shadow-lg">
            <AvatarImage
              src={
                config.talent.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.talent.displayName}`
              }
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div
            className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-white bg-green-400"
            title={t('online')}
          />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          {config.title || t('feedTitle', { name: config.talent.displayName })}
        </h1>
        {config.welcomeText && (
          <p className="mx-auto max-w-md whitespace-pre-wrap text-slate-600">
            {config.welcomeText}
          </p>
        )}
      </div>

      {/* Action Area */}
      <div className="mb-10 flex justify-center">
        <Button
          size="lg"
          className="hover:bg-[var(--mm-primary)]/90 h-12 rounded-full bg-[var(--mm-primary)] px-8 text-base font-semibold text-white shadow-xl shadow-pink-200 transition-all hover:translate-y-[-1px] hover:shadow-pink-300"
          asChild
        >
          <Link href={`/m/${path}/ask`}>
            <Send className="mr-2 h-5 w-5" />
            {t('sendMarshmallow')}
          </Link>
        </Button>
      </div>

      {/* Message Feed with Filters - Wrapped in Suspense for useSearchParams */}
      <Suspense
        fallback={
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white p-6 shadow-sm">
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        }
      >
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
