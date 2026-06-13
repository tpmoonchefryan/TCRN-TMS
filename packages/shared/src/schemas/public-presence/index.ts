// SPDX-License-Identifier: Apache-2.0
import { z } from 'zod';

import {
  PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION,
  PUBLIC_PRESENCE_DOCUMENT_STATES,
  PUBLIC_PRESENCE_FALLBACK_POLICIES,
  PUBLIC_PRESENCE_FIELD_PROVENANCES,
  PUBLIC_PRESENCE_HASH_ALGORITHMS,
  PUBLIC_PRESENCE_PHASE_VISIBILITIES,
  PUBLIC_PRESENCE_PROJECTED_MEDIA_KINDS,
  PUBLIC_PRESENCE_PROJECTED_SECTION_KINDS,
  PUBLIC_PRESENCE_PROJECTION_EVENT_TYPES,
  PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION,
  PUBLIC_PRESENCE_PROJECTION_VISIBILITIES,
  PUBLIC_PRESENCE_REVEAL_PHASES,
  PUBLIC_PRESENCE_STAGE_SECTION_KINDS,
  PUBLIC_PRESENCE_TEMPLATE_IDS,
  PUBLIC_PRESENCE_VALIDATION_MODES,
  PUBLIC_PRESENCE_VALIDATION_SEVERITIES,
  PUBLIC_PRESENCE_VALIDATION_STATES,
  PUBLIC_PRESENCE_WORKFLOW_EVENT_TYPES,
} from '../../public-presence/types';
import { ThemeConfigSchema } from '../homepage';
import { PublicPresenceAssetRevisionPinSchema } from './assets';

export * from './assets';

const hasIanaTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const PublicPresenceTemplateIdSchema = z.enum(PUBLIC_PRESENCE_TEMPLATE_IDS);
export const PublicPresenceStageSectionKindSchema = z.enum(PUBLIC_PRESENCE_STAGE_SECTION_KINDS);
export const PublicPresenceValidationSeveritySchema = z.enum(PUBLIC_PRESENCE_VALIDATION_SEVERITIES);
export const PublicPresenceValidationStateSchema = z.enum(PUBLIC_PRESENCE_VALIDATION_STATES);
export const PublicPresenceValidationModeSchema = z.enum(PUBLIC_PRESENCE_VALIDATION_MODES);
export const PublicPresenceDocumentStateSchema = z.enum(PUBLIC_PRESENCE_DOCUMENT_STATES);
export const PublicPresenceFieldProvenanceSchema = z.enum(PUBLIC_PRESENCE_FIELD_PROVENANCES);
export const PublicPresenceHashAlgorithmSchema = z.enum(PUBLIC_PRESENCE_HASH_ALGORITHMS);
export const PublicPresenceRevealPhaseSchema = z.enum(PUBLIC_PRESENCE_REVEAL_PHASES);
export const PublicPresenceWorkflowEventTypeSchema = z.enum(PUBLIC_PRESENCE_WORKFLOW_EVENT_TYPES);
export const PublicPresencePhaseVisibilitySchema = z.enum(PUBLIC_PRESENCE_PHASE_VISIBILITIES);
export const PublicPresenceFallbackPolicySchema = z.enum(PUBLIC_PRESENCE_FALLBACK_POLICIES);
export const PublicPresenceProjectedSectionKindSchema = z.enum(
  PUBLIC_PRESENCE_PROJECTED_SECTION_KINDS
);
export const PublicPresenceProjectionVisibilitySchema = z.enum(
  PUBLIC_PRESENCE_PROJECTION_VISIBILITIES
);
export const PublicPresenceProjectedMediaKindSchema = z.enum(PUBLIC_PRESENCE_PROJECTED_MEDIA_KINDS);
export const PublicPresenceProjectionEventTypeSchema = z.enum(
  PUBLIC_PRESENCE_PROJECTION_EVENT_TYPES
);

