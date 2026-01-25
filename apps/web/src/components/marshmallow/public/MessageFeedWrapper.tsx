// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useSearchParams } from 'next/navigation';

import { MessageFeed } from './MessageFeed';
import { StreamerModeProvider } from './StreamerModeContext';

// Message type
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

interface MessageFeedWrapperProps {
  path: string;
  initialMessages: MarshmallowMessage[];
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
