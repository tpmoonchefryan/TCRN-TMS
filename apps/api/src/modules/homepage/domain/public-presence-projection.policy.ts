// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) - PolyForm Noncommercial License

import { createHash } from 'node:crypto';

import {
  createPublicPresenceValidationArtifact,
  DEFAULT_THEME,
  type HomepageContent,
  normalizeTheme,
  PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION,
  PUBLIC_PRESENCE_REGISTRY_METADATA,
  PUBLIC_PRESENCE_SAFETY_POLICY,
  type PublicPresenceDocument,
  type PublicPresenceFallbackDecision,
  type PublicPresenceFallbackPolicy,
  type PublicPresencePhaseVisibility,
  type PublicPresenceProjectedAction,
  type PublicPresenceProjectedBilibiliDynamicSection,
  type PublicPresenceProjectedDividerSection,
  type PublicPresenceProjectedFallbackCardSection,
  type PublicPresenceProjectedHeroSection,
  type PublicPresenceProjectedImageGallerySection,
  type PublicPresenceProjectedLinkButtonSection,
  type PublicPresenceProjectedLiveStatusSection,
  type PublicPresenceProjectedMarshmallowSection,
  type PublicPresenceProjectedMedia,
  type PublicPresenceProjectedMusicPlayerSection,
  type PublicPresenceProjectedProfileCardSection,
  type PublicPresenceProjectedRichTextSection,
  type PublicPresenceProjectedScheduleEvent,
  type PublicPresenceProjectedScheduleSection,
  type PublicPresenceProjectedSection,
  type PublicPresenceProjectedSocialLinksSection,
  type PublicPresenceProjectedSpacerSection,
  type PublicPresenceProjectedVideoEmbedSection,
  type PublicPresenceProjection,
  type PublicPresenceProjectionEvent,
  type PublicPresenceRevealPhase,
  type PublicPresenceValidationSnapshot,
  type ThemeConfig,
} from '@tcrn/shared';

import type { PublicHomepageData } from './public-homepage-read.policy';
import { calculatePublicPresenceContentHash } from './public-presence-foundation.policy';

export interface BuildPublicHomepageProjectionRouteInput {
  canonicalPath: string;
  legacyPath?: string | null;
  tenantCode?: string | null;
  talentCode?: string | null;
  domainHostname?: string | null;
}

export interface BuildPublicPresenceProjectionFromDocumentInput {
  contentHash?: string | null;
  createdAt: string;
  document: PublicPresenceDocument;
  documentVersionId?: string | null;
  mode?: 'preview' | 'projection';
  portalId?: string | null;
  rebuiltAt?: string | null;
  revealPhaseOverride?: PublicPresencePhaseVisibility | 'current' | null;
  route: BuildPublicHomepageProjectionRouteInput;
  source?: 'legacyHomepageCompatibility' | 'publicPresenceDocument';
  talentDisplayName?: string | null;
  theme?: ThemeConfig | Record<string, unknown> | null;
  validationSnapshotId?: string | null;
}

interface ProjectionRuntimeState {
  actionCounter: number;
  actions: PublicPresenceProjectedAction[];
  fallbackDecisions: PublicPresenceFallbackDecision[];
  media: PublicPresenceProjectedMedia[];
  mediaCounter: number;
}

interface SanitizedUrlResult {
  reason: string | null;
  value: string | null;
}

type ProjectionValidationMode = 'preview' | 'projection';

interface PublicPresenceProjectionDraftContext {
  contentHash: string;
  document: PublicPresenceDocument;
  mode: ProjectionValidationMode;
  resolvedRevealPhase: PublicPresencePhaseVisibility;
  route: BuildPublicHomepageProjectionRouteInput;
  runtime: ProjectionRuntimeState;
  snapshot: PublicPresenceValidationSnapshot;
  talentDisplayName: string | null;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

const TRACKING_QUERY_PARAM_PATTERN = /^(utm_|fbclid$|gclid$|igshid$|mc_[ce]id$)/i;
const ENCODED_PROTOCOL_RELATIVE_PATTERN = /%2f|%5c/i;
const INTERNAL_ORDINARY_LABEL_PATTERN = /\b(?:[A-Z0-9]+(?:_[A-Z0-9]+)+|[a-z0-9]+(?:_[a-z0-9]+)+)\b/;

const DEFAULT_DEBUT_PREVIEW_TITLE = 'Debut preview';
const DEFAULT_DEBUT_REVEAL_TITLE = 'Debut reveal';
const DEFAULT_PUBLIC_PRESENCE_TITLE = 'Public Presence';
const DEFAULT_ACTIVE_HUB_DESCRIPTION = 'Official streams, updates, and fan links in one place.';
const DEFAULT_DEBUT_DESCRIPTION = 'Countdown updates, reveal moments, and launch links for fans.';
const DEFAULT_PUBLIC_HOMEPAGE_DESCRIPTION = 'Public talent homepage';

const REVEAL_PHASE_SEQUENCE: PublicPresenceRevealPhase[] = [
  'teaser',
  'countdown',
  'preRevealHold',
  'revealed',
  'liveLaunch',
  'postLaunch',
  'expiredFallback',
];

const PRE_REVEAL_PHASES = new Set<PublicPresencePhaseVisibility>([
  'teaser',
  'countdown',
  'preRevealHold',
]);

const POST_REVEAL_PHASES = new Set<PublicPresencePhaseVisibility>([
  'revealed',
  'liveLaunch',
  'postLaunch',
  'expiredFallback',
]);

type CompatibilityComponent = {
  id: string;
  order: number;
  props: Record<string, unknown>;
  type: string;
  visible: boolean;
};

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = canonicalizeValue(
          (value as Record<string, unknown>)[key],
        );
        return accumulator;
      }, {});
  }

  return value;
}

function stableHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalizeValue(value)))
    .digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asFieldString(
  section: PublicPresenceDocument['sections'][number] | undefined,
  fieldKey: string,
): string | null {
  const value = section?.fields?.[fieldKey];
  return value && typeof value === 'object' && 'value' in value
    ? asString((value as { value: unknown }).value)
    : null;
}

function sanitizeOrdinaryLabel(value: unknown): string | null {
  const label = asString(value);

  if (!label) {
    return null;
  }

  return INTERNAL_ORDINARY_LABEL_PATTERN.test(label) ? null : label;
}

function resolveSafeOrdinaryLabel(
  candidates: readonly unknown[],
  fallback: string,
): string {
  for (const candidate of candidates) {
    const safeLabel = sanitizeOrdinaryLabel(candidate);

    if (safeLabel) {
      return safeLabel;
    }
  }

  return fallback;
}

function sanitizeOrdinaryTimezone(value: unknown): string | null {
  const timezone = asString(value);

  if (!timezone) {
    return null;
  }

  return timezone.toUpperCase() === 'UTC' ? null : timezone;
}

function getDefaultHeroDescription(templateId: PublicPresenceDocument['templateId']) {
  return templateId === 'debutReveal'
    ? DEFAULT_DEBUT_DESCRIPTION
    : DEFAULT_ACTIVE_HUB_DESCRIPTION;
}

function asFieldArray<T>(
  section: PublicPresenceDocument['sections'][number] | undefined,
  fieldKey: string,
): T[] {
  const value = section?.fields?.[fieldKey];
  if (!value || typeof value !== 'object' || !('value' in value)) {
    return [];
  }

  return Array.isArray((value as { value: unknown }).value)
    ? ((value as { value: T[] }).value ?? [])
    : [];
}

function resolveRevealPhaseOrder(phase: PublicPresencePhaseVisibility): number {
  if (phase === 'always') {
    return -1;
  }

  return REVEAL_PHASE_SEQUENCE.indexOf(phase as PublicPresenceRevealPhase);
}