export const PublicPresenceFieldValueSchema = z
  .object({
    value: z.unknown(),
    provenance: PublicPresenceFieldProvenanceSchema.optional(),
    inheritedFrom: z.string().min(1).nullable().optional(),
    note: z.string().max(500).optional(),
  })
  .strict();

export const PublicPresenceComponentNodeSchema = z
  .object({
    id: z.string().min(1).max(128),
    type: z.string().min(1).max(128),
    props: z.record(z.string(), z.unknown()),
    visible: z.boolean().optional(),
  })
  .strict();

export const PublicPresenceSectionNodeSchema = z
  .object({
    id: z.string().min(1).max(128),
    kind: z.string().min(1).max(128),
    title: z.string().max(255).optional(),
    fields: z.record(z.string(), PublicPresenceFieldValueSchema).optional(),
    components: z.array(PublicPresenceComponentNodeSchema).optional(),
    phaseVisibility: PublicPresencePhaseVisibilitySchema.optional(),
  })
  .strict();

export const PublicPresenceMetadataSchema = z
  .object({
    title: z.string().max(255).optional(),
    description: z.string().max(512).optional(),
    ogImageUrl: z.string().max(1024).optional(),
    canonicalPath: z.string().max(512).optional(),
  })
  .strict();

export const PublicPresencePersonaKitSchema = z
  .object({
    accentTone: z.string().max(64).optional(),
    campaignLabel: z.string().max(128).optional(),
    tagline: z.string().max(255).optional(),
  })
  .strict();

export const PublicPresenceDocumentSchema = z
  .object({
    schemaVersion: z.literal(PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION),
    templateId: PublicPresenceTemplateIdSchema,
    sections: z.array(PublicPresenceSectionNodeSchema).min(1),
    metadata: PublicPresenceMetadataSchema.optional(),
    personaKit: PublicPresencePersonaKitSchema.optional(),
  })
  .strict();

const SocialLinkItemSchema = z
  .object({
    platformCode: z.string().min(1).max(64),
    url: z.string().min(1).max(1024),
    label: z.string().max(128).optional(),
  })
  .strict();

const ImageGalleryItemSchema = z
  .object({
    url: z.string().min(1).max(1024),
    alt: z.string().max(255).optional(),
    caption: z.string().max(255).optional(),
  })
  .strict();

const ScheduleEventSchema = z
  .object({
    day: z.string().min(1).max(32),
    time: z.string().min(1).max(64),
    title: z.string().min(1).max(255),
  })
  .strict();

export const PublicPresenceProfileCardPropsSchema = z
  .object({
    displayName: z.string().max(255).optional(),
    bio: z.string().max(2000).optional(),
    avatarUrl: z.string().max(1024).optional(),
    avatarShape: z.enum(['circle', 'rounded', 'square']).optional(),
    nameFontSize: z.enum(['small', 'medium', 'large']).optional(),
    bioMaxLines: z.number().int().min(1).max(12).optional(),
  })
  .strict();

export const PublicPresenceSocialLinksPropsSchema = z
  .object({
    platforms: z.array(SocialLinkItemSchema),
    style: z.enum(['icon', 'button', 'pill']).optional(),
    layout: z.enum(['horizontal', 'vertical', 'grid']).optional(),
    iconSize: z.enum(['small', 'medium', 'large']).optional(),
  })
  .strict();

export const PublicPresenceImageGalleryPropsSchema = z
  .object({
    images: z.array(ImageGalleryItemSchema),
    layoutMode: z.enum(['carousel', 'grid', 'masonry']).optional(),
    columns: z.number().int().min(1).max(6).optional(),
    gap: z.enum(['small', 'medium', 'large']).optional(),
    showCaptions: z.boolean().optional(),
  })
  .strict();

