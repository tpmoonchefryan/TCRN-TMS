// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  PUBLIC_PRESENCE_COMPONENT_SEED_BLUEPRINTS,
  PUBLIC_PRESENCE_SEED_METADATA,
  PUBLIC_PRESENCE_SAFETY_POLICY,
  PUBLIC_PRESENCE_STAGE_SECTION_SEED_BLUEPRINTS,
  PUBLIC_PRESENCE_TEMPLATE_SEED_BLUEPRINTS,
} from '../../public-presence/registry';
import {
  buildPublicPresenceSeedRuntimeAuthority,
} from '../../public-presence/asset-runtime';
import {
  createPublicPresenceValidationArtifact,
  validatePublicPresenceDocument,
} from '../../public-presence/validation';
import {
  PublicPresenceDocumentSchema,
  PublicPresencePublicProjectionSchema,
  PublicPresenceValidationSnapshotSchema,
} from './index';

const safeActiveDocument = {
  schemaVersion: '1.0',
  templateId: 'activeTalentHub',
  sections: [
    {
      id: 'first-1',
      kind: 'firstEncounter',
      fields: {
        displayName: {
          value: 'Tokino Sora',
          provenance: 'override',
        },
        headline: {
          value: 'Official talent hub',
          provenance: 'publicPresence',
        },
        intro: {
          value: 'Welcome to the official page.',
          provenance: 'publicPresence',
        },
        avatarUrl: {
          value: 'https://cdn.example.com/talent/sora/avatar.webp',
          provenance: 'override',
        },
        primaryCtaLabel: {
          value: 'Watch now',
          provenance: 'publicPresence',
        },
        primaryCtaUrl: {
          value: 'https://www.youtube.com/@tokinosora',
          provenance: 'publicPresence',
        },
      },
    },
    {
      id: 'channels-1',
      kind: 'officialChannels',
      components: [
        {
          id: 'social-1',
          type: 'SocialLinks',
          visible: true,
          props: {
            platforms: [
              {
                platformCode: 'youtube',
                url: 'https://www.youtube.com/@tokinosora',
                label: 'YouTube',
              },
            ],
            style: 'pill',
            layout: 'horizontal',
            iconSize: 'medium',
          },
        },
      ],
    },
  ],
  metadata: {
    title: 'Tokino Sora',
    description: 'Official talent hub',
    ogImageUrl: 'https://cdn.example.com/talent/sora/og.webp',
  },
};

const activeHubRuntimeAuthority =
  buildPublicPresenceSeedRuntimeAuthority('activeTalentHub');

describe('public presence registry and schema', () => {
  it('exposes the approved template and section vocabulary', () => {
    expect(Object.keys(PUBLIC_PRESENCE_TEMPLATE_SEED_BLUEPRINTS)).toEqual([
      'activeTalentHub',
      'debutReveal',
    ]);
    expect(PUBLIC_PRESENCE_STAGE_SECTION_SEED_BLUEPRINTS.firstEncounter.fieldDefinitions.map((field) => field.fieldKey)).toEqual(
      expect.arrayContaining(['displayName', 'primaryCtaUrl']),
    );
    expect(PUBLIC_PRESENCE_COMPONENT_SEED_BLUEPRINTS.SocialLinks.aiPatchAllowlist).toEqual([
      'platforms',
      'style',
      'layout',
      'iconSize',
    ]);
    expect(PUBLIC_PRESENCE_SEED_METADATA.contentHashPolicy).toMatchObject({
      algorithm: 'sha256',
      canonicalization: 'stableJson',
    });
    expect(PUBLIC_PRESENCE_SEED_METADATA.documentStates).toEqual(
      expect.arrayContaining(['draft', 'approved', 'published']),
    );
    expect(PUBLIC_PRESENCE_SAFETY_POLICY.embedPolicies.youtube.acceptedHosts).toEqual(
      expect.arrayContaining(['youtube.com', 'youtu.be']),
    );
  });

  it('keeps the outer document schema strict while allowing validation-time compatibility handling', () => {
    expect(PublicPresenceDocumentSchema.parse(safeActiveDocument).templateId).toBe('activeTalentHub');

    expect(() =>
      PublicPresenceDocumentSchema.parse({
        ...safeActiveDocument,
        extra: true,
      }),
    ).toThrow();
  });
});