function isSectionVisibleForPhase(
  requiredPhase: PublicPresencePhaseVisibility | undefined,
  resolvedPhase: PublicPresencePhaseVisibility,
): boolean {
  const phase = requiredPhase ?? 'always';

  if (phase === 'always' || resolvedPhase === 'always') {
    return true;
  }

  const requiredOrder = resolveRevealPhaseOrder(phase);
  const resolvedOrder = resolveRevealPhaseOrder(resolvedPhase);

  if (requiredOrder === -1 || resolvedOrder === -1) {
    return true;
  }

  if (PRE_REVEAL_PHASES.has(phase)) {
    return PRE_REVEAL_PHASES.has(resolvedPhase) && resolvedOrder >= requiredOrder;
  }

  return POST_REVEAL_PHASES.has(resolvedPhase) && resolvedOrder >= requiredOrder;
}

function isPreRevealPhase(phase: PublicPresencePhaseVisibility) {
  return PRE_REVEAL_PHASES.has(phase);
}

function pushFallbackDecision(
  runtime: ProjectionRuntimeState,
  path: string[],
  policy: PublicPresenceFallbackPolicy,
  reason: string,
) {
  runtime.fallbackDecisions.push({
    path,
    policy,
    reason,
  });
}

function isPrivateHost(hostname: string) {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function stripTrackingParams(url: URL) {
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_QUERY_PARAM_PATTERN.test(key)) {
      url.searchParams.delete(key);
    }
  }
}

function hasUnsafeInternalPathShape(value: string) {
  return (
    value.startsWith('//')
    || value.startsWith('/\\')
    || value.startsWith('/%2f')
    || value.startsWith('/%2F')
    || value.startsWith('/%5c')
    || value.startsWith('/%5C')
  );
}

function hasEncodedProtocolRelativeBypass(value: string) {
  const lowered = value.toLowerCase();

  return (
    lowered.includes('%2f%2f')
    || lowered.includes('%2f%5c')
    || lowered.includes('%5c%2f')
    || lowered.includes('%5c%5c')
  );
}

function sanitizePublicUrl(
  value: string | null,
  category:
    | 'officialChannelUrl'
    | 'fanActionUrl'
    | 'goodsUrl'
    | 'supportUrl'
    | 'streamUrl'
    | 'launchUrl'
    | 'mediaAssetUrl'
    | 'embedUrl',
): SanitizedUrlResult {
  if (!value) {
    return { reason: null, value: null };
  }

  const policy = PUBLIC_PRESENCE_SAFETY_POLICY.urlPolicies[category];
  const trimmed = value.trim();

  if (policy.allowInternalPath && trimmed.startsWith('/')) {
    if (hasUnsafeInternalPathShape(trimmed)) {
      return { reason: 'unsafe-internal-path', value: null };
    }
    return { reason: null, value: trimmed };
  }

  if (
    trimmed.startsWith('//')
    || trimmed.startsWith('\\')
    || hasEncodedProtocolRelativeBypass(trimmed)
  ) {
    return { reason: 'blocked-protocol-relative', value: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { reason: 'invalid-url', value: null };
  }

  if (!policy.allowedProtocols.includes(parsed.protocol)) {
    return { reason: 'blocked-protocol', value: null };
  }

  if (parsed.username || parsed.password) {
    return { reason: 'credential-url', value: null };
  }

  if (policy.blockPrivateHosts && isPrivateHost(parsed.hostname.toLowerCase())) {
    return { reason: 'private-host', value: null };
  }

  if (
    policy.allowListedHosts
    && !policy.allowListedHosts.some(
      (allowedHost) =>
        parsed.hostname.toLowerCase() === allowedHost
        || parsed.hostname.toLowerCase().endsWith(`.${allowedHost}`),
    )
  ) {
    return { reason: 'unapproved-host', value: null };
  }

  stripTrackingParams(parsed);

  return { reason: null, value: parsed.toString() };
}

function sanitizeMediaUrl(
  value: string | null,
): SanitizedUrlResult {
  return sanitizePublicUrl(value, 'mediaAssetUrl');
}

function sanitizeEmbedUrl(
  value: string | null,
): SanitizedUrlResult {
  return sanitizePublicUrl(value, 'embedUrl');
}

function isSafeCssColor(value: string | null) {
  if (!value) {
    return false;
  }

  return /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z-]{1,32})$/.test(
    value.trim(),
  );
}

function isSafeGradient(value: string | null) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  return (
    trimmed.startsWith('linear-gradient(')
    && !/url\(|expression\(|javascript:/i.test(trimmed)
  );
}

function sanitizeTheme(rawTheme: unknown, runtime: ProjectionRuntimeState): ThemeConfig {
  const theme = normalizeTheme(rawTheme ?? DEFAULT_THEME);
  const safeTheme = {
    ...theme,
    colors: {
      primary: isSafeCssColor(theme.colors.primary)
        ? theme.colors.primary
        : DEFAULT_THEME.colors.primary,
      accent: isSafeCssColor(theme.colors.accent)
        ? theme.colors.accent
        : DEFAULT_THEME.colors.accent,
      background: isSafeCssColor(theme.colors.background)
        ? theme.colors.background
        : DEFAULT_THEME.colors.background,
      text: isSafeCssColor(theme.colors.text)
        ? theme.colors.text
        : DEFAULT_THEME.colors.text,
      textSecondary: isSafeCssColor(theme.colors.textSecondary)
        ? theme.colors.textSecondary
        : DEFAULT_THEME.colors.textSecondary,
    },
    background: { ...theme.background },
    card: {
      ...theme.card,
      background: isSafeCssColor(theme.card.background)
        ? theme.card.background
        : DEFAULT_THEME.card.background,
      border:
        typeof theme.card.border === 'string'
        && /^[\d.\spx]+(solid|dashed|dotted)\s+(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z-]{1,32})$/.test(
          theme.card.border.trim(),
        )
          ? theme.card.border
          : DEFAULT_THEME.card.border,
    },
  } satisfies ThemeConfig;

  if (theme.background.type === 'solid') {
    safeTheme.background = {
      type: 'solid',
      value: isSafeCssColor(theme.background.value)
        ? theme.background.value
        : DEFAULT_THEME.background.value,
      overlay: isSafeCssColor(theme.background.overlay ?? null)
        ? theme.background.overlay
        : DEFAULT_THEME.background.overlay,
      blur: theme.background.blur,
    };
    return safeTheme;
  }

  if (theme.background.type === 'gradient') {
    safeTheme.background = {
      type: 'gradient',
      value: isSafeGradient(theme.background.value)
        ? theme.background.value
        : DEFAULT_THEME.background.value,
      overlay: isSafeCssColor(theme.background.overlay ?? null)
        ? theme.background.overlay
        : DEFAULT_THEME.background.overlay,
      blur: theme.background.blur,
    };
    return safeTheme;
  }

  const safeImage = sanitizeMediaUrl(asString(theme.background.value));
  if (!safeImage.value) {
    pushFallbackDecision(
      runtime,
      ['appearance', 'theme', 'background', 'value'],
      'safePlaceholder',
      safeImage.reason ?? 'unsafe-background-image',
    );
    safeTheme.background = DEFAULT_THEME.background;
    return safeTheme;
  }

  safeTheme.background = {
    type: 'image',
    value: safeImage.value,
    overlay: isSafeCssColor(theme.background.overlay ?? null)
      ? theme.background.overlay
      : DEFAULT_THEME.background.overlay,
    blur: theme.background.blur,
  };

  return safeTheme;
}