export const PublicPresenceVideoEmbedPropsSchema = z
  .object({
    videoUrl: z.string().min(1).max(1024),
    aspectRatio: z.enum(['16:9', '4:3', '1:1']).optional(),
    autoplay: z.boolean().optional(),
    showControls: z.boolean().optional(),
    title: z.string().max(255).optional(),
  })
  .strict();

export const PublicPresenceRichTextPropsSchema = z
  .object({
    contentHtml: z.string().min(1).max(12000),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
  })
  .strict();

export const PublicPresenceLinkButtonPropsSchema = z
  .object({
    label: z.string().min(1).max(255),
    url: z.string().min(1).max(1024),
    style: z.enum(['primary', 'secondary', 'outline', 'ghost']).optional(),
    fullWidth: z.boolean().optional(),
  })
  .strict();

export const PublicPresenceMarshmallowWidgetPropsSchema = z
  .object({
    displayMode: z.enum(['compact', 'full']).optional(),
    showRecentCount: z.number().int().min(0).max(20).optional(),
    showSubmitButton: z.boolean().optional(),
  })
  .strict();

export const PublicPresenceSchedulePropsSchema = z
  .object({
    title: z.string().max(255).optional(),
    weekOf: z.string().max(64).optional(),
    events: z.array(ScheduleEventSchema).optional(),
  })
  .strict();

export const PublicPresenceMusicPlayerPropsSchema = z
  .object({
    platform: z.enum(['spotify']).optional(),
    embedValue: z.string().max(1024).optional(),
    title: z.string().max(255).optional(),
    artist: z.string().max(255).optional(),
  })
  .strict();

export const PublicPresenceLiveStatusPropsSchema = z
  .object({
    platform: z.enum(['youtube', 'twitch']).optional(),
    channelName: z.string().max(255).optional(),
    streamUrl: z.string().max(1024).optional(),
    isLive: z.boolean().optional(),
    viewers: z.string().max(64).optional(),
    title: z.string().max(255).optional(),
  })
  .strict();

export const PublicPresenceDividerPropsSchema = z
  .object({
    style: z.enum(['solid', 'dashed', 'dotted']).optional(),
    spacing: z.enum(['small', 'medium', 'large']).optional(),
  })
  .strict();

export const PublicPresenceSpacerPropsSchema = z
  .object({
    height: z.enum(['small', 'medium', 'large', 'xlarge']).optional(),
  })
  .strict();

export const PublicPresenceBilibiliDynamicPropsSchema = z
  .object({
    uid: z.string().max(255).optional(),
    title: z.string().max(255).optional(),
    maxItems: z.number().int().min(0).max(20).optional(),
    filterType: z.string().max(64).optional(),
    cardStyle: z.string().max(64).optional(),
    refreshInterval: z.number().int().min(0).max(3600).optional(),
    showHeader: z.boolean().optional(),
  })
  .strict();

export const PublicPresenceComponentPropsSchemaMap = {
  BilibiliDynamic: PublicPresenceBilibiliDynamicPropsSchema,
  Divider: PublicPresenceDividerPropsSchema,
  ImageGallery: PublicPresenceImageGalleryPropsSchema,
  LinkButton: PublicPresenceLinkButtonPropsSchema,
  LiveStatus: PublicPresenceLiveStatusPropsSchema,
  MarshmallowWidget: PublicPresenceMarshmallowWidgetPropsSchema,
  MusicPlayer: PublicPresenceMusicPlayerPropsSchema,
  ProfileCard: PublicPresenceProfileCardPropsSchema,
  RichText: PublicPresenceRichTextPropsSchema,
  Schedule: PublicPresenceSchedulePropsSchema,
  SocialLinks: PublicPresenceSocialLinksPropsSchema,
  Spacer: PublicPresenceSpacerPropsSchema,
  VideoEmbed: PublicPresenceVideoEmbedPropsSchema,
} as const;

const StringFieldValueSchema = PublicPresenceFieldValueSchema.extend({
  value: z.string().trim().min(1),
});

