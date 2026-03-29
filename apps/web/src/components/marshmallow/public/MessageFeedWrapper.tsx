// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useSearchParams } from 'next/navigation';

import type { PublicMarshmallowMessageRecord } from '@/lib/api/modules/content';

import { MessageFeed } from './MessageFeed';
import { StreamerModeProvider } from './StreamerModeContext';

interface MessageFeedWrapperProps {
  path: string;
  initialMessages: PublicMarshmallowMessageRecord[];
  reactionsEnabled: boolean;
  allowedReactions: string[];
}

export function MessageFeedWrapper({
  path,
  initialMessages,
  reactionsEnabled,
  allowedReactions,
}: MessageFeedWrapperProps) {
  const searchParams = useSearchParams();
  const ssoToken = searchParams.get('sso');

  return (
    <StreamerModeProvider ssoToken={ssoToken}>
      <MessageFeed
        path={path}
        initialMessages={initialMessages}
        reactionsEnabled={reactionsEnabled}
        allowedReactions={allowedReactions}
      />
    </StreamerModeProvider>
  );
}