function sanitizeRichTextHtml(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (
    /(?:href|src)\s*=\s*["']?\s*(?:\/\/|\/\\|https?:\/\/[^"'\s]*@|https?:\/\/[^"'\s]*(?:%2f%2f|%5c%5c))/i.test(
      value,
    )
  ) {
    return null;
  }

  let sanitized = value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(iframe|object|embed)[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(src|href)=(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');

  if (/(<script|<style|<iframe|javascript:|\son\w+=|\sstyle=)/i.test(sanitized)) {
    const plainText = sanitized.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    sanitized = plainText ? `<p>${plainText}</p>` : '';
  }

  return sanitized.trim().length > 0 ? sanitized : null;
}

function extractVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();

  if (hostname === 'youtu.be') {
    const videoId = url.pathname.replace(/^\/+/, '');
    return videoId || null;
  }

  if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v');
    }

    if (url.pathname.startsWith('/embed/')) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[1] ?? null;
    }
  }

  return null;
}

function buildYouTubeEmbed(url: string): { embedUrl: string; watchUrl: string } | null {
  try {
    const parsed = new URL(url);
    const videoId = extractVideoId(parsed);

    if (!videoId) {
      return null;
    }

    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    const start = parsed.searchParams.get('t') ?? parsed.searchParams.get('start');
    if (start) {
      embedUrl.searchParams.set('start', start);
    }

    return {
      embedUrl: embedUrl.toString(),
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return null;
  }
}

function buildCacheKeys(route: BuildPublicHomepageProjectionRouteInput) {
  const cacheKeys = ['public-homepage'];

  if (route.legacyPath) {
    cacheKeys.push(`public-homepage:path:${route.legacyPath.toLowerCase()}`);
  }

  if (route.tenantCode && route.talentCode) {
    cacheKeys.push(
      `public-homepage:codes:${route.tenantCode.toLowerCase()}:${route.talentCode.toLowerCase()}`,
    );
  }

  if (route.domainHostname) {
    cacheKeys.push(`public-homepage:domain:${route.domainHostname.toLowerCase()}`);
  }

  return cacheKeys;
}

function calculateProjectionHash(
  projection: Omit<PublicPresenceProjection, 'projectionHash'>,
) {
  return stableHash({
    actions: projection.actions,
    appearance: projection.appearance,
    cacheKeys: projection.route.cacheKeys,
    contentHash: projection.contentHash,
    fallbackDecisions: projection.fallbackDecisions,
    media: projection.media,
    metadata: projection.metadata,
    registryVersion: projection.registryVersion,
    resolvedRevealPhase: projection.resolvedRevealPhase,
    safetyPolicyVersion: projection.safetyPolicyVersion,
    sections: projection.sections,
  });
}

function getVisibleComponents(content: HomepageContent): CompatibilityComponent[] {
  return content.components
    .map((component, index) => {
      const record = asRecord(component);
      return {
        id: asString(record.id) ?? `component-${index + 1}`,
        order: asNumber(record.order, index),
        props: asRecord(record.props),
        type: asString(record.type) ?? 'Unknown',
        visible: record.visible !== false,
      };
    })
    .filter((component) => component.visible)
    .sort((left, right) => left.order - right.order);
}

function createAction(
  runtime: ProjectionRuntimeState,
  input: Omit<PublicPresenceProjectedAction, 'id'>,
): PublicPresenceProjectedAction {
  const action = {
    ...input,
    id: `action-${runtime.actionCounter + 1}`,
  };

  runtime.actionCounter += 1;
  runtime.actions.push(action);
  return action;
}

function createMedia(
  runtime: ProjectionRuntimeState,
  input: Omit<PublicPresenceProjectedMedia, 'id'>,
): PublicPresenceProjectedMedia {
  const media = {
    ...input,
    id: `media-${runtime.mediaCounter + 1}`,
  };

  runtime.mediaCounter += 1;
  runtime.media.push(media);
  return media;
}

function buildAvatarMedia(
  runtime: ProjectionRuntimeState,
  url: string | null,
  alt: string | null,
  path: string[],
): PublicPresenceProjectedMedia | null {
  const safeUrl = sanitizeMediaUrl(url);

  if (!safeUrl.value) {
    if (url) {
      pushFallbackDecision(
        runtime,
        path,
        'safePlaceholder',
        safeUrl.reason ?? 'unsafe-avatar',
      );
    }
    return null;
  }

  return createMedia(runtime, {
    kind: 'avatar',
    providerId: null,
    assetId: null,
    url: safeUrl.value,
    alt,
    phaseVisibility: 'always',
    fallbackBehavior: 'safePlaceholder',
  });
}

function buildHeroSection(
  data: PublicHomepageData,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedHeroSection {
  const avatar = buildAvatarMedia(
    runtime,
    data.talent.avatarUrl,
    data.talent.displayName
      ? `${data.talent.displayName} avatar`
      : 'Profile avatar',
    ['talent', 'avatarUrl'],
  );

  return {
    id: 'hero',
    kind: 'firstEncounter',
    sectionType: 'hero',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    title: data.talent.displayName || 'Public Homepage',
    description: data.seo.description ?? data.seo.title ?? null,
    timezone: data.talent.timezone ?? null,
    avatar,
    primaryAction: null,
  };
}

function buildProfileCardSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedProfileCardSection {
  return {
    id: component.id,
    kind: 'legacyCompatibility',
    sectionType: 'profileCard',
    visibility: 'visible',
    fallbackBehavior: 'lockedSourceOwned',
    validationIssueIds: [],
    displayName: asString(component.props.displayName),
    bio: asString(component.props.bio),
    avatar: buildAvatarMedia(
      runtime,
      asString(component.props.avatarUrl),
      asString(component.props.displayName)
        ? `${asString(component.props.displayName)} avatar`
        : 'Profile avatar',
      ['sections', component.id, 'avatarUrl'],
    ),
  };
}

function buildSocialLinksSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedSocialLinksSection | PublicPresenceProjectedFallbackCardSection {
  const platforms = Array.isArray(component.props.platforms)
    ? component.props.platforms
    : [];

  const links = platforms
    .map((entry, index) => {
      const item = asRecord(entry);
      const safeUrl = sanitizePublicUrl(
        asString(item.url),
        'officialChannelUrl',
      );

      if (!safeUrl.value) {
        if (item.url) {
          pushFallbackDecision(
            runtime,
            ['sections', component.id, 'platforms', String(index), 'url'],
            'safePlaceholder',
            safeUrl.reason ?? 'unsafe-official-channel',
          );
        }
        return null;
      }

      return createAction(runtime, {
        slot: 'officialChannel',
        label:
          asString(item.label)
          ?? asString(item.platformCode)
          ?? '__officialChannel__',
        href: safeUrl.value,
        providerId: asString(item.platformCode),
        category: 'officialChannelUrl',
        phaseVisibility: 'always',
        fallbackBehavior: 'safePlaceholder',
      });
    })
    .filter((entry): entry is PublicPresenceProjectedAction => Boolean(entry));

  if (links.length === 0) {
    return {
      id: component.id,
      kind: 'officialChannels',
      sectionType: 'fallbackCard',
      visibility: 'fallback',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: [],
      title: '',
      description: null,
    };
  }

  return {
    id: component.id,
    kind: 'officialChannels',
    sectionType: 'socialLinks',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    title: null,
    links,
    layout:
      asString(component.props.layout) === 'vertical'
      || asString(component.props.layout) === 'grid'
        ? (asString(component.props.layout) as 'vertical' | 'grid')
        : 'horizontal',
    style:
      asString(component.props.style) === 'icon'
      || asString(component.props.style) === 'button'
        ? (asString(component.props.style) as 'icon' | 'button')
        : 'pill',
  };
}

function buildImageGallerySection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedImageGallerySection | PublicPresenceProjectedFallbackCardSection {
  const images = Array.isArray(component.props.images) ? component.props.images : [];
  const projectedImages = images
    .map((entry, index) => {
      const item = asRecord(entry);
      const safeUrl = sanitizeMediaUrl(asString(item.url));

      if (!safeUrl.value) {
        if (item.url) {
          pushFallbackDecision(
            runtime,
            ['sections', component.id, 'images', String(index), 'url'],
            'safePlaceholder',
            safeUrl.reason ?? 'unsafe-gallery-image',
          );
        }
        return null;
      }

      return createMedia(runtime, {
        kind: 'galleryImage',
        providerId: null,
        assetId: null,
        url: safeUrl.value,
        alt: asString(item.alt) ?? asString(item.caption),
        phaseVisibility: 'always',
        fallbackBehavior: 'safePlaceholder',
      });
    })
    .filter((entry): entry is PublicPresenceProjectedMedia => Boolean(entry));

  if (projectedImages.length === 0) {
    return {
      id: component.id,
      kind: 'teaserRevealMedia',
      sectionType: 'fallbackCard',
      visibility: 'fallback',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: [],
      title: '__gallery__',
      description: null,
    };
  }

  return {
    id: component.id,
    kind: 'teaserRevealMedia',
    sectionType: 'imageGallery',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    title: null,
    images: projectedImages,
    columns: Math.max(1, Math.min(6, asNumber(component.props.columns, 3))),
    showCaptions: asBoolean(component.props.showCaptions, true),
  };
}

function buildVideoEmbedSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedVideoEmbedSection | PublicPresenceProjectedFallbackCardSection {
  const rawVideoUrl = asString(component.props.videoUrl);
  const safeUrl = sanitizeEmbedUrl(rawVideoUrl);

  if (!safeUrl.value) {
    const safeFallbackUrl = sanitizePublicUrl(rawVideoUrl, 'officialChannelUrl');

    if (safeFallbackUrl.value) {
      const fallbackAction = createAction(runtime, {
        slot: 'videoFallback',
        label: '__openVideo__',
        href: safeFallbackUrl.value,
        providerId: null,
        category: 'officialChannelUrl',
        phaseVisibility: 'always',
        fallbackBehavior: 'safePlaceholder',
      });

      pushFallbackDecision(
        runtime,
        ['sections', component.id, 'videoUrl'],
        'safePlaceholder',
        safeUrl.reason ?? 'provider-fallback',
      );

      return {
        id: component.id,
        kind: 'teaserRevealMedia',
        sectionType: 'videoEmbed',
        visibility: 'fallback',
        fallbackBehavior: 'safePlaceholder',
        validationIssueIds: [],
        title: asString(component.props.title) ?? 'Video',
        providerId: null,
        iframeSrc: null,
        aspectRatio:
          asString(component.props.aspectRatio) === '4:3'
          || asString(component.props.aspectRatio) === '1:1'
            ? (asString(component.props.aspectRatio) as '4:3' | '1:1')
            : '16:9',
        allow: null,
        referrerPolicy: null,
        sandbox: null,
        fallbackAction,
      };
    }

    if (component.props.videoUrl) {
      pushFallbackDecision(
        runtime,
        ['sections', component.id, 'videoUrl'],
        'safePlaceholder',
        safeUrl.reason ?? 'unsafe-embed-url',
      );
    }
    return {
      id: component.id,
      kind: 'teaserRevealMedia',
      sectionType: 'fallbackCard',
      visibility: 'fallback',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: [],
      title: asString(component.props.title) ?? '__video__',
      description: null,
    };
  }

  const youtube = buildYouTubeEmbed(safeUrl.value);
  if (!youtube) {
    const fallbackAction = createAction(runtime, {
      slot: 'videoFallback',
      label: '__openVideo__',
      href: safeUrl.value,
      providerId: null,
      category: 'embedUrl',
      phaseVisibility: 'always',
      fallbackBehavior: 'safePlaceholder',
    });

    pushFallbackDecision(
      runtime,
      ['sections', component.id, 'videoUrl'],
      'safePlaceholder',
      'provider-fallback',
    );

    return {
      id: component.id,
      kind: 'teaserRevealMedia',
      sectionType: 'videoEmbed',
      visibility: 'fallback',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: [],
      title: asString(component.props.title) ?? null,
      providerId: null,
      iframeSrc: null,
      aspectRatio:
        asString(component.props.aspectRatio) === '4:3'
        || asString(component.props.aspectRatio) === '1:1'
          ? (asString(component.props.aspectRatio) as '4:3' | '1:1')
          : '16:9',
      allow: null,
      referrerPolicy: null,
      sandbox: null,
      fallbackAction,
    };
  }

  const fallbackAction = createAction(runtime, {
    slot: 'videoFallback',
    label: '__openVideo__',
    href: youtube.watchUrl,
    providerId: 'youtube',
    category: 'embedUrl',
    phaseVisibility: 'always',
    fallbackBehavior: 'safePlaceholder',
  });

  return {
    id: component.id,
    kind: 'teaserRevealMedia',
    sectionType: 'videoEmbed',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    title: asString(component.props.title) ?? null,
    providerId: 'youtube',
    iframeSrc: youtube.embedUrl,
    aspectRatio:
      asString(component.props.aspectRatio) === '4:3'
      || asString(component.props.aspectRatio) === '1:1'
        ? (asString(component.props.aspectRatio) as '4:3' | '1:1')
        : '16:9',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    referrerPolicy: 'strict-origin-when-cross-origin',
    sandbox: 'allow-scripts allow-same-origin allow-presentation',
    fallbackAction,
  };
}

function buildRichTextSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedRichTextSection | PublicPresenceProjectedFallbackCardSection | null {
  const html = sanitizeRichTextHtml(asString(component.props.contentHtml));

  if (!html) {
    pushFallbackDecision(
      runtime,
      ['sections', component.id, 'contentHtml'],
      'stripField',
      'empty-or-unsafe-rich-text',
    );
    return null;
  }

  return {
    id: component.id,
    kind: 'legacyCompatibility',
    sectionType: 'richText',
    visibility: 'visible',
    fallbackBehavior: 'stripField',
    validationIssueIds: [],
    html,
    textAlign:
      asString(component.props.textAlign) === 'center'
      || asString(component.props.textAlign) === 'right'
        ? (asString(component.props.textAlign) as 'center' | 'right')
        : 'left',
  };
}

function buildLinkButtonSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedLinkButtonSection | PublicPresenceProjectedFallbackCardSection {
  const safeUrl = sanitizePublicUrl(asString(component.props.url), 'fanActionUrl');

  if (!safeUrl.value) {
    if (component.props.url) {
      pushFallbackDecision(
        runtime,
        ['sections', component.id, 'url'],
        'safePlaceholder',
        safeUrl.reason ?? 'unsafe-link-button',
      );
    }

    return {
      id: component.id,
      kind: 'legacyCompatibility',
      sectionType: 'fallbackCard',
      visibility: 'fallback',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: [],
      title: asString(component.props.label) ?? '__openLink__',
      description: null,
    };
  }

  return {
    id: component.id,
    kind: 'legacyCompatibility',
    sectionType: 'linkButton',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    action: createAction(runtime, {
      slot: 'compatibility',
      label: asString(component.props.label) ?? '__openLink__',
      href: safeUrl.value,
      providerId: null,
      category: 'fanActionUrl',
      phaseVisibility: 'always',
      fallbackBehavior: 'safePlaceholder',
    }),
  };
}

function buildMarshmallowSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedMarshmallowSection {
  pushFallbackDecision(
    runtime,
    ['sections', component.id],
    'safePlaceholder',
    'internal-route-only-marshmallow',
  );

  return {
    id: component.id,
    kind: 'fanInteraction',
    sectionType: 'marshmallow',
    visibility: 'fallback',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    title: null,
    description: null,
    action: null,
  };
}

function buildScheduleEvents(value: unknown): PublicPresenceProjectedScheduleEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const event = asRecord(entry);
      const day = asString(event.day);
      const time = asString(event.time);
      const title = asString(event.title);

      if (!day || !time || !title) {
        return null;
      }

      return {
        day,
        time,
        title,
      };
    })
    .filter(
      (entry): entry is PublicPresenceProjectedScheduleEvent => Boolean(entry),
    );
}