const UrlFieldValueSchema = PublicPresenceFieldValueSchema.extend({
  value: z.string().trim().min(1).max(1024),
});

const RevealPhaseFieldValueSchema = PublicPresenceFieldValueSchema.extend({
  value: PublicPresenceRevealPhaseSchema,
});

const DateTimeFieldValueSchema = PublicPresenceFieldValueSchema.extend({
  value: z.string().datetime({ offset: true }),
});

const TimezoneFieldValueSchema = PublicPresenceFieldValueSchema.extend({
  value: z.string().trim().min(1).refine(hasIanaTimezone, {
    message: 'Expected an IANA timezone',
  }),
});

const AgencyNoteSchema = z
  .object({
    kind: z.enum([
      'announcement',
      'campaignCaveat',
      'safetyNotice',
      'legalDisclaimer',
      'contentAdvisory',
    ]),
    title: z.string().min(1).max(255),
    body: z.string().min(1).max(4000),
  })
  .strict();

const FanActionSchema = z
  .object({
    slot: z.enum([
      'follow',
      'notify',
      'currentAction',
      'stream',
      'launch',
      'goods',
      'support',
      'marshmallow',
      'archive',
    ]),
    label: z.string().min(1).max(255),
    url: z.string().min(1).max(1024),
  })
  .strict();

export const PublicPresenceFirstEncounterFieldSchema = z
  .object({
    displayName: StringFieldValueSchema,
    teaserName: StringFieldValueSchema.optional(),
    revealName: StringFieldValueSchema.optional(),
    headline: StringFieldValueSchema.optional(),
    intro: StringFieldValueSchema.optional(),
    avatarUrl: UrlFieldValueSchema.optional(),
    heroMediaUrl: UrlFieldValueSchema.optional(),
    primaryCtaLabel: StringFieldValueSchema.optional(),
    primaryCtaUrl: UrlFieldValueSchema.optional(),
  })
  .strict();

export const PublicPresenceCountdownRevealFieldSchema = z
  .object({
    phase: RevealPhaseFieldValueSchema,
    revealAtUtc: DateTimeFieldValueSchema,
    timezone: TimezoneFieldValueSchema,
    teaserName: StringFieldValueSchema,
    revealName: StringFieldValueSchema,
    streamUrl: UrlFieldValueSchema.optional(),
    launchUrl: UrlFieldValueSchema.optional(),
  })
  .strict();

export const PublicPresenceAgencyNotesFieldSchema = z
  .object({
    notes: PublicPresenceFieldValueSchema.extend({
      value: z.array(AgencyNoteSchema),
    }),
  })
  .strict();

export const PublicPresenceFanActionsFieldSchema = z
  .object({
    actions: PublicPresenceFieldValueSchema.extend({
      value: z.array(FanActionSchema),
    }),
  })
  .strict();

export const PublicPresenceSectionFieldSchemaMap = {
  agencyNotes: PublicPresenceAgencyNotesFieldSchema,
  countdownReveal: PublicPresenceCountdownRevealFieldSchema,
  fanActions: PublicPresenceFanActionsFieldSchema,
  firstEncounter: PublicPresenceFirstEncounterFieldSchema,
} as const;

export const PublicPresenceValidationIssueSchema = z
  .object({
    id: z.string().min(1).max(512),
    severity: PublicPresenceValidationSeveritySchema,
    state: PublicPresenceValidationStateSchema,
    code: z.string().min(1).max(128),
    messageKey: z.string().min(1).max(255),
    path: z.array(z.string().min(1).max(255)),
    templateId: PublicPresenceTemplateIdSchema,
    sectionId: z.string().min(1).max(128).optional(),
    componentId: z.string().min(1).max(128).optional(),
    fieldKey: z.string().min(1).max(128).optional(),
    blocksVisualEdit: z.boolean(),
    blocksPublish: z.boolean(),
    blocksAiPatch: z.boolean(),
    acknowledgementRequired: z.boolean(),
    fallbackBehavior: PublicPresenceFallbackPolicySchema,
    suggestedFix: z.string().max(255).optional(),
    registryVersion: z.string().min(1).max(64),
    policyVersion: z.string().min(1).max(64),
  })
  .strict();

