'use client';

import { type ThemeConfig } from '@tcrn/shared';

import { type PublicHomepageComponentRecord } from '@/domains/public-homepage/api/public-homepage.api';
import { PublicHomepageComponentCard } from '@/domains/public-homepage/components/PublicHomepageComponentCard';

import {
  type HomepagePuckComponentType,
  isHomepagePuckSupportedType,
} from './homepage-puck-mappers';

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function formatComponentTypeLabel(type: string) {
  return type.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function shouldRenderEmptyPreview(
  type: HomepagePuckComponentType,
  props: Record<string, unknown>,
) {
  switch (type) {
    case 'ProfileCard':
      return !asString(props.displayName).trim()
        && !asString(props.avatarUrl).trim()
        && !asString(props.bio).trim();
    case 'SocialLinks':
      return asRecordArray(props.platforms).filter((platform) => asString(platform.url).trim()).length === 0;
    case 'ImageGallery':
      return asRecordArray(props.images).filter((image) => asString(image.url).trim()).length === 0;
    case 'RichText':
      return !asString(props.contentHtml).trim();
    case 'LinkButton':
      return !asString(props.url).trim();
    case 'VideoEmbed':
      return !asString(props.videoUrl).trim();
    case 'MusicPlayer':
      return !asString(props.embedValue).trim();
    case 'Schedule':
      return !asString(props.title).trim()
        && asRecordArray(props.events).length === 0;
    case 'LiveStatus':
      return !asString(props.title).trim()
        && !asString(props.streamUrl).trim()
        && !asString(props.channelName).trim();
    case 'BilibiliDynamic':
      return !asString(props.uid).trim();
    default:
      return false;
  }
}

function getEmptyPreviewDescription(
  type: HomepagePuckComponentType,
  props: Record<string, unknown>,
  description?: string,
) {
  switch (type) {
    case 'ProfileCard':
      return 'Add a display name, avatar, or bio to preview this profile card.';
    case 'SocialLinks':
      return 'Add at least one social URL to preview this block.';
    case 'ImageGallery':
      return 'Add at least one image URL to preview this gallery.';
    case 'RichText':
      return 'Add rich text content to preview this block.';
    case 'LinkButton':
      return 'Add a button label and URL to preview this CTA.';
    case 'VideoEmbed':
      return 'Add a video URL to preview this embed.';
    case 'MusicPlayer':
      return 'Add a track ID or embed URL to preview this player.';
    case 'Schedule':
      return asString(props.title).trim()
        ? 'Add at least one schedule entry to preview this block.'
        : 'Add a title and schedule entries to preview this block.';
    case 'LiveStatus':
      return 'Add a live title, channel name, or stream URL to preview this block.';
    case 'BilibiliDynamic':
      return 'Add a Bilibili UID to preview this block.';
    default:
      return description || 'Add content to preview this block in the editor.';
  }
}

export function HomepagePuckBlockPreview({
  description,
  label,
  props,
  theme,
  type,
}: Readonly<{
  description?: string;
  label?: string;
  props: Record<string, unknown>;
  theme: ThemeConfig;
  type: HomepagePuckComponentType;
}>) {
  if (!isHomepagePuckSupportedType(type)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
        Unsupported homepage block
      </div>
    );
  }

  if (shouldRenderEmptyPreview(type, props)) {
    return (
      <div className="homepage-puck-block-preview">
        <div className="min-h-[160px] rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{label || formatComponentTypeLabel(type)}</p>
          <p className="mt-2 leading-6">
            {getEmptyPreviewDescription(type, props, description)}
          </p>
        </div>
      </div>
    );
  }

  const component: PublicHomepageComponentRecord = {
    id: typeof props.id === 'string' ? props.id : `puck-${type}`,
    type,
    props,
    order: 1,
    visible: props.visible !== false,
  };

  return (
    <div className="homepage-puck-block-preview">
      <PublicHomepageComponentCard component={component} theme={theme} />
    </div>
  );
}