function buildScheduleSection(
  component: CompatibilityComponent,
): PublicPresenceProjectedScheduleSection {
  return {
    id: component.id,
    kind: 'stageSchedule',
    sectionType: 'schedule',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    title: asString(component.props.title),
    weekOf: asString(component.props.weekOf),
    events: buildScheduleEvents(component.props.events),
  };
}

function buildMusicPlayerSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedMusicPlayerSection {
  pushFallbackDecision(
    runtime,
    ['sections', component.id],
    'lockedSourceOwned',
    'music-player-deferred',
  );

  return {
    id: component.id,
    kind: 'legacyCompatibility',
    sectionType: 'musicPlayer',
    visibility: 'fallback',
    fallbackBehavior: 'lockedSourceOwned',
    validationIssueIds: [],
    title: asString(component.props.title),
    artist: asString(component.props.artist),
    description: null,
  };
}

function buildLiveStatusSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedLiveStatusSection {
  const safeUrl = sanitizePublicUrl(asString(component.props.streamUrl), 'streamUrl');
  const streamAction = safeUrl.value
    ? createAction(runtime, {
      slot: 'stream',
      label: '__openStream__',
      href: safeUrl.value,
      providerId: asString(component.props.platform),
      category: 'streamUrl',
      phaseVisibility: 'always',
      fallbackBehavior: 'safePlaceholder',
    })
    : null;

  if (!streamAction && component.props.streamUrl) {
    pushFallbackDecision(
      runtime,
      ['sections', component.id, 'streamUrl'],
      'safePlaceholder',
      safeUrl.reason ?? 'unsafe-stream-url',
    );
  }

  return {
    id: component.id,
    kind: 'currentLaunchAction',
    sectionType: 'liveStatus',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    platform: asString(component.props.platform),
    channelName: asString(component.props.channelName),
    title: asString(component.props.title),
    isLive: asBoolean(component.props.isLive),
    viewers: asString(component.props.viewers),
    streamAction,
  };
}