export const PublicPresenceValidationSnapshotSchema = z
  .object({
    snapshotId: z.string().min(1).max(512),
    schemaVersion: z.string().min(1).max(64),
    validationMode: PublicPresenceValidationModeSchema,
    documentSchemaVersion: z.string().min(1).max(64),
    templateId: PublicPresenceTemplateIdSchema,
    templateRegistryVersion: z.string().min(1).max(64),
    componentRegistryVersion: z.string().min(1).max(64),
    safetyPolicyVersion: z.string().min(1).max(64),
    issueCounts: z
      .object({
        fatal: z.number().int().min(0),
        blocker: z.number().int().min(0),
        warning: z.number().int().min(0),
        info: z.number().int().min(0),
      })
      .strict(),
    blockerIds: z.array(z.string().min(1).max(512)),
    issues: z.array(PublicPresenceValidationIssueSchema),
    fallbackDecisions: z.array(
      z
        .object({
          path: z.array(z.string().min(1).max(255)),
          policy: PublicPresenceFallbackPolicySchema,
          reason: z.string().min(1).max(255),
        })
        .strict()
    ),
    acknowledgementIds: z.array(z.string().min(1).max(512)),
    projectionHash: z.string().min(1).max(255).nullable(),
    templateAssetPin: PublicPresenceAssetRevisionPinSchema.nullable().optional(),
  })
  .strict();

export const PublicPresenceProjectedActionSchema = z
  .object({
    id: z.string().min(1).max(128),
    slot: z.string().min(1).max(64),
    label: z.string().min(1).max(255),
    href: z.string().min(1).max(1024).nullable(),
    providerId: z.string().min(1).max(64).nullable(),
    category: z.union([
      z.literal('internalRoute'),
      z.enum([
        'officialChannelUrl',
        'fanActionUrl',
        'goodsUrl',
        'supportUrl',
        'streamUrl',
        'launchUrl',
        'mediaAssetUrl',
        'embedUrl',
        'htmlContent',
      ]),
    ]),
    phaseVisibility: PublicPresencePhaseVisibilitySchema,
    fallbackBehavior: PublicPresenceFallbackPolicySchema,
  })
  .strict();

export const PublicPresenceProjectedMediaSchema = z
  .object({
    id: z.string().min(1).max(128),
    kind: PublicPresenceProjectedMediaKindSchema,
    providerId: z.string().min(1).max(64).nullable(),
    assetId: z.string().min(1).max(128).nullable(),
    url: z.string().min(1).max(1024).nullable(),
    alt: z.string().max(255).nullable(),
    phaseVisibility: PublicPresencePhaseVisibilitySchema,
    fallbackBehavior: PublicPresenceFallbackPolicySchema,
  })
  .strict();

export const PublicPresenceProjectionMetadataSchema = z
  .object({
    title: z.string().max(255).nullable(),
    description: z.string().max(512).nullable(),
    canonicalPath: z.string().min(1).max(512),
    ogImage: PublicPresenceProjectedMediaSchema.nullable(),
    ogImageAlt: z.string().max(255).nullable(),
    locale: z.string().max(64).nullable(),
  })
  .strict();

export const PublicPresenceProjectionRouteSchema = z
  .object({
    canonicalPath: z.string().min(1).max(512),
    legacyPath: z.string().max(255).nullable(),
    tenantCode: z.string().max(128).nullable(),
    talentCode: z.string().max(128).nullable(),
    domainHostname: z.string().max(255).nullable(),
    cacheKeys: z.array(z.string().min(1).max(255)),
  })
  .strict();

