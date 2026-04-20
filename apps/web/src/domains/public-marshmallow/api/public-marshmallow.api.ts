import { readApiData, withBrowserPublicConsumerHeaders } from '@/platform/http/api';

export type PublicCaptchaMode = 'always' | 'never' | 'auto';

export interface PublicMarshmallowConfigResponse {
  talent: {
    displayName: string;
    avatarUrl: string | null;
  };
  title: string | null;
  welcomeText: string | null;
  placeholderText: string | null;
  allowAnonymous: boolean;
  captchaMode: PublicCaptchaMode;
  maxMessageLength: number;
  minMessageLength: number;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  theme: Record<string, unknown>;
  terms: {
    en: string | null;
    zh: string | null;
    ja: string | null;
  };
  privacy: {
    en: string | null;
    zh: string | null;
    ja: string | null;
  };
}

export interface PublicMarshmallowMessageRecord {
  id: string;
  content: string;
  senderName: string | null;
  isAnonymous: boolean;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
  replyContent: string | null;
  repliedAt: string | null;
  repliedBy: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    email: string | null;
  } | null;
  reactionCounts: Record<string, number>;
  userReactions: string[];
  createdAt: string;
  imageUrl: string | null;
  imageUrls: string[];
}

export interface PublicMarshmallowMessagesResponse {
  messages: PublicMarshmallowMessageRecord[];
  cursor: string | null;
  hasMore: boolean;
}

export interface SubmitPublicMarshmallowInput {
  content: string;
  senderName?: string;
  isAnonymous: boolean;
  fingerprint: string;
  honeypot?: string;
  socialLink?: string;
  selectedImageUrls?: string[];
  turnstileToken?: string;
}

export interface SubmitPublicMarshmallowResponse {
  id: string;
  status: string;
  message: string;
}

export interface ToggleReactionResponse {
  added: boolean;
  counts: Record<string, number>;
}

function buildPublicPath(path: string) {
  return encodeURIComponent(path.trim());
}

function splitSharedDomainPath(path: string) {
  const segments = path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length !== 2) {
    return null;
  }

  return {
    tenantCode: encodeURIComponent(segments[0]),
    talentCode: encodeURIComponent(segments[1]),
  };
}

function buildMarshmallowEndpoint(path: string, suffix: 'config' | 'messages' | 'submit') {
  const sharedDomainPath = splitSharedDomainPath(path);

  if (sharedDomainPath) {
    return `/api/v1/public/marshmallow/${sharedDomainPath.tenantCode}/${sharedDomainPath.talentCode}/${suffix}`;
  }

  return `/api/v1/public/marshmallow/${buildPublicPath(path)}/${suffix}`;
}

function buildQueryString(input: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function readPublicMarshmallowConfig(path: string) {
  const response = await fetch(buildMarshmallowEndpoint(path, 'config'), {
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders(),
  });

  return readApiData<PublicMarshmallowConfigResponse>(response);
}

export async function readPublicMarshmallowMessages(
  path: string,
  options: {
    fingerprint?: string;
    cursor?: string;
    limit?: number;
    cacheBust?: string;
  } = {},
) {
  const response = await fetch(
    `${buildMarshmallowEndpoint(path, 'messages')}${buildQueryString({
      fingerprint: options.fingerprint,
      cursor: options.cursor,
      limit: options.limit ?? 20,
      _t: options.cacheBust,
    })}`,
    {
      credentials: 'include',
      headers: withBrowserPublicConsumerHeaders(),
    },
  );

  return readApiData<PublicMarshmallowMessagesResponse>(response);
}

export async function submitPublicMarshmallowMessage(
  path: string,
  input: SubmitPublicMarshmallowInput,
) {
  const response = await fetch(buildMarshmallowEndpoint(path, 'submit'), {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(input),
  });

  return readApiData<SubmitPublicMarshmallowResponse>(response);
}

export async function togglePublicMarshmallowReaction(
  messageId: string,
  input: {
    reaction: string;
    fingerprint: string;
  },
) {
  const response = await fetch(`/api/v1/public/marshmallow/messages/${encodeURIComponent(messageId)}/react`, {
    method: 'POST',
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(input),
  });

  return readApiData<ToggleReactionResponse>(response);
}