function buildDividerSection(
  component: CompatibilityComponent,
): PublicPresenceProjectedDividerSection {
  return {
    id: component.id,
    kind: 'legacyCompatibility',
    sectionType: 'divider',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    style:
      asString(component.props.style) === 'dashed'
      || asString(component.props.style) === 'dotted'
        ? (asString(component.props.style) as 'dashed' | 'dotted')
        : 'solid',
    spacing:
      asString(component.props.spacing) === 'small'
      || asString(component.props.spacing) === 'large'
        ? (asString(component.props.spacing) as 'small' | 'large')
        : 'medium',
  };
}

function buildSpacerSection(
  component: CompatibilityComponent,
): PublicPresenceProjectedSpacerSection {
  return {
    id: component.id,
    kind: 'legacyCompatibility',
    sectionType: 'spacer',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    height:
      asString(component.props.height) === 'small'
      || asString(component.props.height) === 'large'
      || asString(component.props.height) === 'xlarge'
        ? (asString(component.props.height) as 'small' | 'large' | 'xlarge')
        : 'medium',
  };
}

function buildBilibiliDynamicSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedBilibiliDynamicSection {
  const uid = asString(component.props.uid);
  const profileHref = uid ? `https://space.bilibili.com/${uid}/dynamic` : null;
  const safeUrl = sanitizePublicUrl(profileHref, 'officialChannelUrl');
  const profileAction = safeUrl.value
    ? createAction(runtime, {
      slot: 'bilibiliProfile',
      label: '__viewBilibiliDynamics__',
      href: safeUrl.value,
      providerId: 'bilibili',
      category: 'officialChannelUrl',
      phaseVisibility: 'always',
      fallbackBehavior: 'safePlaceholder',
    })
    : null;

  return {
    id: component.id,
    kind: 'officialUpdatesFeed',
    sectionType: 'bilibiliDynamic',
    visibility: 'fallback',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: [],
    title: asString(component.props.title) ?? null,
    description: null,
    profileAction,
  };
}

function buildFallbackSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedFallbackCardSection {
  pushFallbackDecision(
    runtime,
    ['sections', component.id],
    'lockedSourceOwned',
    `unsupported-component:${component.type}`,
  );

  return {
    id: component.id,
    kind: 'legacyCompatibility',
    sectionType: 'fallbackCard',
    visibility: 'fallback',
    fallbackBehavior: 'lockedSourceOwned',
    validationIssueIds: [],
    title: component.type,
    description: null,
  };
}

function buildComponentSection(
  component: CompatibilityComponent,
  runtime: ProjectionRuntimeState,
): PublicPresenceProjectedSection | null {
  switch (component.type) {
    case 'ProfileCard':
      return buildProfileCardSection(component, runtime);
    case 'SocialLinks':
      return buildSocialLinksSection(component, runtime);
    case 'ImageGallery':
      return buildImageGallerySection(component, runtime);
    case 'VideoEmbed':
      return buildVideoEmbedSection(component, runtime);
    case 'RichText':
      return buildRichTextSection(component, runtime);
    case 'LinkButton':
      return buildLinkButtonSection(component, runtime);
    case 'MarshmallowWidget':
      return buildMarshmallowSection(component, runtime);
    case 'Schedule':
      return buildScheduleSection(component);
    case 'MusicPlayer':
      return buildMusicPlayerSection(component, runtime);
    case 'LiveStatus':
      return buildLiveStatusSection(component, runtime);
    case 'Divider':
      return buildDividerSection(component);
    case 'Spacer':
      return buildSpacerSection(component);
    case 'BilibiliDynamic':
      return buildBilibiliDynamicSection(component, runtime);
    default:
      return buildFallbackSection(component, runtime);
  }
}

function assignHeroPrimaryAction(
  hero: PublicPresenceProjectedHeroSection,
  sections: PublicPresenceProjectedSection[],
) {
  for (const section of sections) {
    if (section.sectionType === 'liveStatus' && section.streamAction?.href) {
      hero.primaryAction = section.streamAction;
      return;
    }

    if (section.sectionType === 'linkButton' && section.action.href) {
      hero.primaryAction = section.action;
      return;
    }

    if (section.sectionType === 'socialLinks' && section.links[0]?.href) {
      hero.primaryAction = section.links[0];
      return;
    }

    if (section.sectionType === 'videoEmbed' && section.fallbackAction?.href) {
      hero.primaryAction = section.fallbackAction;
      return;
    }
  }
}

function buildMetadata(
  data: PublicHomepageData,
  route: BuildPublicHomepageProjectionRouteInput,
  runtime: ProjectionRuntimeState,
) {
  const safeOgImage = sanitizeMediaUrl(data.seo.ogImageUrl);

  if (!safeOgImage.value && data.seo.ogImageUrl) {
    pushFallbackDecision(
      runtime,
      ['metadata', 'ogImageUrl'],
      'safePlaceholder',
      safeOgImage.reason ?? 'unsafe-og-image',
    );
  }

  const title = data.seo.title?.trim() || data.talent.displayName || 'TCRN TMS';
  const description =
    data.seo.description?.trim()
    || (data.talent.displayName
      ? `${data.talent.displayName} public homepage`
      : 'Public talent homepage');
  const ogImage = safeOgImage.value
    ? createMedia(runtime, {
      kind: 'ogImage',
      providerId: null,
      assetId: null,
      url: safeOgImage.value,
      alt: data.talent.displayName
        ? `${data.talent.displayName} public homepage preview`
        : 'Public homepage preview',
      phaseVisibility: 'always',
      fallbackBehavior: 'safePlaceholder',
    })
    : null;

  return {
    title,
    description,
    canonicalPath: route.canonicalPath,
    ogImage,
    ogImageAlt: ogImage?.alt ?? null,
    locale: null,
  };
}