const PublicPresenceProjectedSectionBaseSchema = z
  .object({
    id: z.string().min(1).max(128),
    kind: PublicPresenceProjectedSectionKindSchema,
    sectionType: z.string().min(1).max(64),
    visibility: PublicPresenceProjectionVisibilitySchema,
    fallbackBehavior: PublicPresenceFallbackPolicySchema,
    validationIssueIds: z.array(z.string().min(1).max(512)),
  })
  .strict();

const PublicPresenceProjectedHeroSectionSchema = PublicPresenceProjectedSectionBaseSchema.extend({
  sectionType: z.literal('hero'),
  title: z.string().min(1).max(255),
  description: z.string().max(4000).nullable(),
  timezone: z.string().max(64).nullable(),
  avatar: PublicPresenceProjectedMediaSchema.nullable(),
  primaryAction: PublicPresenceProjectedActionSchema.nullable(),
}).strict();

const PublicPresenceProjectedProfileCardSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('profileCard'),
    displayName: z.string().max(255).nullable(),
    bio: z.string().max(4000).nullable(),
    avatar: PublicPresenceProjectedMediaSchema.nullable(),
  }).strict();

const PublicPresenceProjectedSocialLinksSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('socialLinks'),
    title: z.string().max(255).nullable(),
    links: z.array(PublicPresenceProjectedActionSchema),
    layout: z.enum(['horizontal', 'vertical', 'grid']),
    style: z.enum(['icon', 'button', 'pill']),
  }).strict();

const PublicPresenceProjectedImageGallerySectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('imageGallery'),
    title: z.string().max(255).nullable(),
    images: z.array(PublicPresenceProjectedMediaSchema),
    columns: z.number().int().min(1).max(6),
    showCaptions: z.boolean(),
  }).strict();

const PublicPresenceProjectedVideoEmbedSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('videoEmbed'),
    title: z.string().max(255).nullable(),
    providerId: z.string().min(1).max(64).nullable(),
    iframeSrc: z.string().min(1).max(1024).nullable(),
    aspectRatio: z.enum(['16:9', '4:3', '1:1']),
    allow: z.string().max(255).nullable(),
    referrerPolicy: z.string().max(128).nullable(),
    sandbox: z.string().max(255).nullable(),
    fallbackAction: PublicPresenceProjectedActionSchema.nullable(),
  }).strict();

const PublicPresenceProjectedRichTextSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('richText'),
    html: z.string().max(12000),
    textAlign: z.enum(['left', 'center', 'right']),
  }).strict();

const PublicPresenceProjectedLinkButtonSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('linkButton'),
    action: PublicPresenceProjectedActionSchema,
  }).strict();

const PublicPresenceProjectedMarshmallowSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('marshmallow'),
    title: z.string().max(255).nullable(),
    description: z.string().max(4000).nullable(),
    action: PublicPresenceProjectedActionSchema.nullable(),
  }).strict();

const PublicPresenceProjectedScheduleEventSchema = z
  .object({
    day: z.string().min(1).max(32),
    time: z.string().min(1).max(64),
    title: z.string().min(1).max(255),
  })
  .strict();

const PublicPresenceProjectedScheduleSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('schedule'),
    title: z.string().max(255).nullable(),
    weekOf: z.string().max(64).nullable(),
    events: z.array(PublicPresenceProjectedScheduleEventSchema),
  }).strict();

const PublicPresenceProjectedMusicPlayerSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('musicPlayer'),
    title: z.string().max(255).nullable(),
    artist: z.string().max(255).nullable(),
    description: z.string().max(4000).nullable(),
  }).strict();

const PublicPresenceProjectedLiveStatusSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('liveStatus'),
    platform: z.string().max(64).nullable(),
    channelName: z.string().max(255).nullable(),
    title: z.string().max(255).nullable(),
    isLive: z.boolean(),
    viewers: z.string().max(64).nullable(),
    streamAction: PublicPresenceProjectedActionSchema.nullable(),
  }).strict();