describe('public presence validation artifact', () => {
  it('builds a clean validation snapshot for a safe active talent document', () => {
    const artifact = createPublicPresenceValidationArtifact(safeActiveDocument, {
      mode: 'publish',
      runtimeAuthority: activeHubRuntimeAuthority,
    });

    expect(artifact.snapshot.issueCounts).toEqual({
      fatal: 0,
      blocker: 0,
      warning: 0,
      info: 0,
    });
    expect(PublicPresenceValidationSnapshotSchema.parse(artifact.snapshot).validationMode).toBe('publish');
  });

  it('preserves unknown fields and unknown nodes as locked/source-owned compatibility content', () => {
    const artifact = createPublicPresenceValidationArtifact({
      ...safeActiveDocument,
      sections: [
        {
          ...safeActiveDocument.sections[0],
          fields: {
            ...safeActiveDocument.sections[0].fields,
            futureToggle: {
              value: true,
              provenance: 'sourceOwned',
            },
          },
        },
        {
          id: 'channels-compat',
          kind: 'officialChannels',
          components: [
            {
              id: 'future-1',
              type: 'FutureBlock',
              props: {
                secretInternalField: 'keep-me',
              },
            },
          ],
        },
      ],
    }, {
      runtimeAuthority: activeHubRuntimeAuthority,
    });

    expect(artifact.normalizedDocument.sections[0].unknownFields).toMatchObject({
      futureToggle: {
        value: true,
      },
    });
    expect(artifact.normalizedDocument.sections[1].components[0]).toMatchObject({
      state: 'validLocked',
      type: 'FutureBlock',
      unknownProps: {
        secretInternalField: 'keep-me',
      },
    });
    expect(artifact.snapshot.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'registry.unknownField',
        'registry.unknownComponent',
      ]),
    );
    expect(artifact.snapshot.issues.find((issue) => issue.code === 'registry.unknownComponent')?.blocksPublish).toBe(false);
  });

  it('fails closed on unsafe links and blocks publish, visual edit, projection, and AI patch by contract', () => {
    const snapshot = validatePublicPresenceDocument({
      ...safeActiveDocument,
      sections: [
        safeActiveDocument.sections[0],
        {
          id: 'actions-1',
          kind: 'fanActions',
          fields: {
            actions: {
              value: [
                {
                  slot: 'launch',
                  label: 'Launch',
                  url: 'https://www.youtube.com/watch?v=launch',
                },
              ],
              provenance: 'publicPresence',
            },
          },
          components: [
            {
              id: 'cta-1',
              type: 'LinkButton',
              props: {
                label: 'Unsafe CTA',
                url: 'javascript:alert(1)',
              },
            },
          ],
        },
      ],
    }, {
      mode: 'publish',
      runtimeAuthority: activeHubRuntimeAuthority,
    });

    const unsafeIssue = snapshot.issues.find((issue) => issue.code === 'unsafe.url.invalid' || issue.code === 'unsafe.url.protocol');

    expect(unsafeIssue).toBeDefined();
    expect(unsafeIssue).toMatchObject({
      blocksAiPatch: true,
      blocksPublish: true,
      blocksVisualEdit: true,
      severity: 'fatal',
      state: 'unsafe',
    });
  });

  it('generates deterministic issue ids for repeated validation runs', () => {
    const input = {
      ...safeActiveDocument,
      sections: [safeActiveDocument.sections[0]],
    };

    const first = validatePublicPresenceDocument(input, {
      mode: 'publish',
      runtimeAuthority: activeHubRuntimeAuthority,
    });
    const second = validatePublicPresenceDocument(input, {
      mode: 'publish',
      runtimeAuthority: activeHubRuntimeAuthority,
    });

    expect(first.issues.map((issue) => issue.id)).toEqual(
      second.issues.map((issue) => issue.id),
    );
    expect(first.issues.map((issue) => issue.code)).toEqual([
      'template.missingRequiredSection',
    ]);
  });

  it('validates the public projection contract without exposing raw source props', () => {
    const projection = {
      projectionSchemaVersion: '1.0',
      resolvedRevealPhase: 'always',
      route: {
        canonicalPath: '/p/safe-home',
        legacyPath: 'safe-home',
        tenantCode: null,
        talentCode: null,
        domainHostname: null,
      },
      metadata: {
        title: 'Safe Home',
        description: 'Safe public homepage',
        canonicalPath: '/p/safe-home',
        ogImage: null,
        ogImageAlt: null,
        locale: null,
      },
      appearance: {
        theme: {
          preset: 'default',
          visualStyle: 'simple',
          colors: {
            primary: '#111827',
            accent: '#f43f5e',
            background: '#ffffff',
            text: '#111827',
            textSecondary: '#475569',
          },
          background: {
            type: 'solid',
            value: '#ffffff',
          },
          card: {
            background: '#ffffff',
            borderRadius: 'large',
            shadow: 'small',
          },
          typography: {
            fontFamily: 'noto-sans',
            headingWeight: 'medium',
          },
          animation: {
            enableEntrance: true,
            enableHover: true,
            intensity: 'low',
          },
          decorations: {
            type: 'none',
          },
        },
      },
      sections: [
        {
          id: 'hero',
          kind: 'firstEncounter',
          sectionType: 'hero',
          visibility: 'visible',
          fallbackBehavior: 'safePlaceholder',
          validationIssueIds: [],
          title: 'Safe Home',
          description: 'Safe public homepage',
          timezone: 'Asia/Tokyo',
          avatar: null,
          primaryAction: null,
        },
        {
          id: 'compat-1',
          kind: 'legacyCompatibility',
          sectionType: 'fallbackCard',
          visibility: 'fallback',
          fallbackBehavior: 'lockedSourceOwned',
          validationIssueIds: [],
          title: 'Compatibility block',
          description: 'Simplified public output only.',
        },
      ],
      actions: [],
      media: [],
    };

    expect(PublicPresencePublicProjectionSchema.parse(projection).sections[1]).toMatchObject({
      kind: 'legacyCompatibility',
      sectionType: 'fallbackCard',
    });
  });
});