function collectValidationIssueIds(
  snapshot: PublicPresenceValidationSnapshot,
  input: {
    componentId?: string;
    sectionId?: string;
  },
): string[] {
  return snapshot.issues
    .filter((issue) => {
      if (input.componentId) {
        return issue.componentId === input.componentId;
      }

      return issue.sectionId === input.sectionId && !issue.componentId;
    })
    .map((issue) => issue.id);
}

function mergeFallbackDecisions(
  validationFallbacks: PublicPresenceFallbackDecision[],
  projectionFallbacks: PublicPresenceFallbackDecision[],
): PublicPresenceFallbackDecision[] {
  const merged = [...validationFallbacks, ...projectionFallbacks];
  const seen = new Set<string>();

  return merged.filter((decision) => {
    const key = JSON.stringify(decision);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function resolveDocumentTheme(
  document: PublicPresenceDocument,
  runtime: ProjectionRuntimeState,
  themeOverride?: ThemeConfig | Record<string, unknown> | null,
) {
  if (themeOverride) {
    return sanitizeTheme(themeOverride, runtime);
  }

  const accentTone = asString(document.personaKit?.accentTone);
  if (!accentTone || !isSafeCssColor(accentTone)) {
    return sanitizeTheme(DEFAULT_THEME, runtime);
  }

  return sanitizeTheme(
    {
      ...DEFAULT_THEME,
      colors: {
        ...DEFAULT_THEME.colors,
        accent: accentTone,
      },
    },
    runtime,
  );
}

function resolveDocumentRevealPhase(
  document: PublicPresenceDocument,
  revealPhaseOverride: PublicPresencePhaseVisibility | 'current' | null | undefined,
) {
  if (revealPhaseOverride && revealPhaseOverride !== 'current') {
    return revealPhaseOverride;
  }

  const countdownSection = document.sections.find(
    (section) => section.kind === 'countdownReveal',
  );

  if (!countdownSection) {
    return 'always' as PublicPresencePhaseVisibility;
  }

  const configuredPhase =
    (asFieldString(countdownSection, 'phase') as PublicPresencePhaseVisibility | null)
    ?? 'teaser';
  const revealAt = asFieldString(countdownSection, 'revealAtUtc');

  if (configuredPhase === 'preRevealHold' || !revealAt) {
    return configuredPhase;
  }

  const revealAtMillis = Date.parse(revealAt);
  if (Number.isNaN(revealAtMillis)) {
    return configuredPhase;
  }

  if (Date.now() < revealAtMillis) {
    return configuredPhase;
  }

  if (configuredPhase === 'teaser' || configuredPhase === 'countdown') {
    return 'revealed';
  }

  return configuredPhase;
}

function resolveHeroTitle(
  document: PublicPresenceDocument,
  resolvedRevealPhase: PublicPresencePhaseVisibility,
  talentDisplayName: string | null,
) {
  const firstEncounter = document.sections.find(
    (section) => section.kind === 'firstEncounter',
  );
  const countdownSection = document.sections.find(
    (section) => section.kind === 'countdownReveal',
  );
  const safeMetadataTitle = sanitizeOrdinaryLabel(document.metadata?.title);

  if (document.templateId === 'debutReveal' && countdownSection) {
    if (isPreRevealPhase(resolvedRevealPhase)) {
      return resolveSafeOrdinaryLabel(
        [
          asFieldString(countdownSection, 'teaserName'),
          asFieldString(firstEncounter, 'teaserName'),
          asFieldString(firstEncounter, 'displayName'),
          talentDisplayName,
          safeMetadataTitle,
        ],
        DEFAULT_DEBUT_PREVIEW_TITLE,
      );
    }

    return resolveSafeOrdinaryLabel(
      [
        asFieldString(countdownSection, 'revealName'),
        asFieldString(firstEncounter, 'revealName'),
        asFieldString(firstEncounter, 'displayName'),
        talentDisplayName,
        safeMetadataTitle,
      ],
      DEFAULT_DEBUT_REVEAL_TITLE,
    );
  }

  return resolveSafeOrdinaryLabel(
    [asFieldString(firstEncounter, 'displayName'), talentDisplayName, safeMetadataTitle],
    DEFAULT_PUBLIC_PRESENCE_TITLE,
  );
}

function buildDocumentHeroSection(
  context: PublicPresenceProjectionDraftContext,
): PublicPresenceProjectedHeroSection {
  const firstEncounter = context.document.sections.find(
    (section) => section.kind === 'firstEncounter',
  );
  const countdownSection = context.document.sections.find(
    (section) => section.kind === 'countdownReveal',
  );
  const title = resolveHeroTitle(
    context.document,
    context.resolvedRevealPhase,
    context.talentDisplayName,
  );
  const description = resolveSafeOrdinaryLabel(
    [
      asFieldString(firstEncounter, 'headline'),
      asFieldString(firstEncounter, 'intro'),
      asString(context.document.metadata?.description),
      asString(context.document.personaKit?.tagline),
    ],
    getDefaultHeroDescription(context.document.templateId),
  );
  const timezone = sanitizeOrdinaryTimezone(asFieldString(countdownSection, 'timezone'));
  const avatar = buildAvatarMedia(
    context.runtime,
    asFieldString(firstEncounter, 'avatarUrl') ?? asFieldString(firstEncounter, 'heroMediaUrl'),
    title ? `${title} avatar` : 'Profile avatar',
    ['sections', firstEncounter?.id ?? 'firstEncounter', 'fields', 'avatarUrl'],
  );

  return {
    id: firstEncounter?.id ?? 'hero',
    kind: 'firstEncounter',
    sectionType: 'hero',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: collectValidationIssueIds(context.snapshot, {
      sectionId: firstEncounter?.id,
    }),
    title,
    description,
    timezone,
    avatar,
    primaryAction: null,
  };
}

function buildDocumentPrimaryCtaSection(
  context: PublicPresenceProjectionDraftContext,
): PublicPresenceProjectedLinkButtonSection | PublicPresenceProjectedFallbackCardSection | null {
  const firstEncounter = context.document.sections.find(
    (section) => section.kind === 'firstEncounter',
  );
  const label = asFieldString(firstEncounter, 'primaryCtaLabel');
  const rawUrl = asFieldString(firstEncounter, 'primaryCtaUrl');

  if (!label && !rawUrl) {
    return null;
  }

  const safeUrl = sanitizePublicUrl(rawUrl, 'fanActionUrl');
  if (!safeUrl.value) {
    if (rawUrl) {
      pushFallbackDecision(
        context.runtime,
        ['sections', firstEncounter?.id ?? 'firstEncounter', 'fields', 'primaryCtaUrl'],
        'safePlaceholder',
        safeUrl.reason ?? 'unsafe-primary-cta',
      );
    }

    return {
      id: `${firstEncounter?.id ?? 'firstEncounter'}:primary-cta`,
      kind: 'firstEncounter',
      sectionType: 'fallbackCard',
      visibility: 'fallback',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: collectValidationIssueIds(context.snapshot, {
        sectionId: firstEncounter?.id,
      }),
      title: label ?? '__openLink__',
      description: null,
    };
  }

  return {
    id: `${firstEncounter?.id ?? 'firstEncounter'}:primary-cta`,
    kind: 'firstEncounter',
    sectionType: 'linkButton',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: collectValidationIssueIds(context.snapshot, {
      sectionId: firstEncounter?.id,
    }),
    action: createAction(context.runtime, {
      slot: 'currentAction',
      label: label ?? '__openLink__',
      href: safeUrl.value,
      providerId: null,
      category: 'fanActionUrl',
      phaseVisibility: 'always',
      fallbackBehavior: 'safePlaceholder',
    }),
  };
}

function buildCountdownRevealSummarySection(
  context: PublicPresenceProjectionDraftContext,
  section: PublicPresenceDocument['sections'][number],
): PublicPresenceProjectedFallbackCardSection {
  const revealAt = asFieldString(section, 'revealAtUtc');
  const timezone = asFieldString(section, 'timezone');
  const phaseLabel = context.resolvedRevealPhase === 'always'
    ? 'always'
    : context.resolvedRevealPhase;

  return {
    id: section.id,
    kind: 'countdownReveal',
    sectionType: 'fallbackCard',
    visibility: 'visible',
    fallbackBehavior: 'safePlaceholder',
    validationIssueIds: collectValidationIssueIds(context.snapshot, {
      sectionId: section.id,
    }),
    title:
      context.resolvedRevealPhase === 'revealed'
      || context.resolvedRevealPhase === 'liveLaunch'
      || context.resolvedRevealPhase === 'postLaunch'
      || context.resolvedRevealPhase === 'expiredFallback'
        ? '__revealLive__'
        : '__revealCountdown__',
    description: [phaseLabel, revealAt, timezone].filter(Boolean).join(' · ') || null,
  };
}

function buildAgencyNoteSections(
  context: PublicPresenceProjectionDraftContext,
  section: PublicPresenceDocument['sections'][number],
): PublicPresenceProjectedFallbackCardSection[] {
  const notes = asFieldArray<unknown>(section, 'notes');
  const projected: PublicPresenceProjectedFallbackCardSection[] = [];

  notes.forEach((entry, index) => {
    const note = asRecord(entry);
    const title = asString(note.title);
    const body = asString(note.body);
    if (!title || !body) {
      return;
    }

    projected.push({
      id: `${section.id}:note:${index + 1}`,
      kind: 'agencyNotes',
      sectionType: 'fallbackCard',
      visibility: 'visible',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: collectValidationIssueIds(context.snapshot, {
        sectionId: section.id,
      }),
      title,
      description: body,
    });
  });

  return projected;
}

function mapFanActionCategory(
  slot: string | null,
): PublicPresenceProjectedAction['category'] {
  switch (slot) {
    case 'stream':
      return 'streamUrl';
    case 'launch':
      return 'launchUrl';
    case 'goods':
      return 'goodsUrl';
    case 'support':
      return 'supportUrl';
    case 'marshmallow':
      return 'internalRoute';
    default:
      return 'fanActionUrl';
  }
}

function buildFanActionSections(
  context: PublicPresenceProjectionDraftContext,
  section: PublicPresenceDocument['sections'][number],
): PublicPresenceProjectedSection[] {
  const actions = asFieldArray<unknown>(section, 'actions');
  const projected: PublicPresenceProjectedSection[] = [];

  actions.forEach((entry, index) => {
    const action = asRecord(entry);
    const label = asString(action.label);
    const rawUrl = asString(action.url);
    const slot = asString(action.slot) ?? 'currentAction';
    const category = mapFanActionCategory(slot);

    if (!label || !rawUrl) {
      return;
    }

    const safeUrl =
      category === 'internalRoute'
        ? {
            reason: rawUrl.startsWith('/') ? null : 'invalid-internal-route',
            value: rawUrl.startsWith('/') ? rawUrl : null,
          }
        : sanitizePublicUrl(
            rawUrl,
            category === 'streamUrl'
              ? 'streamUrl'
              : category === 'launchUrl'
                ? 'launchUrl'
                : category === 'goodsUrl'
                  ? 'goodsUrl'
                  : category === 'supportUrl'
                    ? 'supportUrl'
                    : 'fanActionUrl',
          );

    if (!safeUrl.value) {
      pushFallbackDecision(
        context.runtime,
        ['sections', section.id, 'fields', 'actions', String(index), 'url'],
        'safePlaceholder',
        safeUrl.reason ?? 'unsafe-fan-action',
      );

      projected.push({
        id: `${section.id}:action:${index + 1}`,
        kind: 'fanActions',
        sectionType: 'fallbackCard',
        visibility: 'fallback',
        fallbackBehavior: 'safePlaceholder',
        validationIssueIds: collectValidationIssueIds(context.snapshot, {
          sectionId: section.id,
        }),
        title: label,
        description: null,
      });
      return;
    }

    projected.push({
      id: `${section.id}:action:${index + 1}`,
      kind: 'fanActions',
      sectionType: 'linkButton',
      visibility: 'visible',
      fallbackBehavior: 'safePlaceholder',
      validationIssueIds: collectValidationIssueIds(context.snapshot, {
        sectionId: section.id,
      }),
      action: createAction(context.runtime, {
        slot,
        label,
        href: safeUrl.value,
        providerId: null,
        category,
        phaseVisibility: section.phaseVisibility ?? 'always',
        fallbackBehavior: 'safePlaceholder',
      }),
    });
  });

  return projected;
}

function buildDocumentComponentSections(
  context: PublicPresenceProjectionDraftContext,
): PublicPresenceProjectedSection[] {
  const sections: PublicPresenceProjectedSection[] = [];

  for (const section of context.document.sections) {
    if (!isSectionVisibleForPhase(section.phaseVisibility, context.resolvedRevealPhase)) {
      continue;
    }

    if (section.kind === 'countdownReveal') {
      sections.push(buildCountdownRevealSummarySection(context, section));
    }

    if (section.kind === 'agencyNotes') {
      sections.push(...buildAgencyNoteSections(context, section));
    }

    if (section.kind === 'fanActions') {
      sections.push(...buildFanActionSections(context, section));
    }

    (section.components ?? []).forEach((component, index) => {
      if (component.visible === false) {
        return;
      }

      const projected = buildComponentSection(
        {
          id: component.id,
          order: index,
          props: component.props,
          type: component.type,
          visible: component.visible ?? true,
        },
        context.runtime,
      );

      if (!projected) {
        return;
      }

      const projectedKind =
        section.kind === 'currentLaunchAction'
        && projected.sectionType === 'linkButton'
          ? 'currentLaunchAction'
          : section.kind === 'goodsSupport'
            && projected.sectionType === 'linkButton'
            ? 'goodsSupport'
            : section.kind === 'fanInteraction'
              && projected.sectionType === 'marshmallow'
              ? 'fanInteraction'
              : section.kind === 'stageSchedule'
                && projected.sectionType === 'schedule'
                ? 'stageSchedule'
                : section.kind === 'officialChannels'
                  && projected.sectionType === 'socialLinks'
                  ? 'officialChannels'
                  : section.kind === 'teaserRevealMedia'
                    && (
                      projected.sectionType === 'imageGallery'
                      || projected.sectionType === 'videoEmbed'
                      || projected.sectionType === 'fallbackCard'
                    )
                    ? 'teaserRevealMedia'
                    : projected.kind;

      sections.push({
        ...projected,
        kind: projectedKind,
        validationIssueIds: collectValidationIssueIds(context.snapshot, {
          componentId: component.id,
        }),
      });
    });
  }

  return sections;
}

function buildDocumentMetadata(
  context: PublicPresenceProjectionDraftContext,
  hero: PublicPresenceProjectedHeroSection,
) {
  const revealSafeMetadata = context.document.templateId === 'debutReveal'
    && isPreRevealPhase(context.resolvedRevealPhase);
  const rawOgImage = revealSafeMetadata
    ? null
    : asString(context.document.metadata?.ogImageUrl);
  const safeOgImage = sanitizeMediaUrl(rawOgImage);

  if (!safeOgImage.value && rawOgImage) {
    pushFallbackDecision(
      context.runtime,
      ['metadata', 'ogImageUrl'],
      'safePlaceholder',
      safeOgImage.reason ?? 'unsafe-og-image',
    );
  }

  const safeMetadataTitle = sanitizeOrdinaryLabel(context.document.metadata?.title);
  const title = revealSafeMetadata
    ? hero.title
    : safeMetadataTitle ?? hero.title ?? 'TCRN TMS';
  const safeMetadataDescription = sanitizeOrdinaryLabel(context.document.metadata?.description);
  const safePersonaTagline = sanitizeOrdinaryLabel(context.document.personaKit?.tagline);
  const description = revealSafeMetadata
    ? hero.description ?? safePersonaTagline ?? DEFAULT_PUBLIC_HOMEPAGE_DESCRIPTION
    : safeMetadataDescription
      ?? hero.description
      ?? safePersonaTagline
      ?? DEFAULT_PUBLIC_HOMEPAGE_DESCRIPTION;
  const ogImage = safeOgImage.value
    ? createMedia(context.runtime, {
        kind: 'ogImage',
        providerId: null,
        assetId: null,
        url: safeOgImage.value,
        alt: title ? `${title} public homepage preview` : 'Public homepage preview',
        phaseVisibility: context.resolvedRevealPhase,
        fallbackBehavior: 'safePlaceholder',
      })
    : null;

  return {
    title,
    description,
    canonicalPath: context.route.canonicalPath,
    ogImage,
    ogImageAlt: ogImage?.alt ?? null,
    locale: null,
  };
}

export function buildPublicPresenceProjectionFromDocument(
  input: BuildPublicPresenceProjectionFromDocumentInput,
): PublicPresenceProjection {
  const runtime: ProjectionRuntimeState = {
    actionCounter: 0,
    actions: [],
    fallbackDecisions: [],
    media: [],
    mediaCounter: 0,
  };
  const document = input.document;
  const contentHash = input.contentHash ?? calculatePublicPresenceContentHash(document);
  const resolvedRevealPhase = resolveDocumentRevealPhase(
    document,
    input.revealPhaseOverride,
  );
  const snapshot = createPublicPresenceValidationArtifact(document, {
    mode: input.mode ?? 'projection',
  }).snapshot;
  const context: PublicPresenceProjectionDraftContext = {
    contentHash,
    document,
    mode: input.mode ?? 'projection',
    resolvedRevealPhase,
    route: input.route,
    runtime,
    snapshot,
    talentDisplayName: sanitizeOrdinaryLabel(input.talentDisplayName),
  };
  const hero = buildDocumentHeroSection(context);
  const primaryCta = buildDocumentPrimaryCtaSection(context);
  const documentSections = buildDocumentComponentSections(context);
  const sections = [
    hero,
    ...(primaryCta ? [primaryCta] : []),
    ...documentSections,
  ];

  assignHeroPrimaryAction(hero, sections.slice(1));

  const projection = {
    projectionSchemaVersion: PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION,
    projectionId:
      input.source === 'legacyHomepageCompatibility'
        ? `legacy-homepage:${contentHash.slice(0, 16)}`
        : `public-presence:${(input.documentVersionId ?? contentHash).slice(0, 16)}`,
    projectionVersion: 1,
    portalId: input.portalId ?? null,
    documentVersionId: input.documentVersionId ?? null,
    contentHash,
    validationSnapshotId: input.validationSnapshotId ?? null,
    registryVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.registryVersion,
    safetyPolicyVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.safetyPolicyVersion,
    resolvedRevealPhase,
    route: {
      canonicalPath: input.route.canonicalPath,
      legacyPath: input.route.legacyPath ?? null,
      tenantCode: input.route.tenantCode ?? null,
      talentCode: input.route.talentCode ?? null,
      domainHostname: input.route.domainHostname ?? null,
      cacheKeys: buildCacheKeys(input.route),
    },
    metadata: buildDocumentMetadata(context, hero),
    appearance: {
      theme: resolveDocumentTheme(document, runtime, input.theme),
    },
    sections,
    actions: runtime.actions,
    media: runtime.media,
    fallbackDecisions: mergeFallbackDecisions(
      snapshot.fallbackDecisions,
      runtime.fallbackDecisions,
    ),
    createdAt: input.createdAt,
    rebuiltAt: input.rebuiltAt ?? input.createdAt,
  } satisfies Omit<PublicPresenceProjection, 'projectionHash'>;

  return {
    ...projection,
    projectionHash: calculateProjectionHash(projection),
  };
}

export function calculateLegacyHomepageSourceHash(
  data: PublicHomepageData,
): string {
  return stableHash({
    content: data.content,
    seo: data.seo,
    talent: data.talent,
    theme: data.theme,
    updatedAt: data.updatedAt,
  });
}

export function buildPublicHomepageProjection(
  data: PublicHomepageData,
  route: BuildPublicHomepageProjectionRouteInput,
): PublicPresenceProjection {
  const runtime: ProjectionRuntimeState = {
    actionCounter: 0,
    actions: [],
    fallbackDecisions: [],
    media: [],
    mediaCounter: 0,
  };
  const contentHash = calculateLegacyHomepageSourceHash(data);
  const appearance = {
    theme: sanitizeTheme(data.theme, runtime),
  };
  const hero = buildHeroSection(data, runtime);
  const sections = getVisibleComponents(data.content)
    .map((component) => buildComponentSection(component, runtime))
    .filter((section): section is PublicPresenceProjectedSection => Boolean(section));

  assignHeroPrimaryAction(hero, sections);

  const projection = {
    projectionSchemaVersion: PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION,
    projectionId: `legacy-homepage:${contentHash.slice(0, 16)}`,
    projectionVersion: 1,
    portalId: null,
    documentVersionId: null,
    contentHash,
    validationSnapshotId: null,
    registryVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.registryVersion,
    safetyPolicyVersion: PUBLIC_PRESENCE_REGISTRY_METADATA.safetyPolicyVersion,
    resolvedRevealPhase: 'always' as PublicPresencePhaseVisibility,
    route: {
      canonicalPath: route.canonicalPath,
      legacyPath: route.legacyPath ?? null,
      tenantCode: route.tenantCode ?? null,
      talentCode: route.talentCode ?? null,
      domainHostname: route.domainHostname ?? null,
      cacheKeys: buildCacheKeys(route),
    },
    metadata: buildMetadata(data, route, runtime),
    appearance,
    sections: [hero, ...sections],
    actions: runtime.actions,
    media: runtime.media,
    fallbackDecisions: runtime.fallbackDecisions,
    createdAt: data.updatedAt,
    rebuiltAt: data.updatedAt,
  } satisfies Omit<PublicPresenceProjection, 'projectionHash'>;

  return {
    ...projection,
    projectionHash: calculateProjectionHash(projection),
  };
}

export function buildPublicHomepageProjectionEvent(
  projection: PublicPresenceProjection,
): PublicPresenceProjectionEvent {
  return {
    eventType: 'built',
    projectionHash: projection.projectionHash,
    cacheKeys: projection.route.cacheKeys,
    source: projection.portalId ? 'publicPresenceDocument' : 'legacyHomepageCompatibility',
    validationState:
      projection.fallbackDecisions.length > 0 ? 'fallback' : 'clean',
    createdAt: projection.rebuiltAt,
  };
}