const PublicPresenceProjectedDividerSectionSchema = PublicPresenceProjectedSectionBaseSchema.extend(
  {
    sectionType: z.literal('divider'),
    style: z.enum(['solid', 'dashed', 'dotted']),
    spacing: z.enum(['small', 'medium', 'large']),
  }
).strict();

const PublicPresenceProjectedSpacerSectionSchema = PublicPresenceProjectedSectionBaseSchema.extend({
  sectionType: z.literal('spacer'),
  height: z.enum(['small', 'medium', 'large', 'xlarge']),
}).strict();

const PublicPresenceProjectedBilibiliDynamicSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('bilibiliDynamic'),
    title: z.string().max(255).nullable(),
    description: z.string().max(4000).nullable(),
    profileAction: PublicPresenceProjectedActionSchema.nullable(),
  }).strict();

const PublicPresenceProjectedFallbackCardSectionSchema =
  PublicPresenceProjectedSectionBaseSchema.extend({
    sectionType: z.literal('fallbackCard'),
    title: z.string().min(1).max(255),
    description: z.string().max(4000).nullable(),
  }).strict();

export const PublicPresenceProjectedSectionSchema = z.discriminatedUnion('sectionType', [
  PublicPresenceProjectedHeroSectionSchema,
  PublicPresenceProjectedProfileCardSectionSchema,
  PublicPresenceProjectedSocialLinksSectionSchema,
  PublicPresenceProjectedImageGallerySectionSchema,
  PublicPresenceProjectedVideoEmbedSectionSchema,
  PublicPresenceProjectedRichTextSectionSchema,
  PublicPresenceProjectedLinkButtonSectionSchema,
  PublicPresenceProjectedMarshmallowSectionSchema,
  PublicPresenceProjectedScheduleSectionSchema,
  PublicPresenceProjectedMusicPlayerSectionSchema,
  PublicPresenceProjectedLiveStatusSectionSchema,
  PublicPresenceProjectedDividerSectionSchema,
  PublicPresenceProjectedSpacerSectionSchema,
  PublicPresenceProjectedBilibiliDynamicSectionSchema,
  PublicPresenceProjectedFallbackCardSectionSchema,
]);

const PublicPresencePublicProjectedHeroSectionSchema = PublicPresenceProjectedHeroSectionSchema.omit(
  {
    validationIssueIds: true,
  }
).strict();

const PublicPresencePublicProjectedProfileCardSectionSchema =
  PublicPresenceProjectedProfileCardSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedSocialLinksSectionSchema =
  PublicPresenceProjectedSocialLinksSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedImageGallerySectionSchema =
  PublicPresenceProjectedImageGallerySectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedVideoEmbedSectionSchema =
  PublicPresenceProjectedVideoEmbedSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedRichTextSectionSchema =
  PublicPresenceProjectedRichTextSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedLinkButtonSectionSchema =
  PublicPresenceProjectedLinkButtonSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedMarshmallowSectionSchema =
  PublicPresenceProjectedMarshmallowSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedScheduleSectionSchema =
  PublicPresenceProjectedScheduleSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedMusicPlayerSectionSchema =
  PublicPresenceProjectedMusicPlayerSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedLiveStatusSectionSchema =
  PublicPresenceProjectedLiveStatusSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedDividerSectionSchema =
  PublicPresenceProjectedDividerSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedSpacerSectionSchema =
  PublicPresenceProjectedSpacerSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedBilibiliDynamicSectionSchema =
  PublicPresenceProjectedBilibiliDynamicSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

const PublicPresencePublicProjectedFallbackCardSectionSchema =
  PublicPresenceProjectedFallbackCardSectionSchema.omit({
    validationIssueIds: true,
  }).strict();

export const PublicPresencePublicProjectedSectionSchema = z.discriminatedUnion('sectionType', [
  PublicPresencePublicProjectedHeroSectionSchema,
  PublicPresencePublicProjectedProfileCardSectionSchema,
  PublicPresencePublicProjectedSocialLinksSectionSchema,
  PublicPresencePublicProjectedImageGallerySectionSchema,
  PublicPresencePublicProjectedVideoEmbedSectionSchema,
  PublicPresencePublicProjectedRichTextSectionSchema,
  PublicPresencePublicProjectedLinkButtonSectionSchema,
  PublicPresencePublicProjectedMarshmallowSectionSchema,
  PublicPresencePublicProjectedScheduleSectionSchema,
  PublicPresencePublicProjectedMusicPlayerSectionSchema,
  PublicPresencePublicProjectedLiveStatusSectionSchema,
  PublicPresencePublicProjectedDividerSectionSchema,
  PublicPresencePublicProjectedSpacerSectionSchema,
  PublicPresencePublicProjectedBilibiliDynamicSectionSchema,
  PublicPresencePublicProjectedFallbackCardSectionSchema,
]);

export const PublicPresenceProjectionSchema = z
  .object({
    projectionSchemaVersion: z.literal(PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION),
    projectionId: z.string().min(1).max(255),
    projectionVersion: z.number().int().min(1),
    portalId: z.string().min(1).max(255).nullable(),
    documentVersionId: z.string().min(1).max(255).nullable(),
    contentHash: z.string().min(1).max(255),
    validationSnapshotId: z.string().min(1).max(255).nullable(),
    templateAssetPin: PublicPresenceAssetRevisionPinSchema.nullable().optional(),
    registryVersion: z.string().min(1).max(64),
    safetyPolicyVersion: z.string().min(1).max(64),
    projectionHash: z.string().min(1).max(255),
    resolvedRevealPhase: PublicPresencePhaseVisibilitySchema,
    route: PublicPresenceProjectionRouteSchema,
    metadata: PublicPresenceProjectionMetadataSchema,
    appearance: z
      .object({
        theme: ThemeConfigSchema,
      })
      .strict(),
    sections: z.array(PublicPresenceProjectedSectionSchema),
    actions: z.array(PublicPresenceProjectedActionSchema),
    media: z.array(PublicPresenceProjectedMediaSchema),
    fallbackDecisions: z.array(
      z
        .object({
          path: z.array(z.string().min(1).max(255)),
          policy: PublicPresenceFallbackPolicySchema,
          reason: z.string().min(1).max(255),
        })
        .strict()
    ),
    createdAt: z.string().datetime({ offset: true }),
    rebuiltAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const PublicPresencePublicProjectionRouteSchema = z
  .object({
    canonicalPath: z.string().min(1).max(512),
    legacyPath: z.string().max(255).nullable(),
    tenantCode: z.string().max(128).nullable(),
    talentCode: z.string().max(128).nullable(),
    domainHostname: z.string().max(255).nullable(),
  })
  .strict();

export const PublicPresencePublicProjectionSchema = z
  .object({
    projectionSchemaVersion: z.literal(PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION),
    resolvedRevealPhase: PublicPresencePhaseVisibilitySchema,
    route: PublicPresencePublicProjectionRouteSchema,
    metadata: PublicPresenceProjectionMetadataSchema,
    appearance: z
      .object({
        theme: ThemeConfigSchema,
      })
      .strict(),
    sections: z.array(PublicPresencePublicProjectedSectionSchema),
    actions: z.array(PublicPresenceProjectedActionSchema),
    media: z.array(PublicPresenceProjectedMediaSchema),
  })
  .strict();

export const PublicPresenceProjectionEventSchema = z
  .object({
    eventType: PublicPresenceProjectionEventTypeSchema,
    projectionHash: z.string().min(1).max(255),
    cacheKeys: z.array(z.string().min(1).max(255)),
    source: z.enum(['legacyHomepageCompatibility', 'publicPresenceDocument']),
    validationState: z.enum(['clean', 'fallback']),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
