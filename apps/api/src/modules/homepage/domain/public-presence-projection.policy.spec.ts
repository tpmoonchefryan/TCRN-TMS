import { describe, expect, it } from 'vitest';

import {
  DEFAULT_THEME,
  type PublicPresenceDocument,
  PublicPresenceProjectionSchema,
} from '@tcrn/shared';

import { buildPublicPresenceSeedRuntimeAuthorityForTests } from '../testing/public-presence-seed-runtime-authority';
import type { PublicHomepageData } from './public-homepage-read.policy';
import {
  buildPublicHomepageProjection,
  buildPublicHomepageProjectionEvent,
  buildPublicPresenceProjectionFromDocument,
} from './public-presence-projection.policy';

const baseHomepageData: PublicHomepageData = {
  talent: {
    displayName: 'Hoshimachi Suisei',
    avatarUrl: 'https://cdn.example.com/suisei/avatar.png',
    timezone: 'Asia/Tokyo',
  },
  content: {
    version: '1.0.0',
    components: [
      {
        id: 'social-1',
        type: 'SocialLinks',
        order: 1,
        visible: true,
        props: {
          platforms: [
            {
              platformCode: 'youtube',
              label: 'YouTube',
              url: 'https://www.youtube.com/@suisei?utm_source=test',
            },
            {
              platformCode: 'unsafe',
              label: 'Unsafe',
              url: 'javascript:alert(1)',
            },
          ],
        },
      },
      {
        id: 'video-1',
        type: 'VideoEmbed',
        order: 2,
        visible: true,
        props: {
          title: 'Debut PV',
          videoUrl: 'https://www.youtube.com/watch?v=abc123&t=90',
        },
      },
      {
        id: 'rich-1',
        type: 'RichText',
        order: 3,
        visible: true,
        props: {
          contentHtml: '<h2>About</h2><p>Official page.</p><script>alert(1)</script>',
        },
      },
      {
        id: 'future-1',
        type: 'FutureBlock' as unknown as 'ProfileCard',
        order: 4,
        visible: true,
        props: {
          secretInternalField: 'do-not-leak',
        },
      },
    ],
  },
  theme: {
    ...DEFAULT_THEME,
    background: {
      type: 'image',
      value: 'javascript:alert(1)',
    },
  },
  seo: {
    title: 'Suisei Official Homepage',
    description: 'Public profile and schedule.',
    ogImageUrl: 'javascript:alert(1)',
  },
  updatedAt: '2026-05-15T10:00:00.000Z',
};

describe('public presence projection policy', () => {
  it('builds a projection-only public payload and strips unsafe raw values', () => {
    const projection = buildPublicHomepageProjection(baseHomepageData, {
      canonicalPath: '/p/suisei-home',
      legacyPath: 'suisei-home',
    });

    expect(PublicPresenceProjectionSchema.parse(projection).projectionHash).toBeTruthy();
    expect(projection.route.cacheKeys).toEqual(
      expect.arrayContaining(['public-homepage', 'public-homepage:path:suisei-home'])
    );
    expect(projection.appearance.theme.background.type).not.toBe('image');
    expect(projection.metadata.ogImage).toBeNull();

    const videoSection = projection.sections.find(
      (section) => section.sectionType === 'videoEmbed'
    );
    expect(videoSection).toMatchObject({
      providerId: 'youtube',
      iframeSrc: 'https://www.youtube.com/embed/abc123?start=90',
    });

    const json = JSON.stringify(projection);
    expect(json).not.toContain('secretInternalField');
    expect(json).not.toContain('do-not-leak');
    expect(json).not.toContain('javascript:alert(1)');
    expect(json).not.toContain('<script>');
    expect(json).not.toContain('utm_source');

    const secondProjection = buildPublicHomepageProjection(baseHomepageData, {
      canonicalPath: '/p/suisei-home',
      legacyPath: 'suisei-home',
    });

    expect(secondProjection.projectionHash).toBe(projection.projectionHash);
    expect(
      JSON.parse(
        JSON.stringify({
          projectionSchemaVersion: projection.projectionSchemaVersion,
          resolvedRevealPhase: projection.resolvedRevealPhase,
          route: {
            canonicalPath: projection.route.canonicalPath,
            legacyPath: projection.route.legacyPath,
            tenantCode: projection.route.tenantCode,
            talentCode: projection.route.talentCode,
            domainHostname: projection.route.domainHostname,
          },
          metadata: projection.metadata,
          appearance: projection.appearance,
          sections: projection.sections,
          actions: projection.actions,
          media: projection.media,
        })
      )
    ).not.toHaveProperty('contentHash');
  });

  it('falls back non-youtube embeds to a safe outbound action instead of a raw iframe', () => {
    const projection = buildPublicHomepageProjection(
      {
        ...baseHomepageData,
        content: {
          version: '1.0.0',
          components: [
            {
              id: 'video-compat',
              type: 'VideoEmbed',
              order: 1,
              visible: true,
              props: {
                title: 'Bilibili Teaser',
                videoUrl: 'https://www.bilibili.com/video/BV1xx411c7mD',
              },
            },
          ],
        },
      },
      {
        canonicalPath: '/tenant-a/suisei/homepage',
        tenantCode: 'tenant-a',
        talentCode: 'suisei',
      }
    );

    const videoSection = projection.sections.find(
      (section) => section.sectionType === 'videoEmbed'
    );

    expect(videoSection).toMatchObject({
      visibility: 'fallback',
      iframeSrc: null,
      fallbackAction: {
        href: 'https://www.bilibili.com/video/BV1xx411c7mD',
      },
    });
  });

  it('blocks protocol-relative, credential, and encoded-bypass URLs from public output', () => {
    const projection = buildPublicHomepageProjection(
      {
        ...baseHomepageData,
        content: {
          version: '1.0.0',
          components: [
            {
              id: 'social-unsafe',
              type: 'SocialLinks',
              order: 1,
              visible: true,
              props: {
                platforms: [
                  {
                    platformCode: 'youtube',
                    label: 'Protocol relative',
                    url: '//evil.example.com/path',
                  },
                  {
                    platformCode: 'bili',
                    label: 'Credential URL',
                    url: 'https://user:pass@example.com/private',
                  },
                  {
                    platformCode: 'x',
                    label: 'Encoded bypass',
                    url: 'https://example.com/%2f%2fevil.example.com',
                  },
                ],
              },
            },
          ],
        },
      },
      {
        canonicalPath: '/p/suisei-home',
        legacyPath: 'suisei-home',
      }
    );

    expect(
      projection.sections.find((section) => section.sectionType === 'socialLinks')
    ).toBeFalsy();
    expect(projection.fallbackDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'blocked-protocol-relative' }),
        expect.objectContaining({ reason: 'credential-url' }),
        expect.objectContaining({ reason: 'blocked-protocol-relative' }),
      ])
    );
  });

  it('blocks protocol-relative and encoded bypasses for internal fan action routes', () => {
    const document: PublicPresenceDocument = {
      schemaVersion: '1.0',
      templateId: 'activeTalentHub',
      metadata: {
        title: 'Safe internal actions',
        description: 'Safe fan action routing',
        ogImageUrl: 'https://cdn.example.com/suisei/og.png',
      },
      sections: [
        {
          id: 'actions-1',
          kind: 'fanActions',
          fields: {
            actions: {
              provenance: 'publicPresence',
              value: [
                {
                  slot: 'marshmallow',
                  label: 'Safe internal',
                  url: '/marshmallow/suisei',
                },
                {
                  slot: 'marshmallow',
                  label: 'Protocol relative',
                  url: '//evil.example/path',
                },
                {
                  slot: 'marshmallow',
                  label: 'Backslash host',
                  url: '/\\evil.example/path',
                },
                {
                  slot: 'marshmallow',
                  label: 'Encoded bypass',
                  url: '/%2f%2fevil.example/path',
                },
                {
                  slot: 'marshmallow',
                  label: 'Relative path',
                  url: 'marshmallow/suisei',
                },
              ],
            },
          },
          phaseVisibility: 'always',
        },
      ],
    };

    const projection = buildPublicPresenceProjectionFromDocument({
      createdAt: '2026-05-15T10:00:00.000Z',
      document,
      documentVersionId: 'version-1',
      portalId: 'portal-1',
      route: {
        canonicalPath: '/tenant-a/suisei/homepage',
        talentCode: 'suisei',
        tenantCode: 'tenant-a',
      },
      runtimeAuthority: buildPublicPresenceSeedRuntimeAuthorityForTests(document.templateId),
      source: 'publicPresenceDocument',
      validationSnapshotId: 'snapshot-1',
    });

    const linkButtons = projection.sections.filter(
      (section) => section.sectionType === 'linkButton'
    );
    const fallbackCards = projection.sections.filter(
      (section) => section.sectionType === 'fallbackCard'
    );

    expect(linkButtons).toHaveLength(1);
    expect(linkButtons[0]).toMatchObject({
      action: {
        category: 'internalRoute',
        href: '/marshmallow/suisei',
      },
    });
    expect(fallbackCards.map((section) => section.id)).toEqual([
      'actions-1:action:2',
      'actions-1:action:3',
      'actions-1:action:4',
      'actions-1:action:5',
    ]);
    expect(projection.fallbackDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'unsafe-internal-path' }),
        expect.objectContaining({ reason: 'invalid-internal-route' }),
      ])
    );
  });

  it('drops rich text that carries protocol-relative or credential URLs', () => {
    const projection = buildPublicHomepageProjection(
      {
        ...baseHomepageData,
        content: {
          version: '1.0.0',
          components: [
            {
              id: 'rich-unsafe',
              type: 'RichText',
              order: 1,
              visible: true,
              props: {
                contentHtml: '<p><a href=\"//evil.example.com\">click</a></p>',
              },
            },
          ],
        },
      },
      {
        canonicalPath: '/p/suisei-home',
        legacyPath: 'suisei-home',
      }
    );

    expect(projection.sections.some((section) => section.id === 'rich-unsafe')).toBe(false);
    expect(projection.fallbackDecisions).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: 'empty-or-unsafe-rich-text' })])
    );
  });

  it('emits projection event evidence from the safe projection hash and cache keys', () => {
    const projection = buildPublicHomepageProjection(baseHomepageData, {
      canonicalPath: '/p/suisei-home',
      legacyPath: 'suisei-home',
    });
    const event = buildPublicHomepageProjectionEvent(projection);

    expect(event).toMatchObject({
      eventType: 'built',
      projectionHash: projection.projectionHash,
      source: 'legacyHomepageCompatibility',
    });
    expect(event.cacheKeys).toContain('public-homepage:path:suisei-home');
  });

  it('builds projections directly from Public Presence documents and suppresses reveal metadata before reveal', () => {
    const document: PublicPresenceDocument = {
      schemaVersion: '1.0',
      templateId: 'debutReveal',
      metadata: {
        title: 'Tokino Sora reveal',
        description: 'Reveal metadata',
        ogImageUrl: 'https://cdn.example.com/reveal-og.png',
      },
      sections: [
        {
          id: 'first-1',
          kind: 'firstEncounter',
          fields: {
            displayName: { provenance: 'publicPresence', value: 'Tokino Sora' },
            teaserName: { provenance: 'publicPresence', value: 'Project S' },
            revealName: { provenance: 'publicPresence', value: 'Tokino Sora' },
            headline: { provenance: 'publicPresence', value: 'A new stage begins.' },
            primaryCtaLabel: { provenance: 'publicPresence', value: 'Notify me' },
            primaryCtaUrl: { provenance: 'publicPresence', value: 'https://example.com/notify' },
          },
          phaseVisibility: 'always',
        },
        {
          id: 'countdown-1',
          kind: 'countdownReveal',
          fields: {
            phase: { provenance: 'publicPresence', value: 'teaser' },
            revealAtUtc: { provenance: 'publicPresence', value: '2099-05-15T10:00:00.000Z' },
            timezone: { provenance: 'publicPresence', value: 'Asia/Tokyo' },
            teaserName: { provenance: 'publicPresence', value: 'Project S' },
            revealName: { provenance: 'publicPresence', value: 'Tokino Sora' },
          },
          phaseVisibility: 'teaser',
        },
        {
          id: 'actions-1',
          kind: 'fanActions',
          fields: {
            actions: {
              provenance: 'publicPresence',
              value: [
                {
                  slot: 'follow',
                  label: 'Follow',
                  url: 'https://example.com/follow?utm_source=preview',
                },
              ],
            },
          },
          phaseVisibility: 'always',
        },
      ],
    };

    const teaserProjection = buildPublicPresenceProjectionFromDocument({
      createdAt: '2026-05-15T10:00:00.000Z',
      document,
      documentVersionId: 'version-1',
      portalId: 'portal-1',
      revealPhaseOverride: 'teaser',
      route: {
        canonicalPath: '/tenant-a/sora/homepage',
        talentCode: 'sora',
        tenantCode: 'tenant-a',
      },
      runtimeAuthority: buildPublicPresenceSeedRuntimeAuthorityForTests(document.templateId),
      source: 'publicPresenceDocument',
      validationSnapshotId: 'snapshot-1',
    });

    expect(PublicPresenceProjectionSchema.parse(teaserProjection).projectionHash).toBeTruthy();
    expect(teaserProjection.portalId).toBe('portal-1');
    expect(teaserProjection.documentVersionId).toBe('version-1');
    expect(teaserProjection.metadata.title).toBe('Project S');
    expect(teaserProjection.metadata.ogImage).toBeNull();
    expect(teaserProjection.sections.some((section) => section.kind === 'fanActions')).toBe(true);
    expect(JSON.stringify(teaserProjection)).not.toContain('utm_source');

    const revealedProjection = buildPublicPresenceProjectionFromDocument({
      createdAt: '2026-05-15T10:00:00.000Z',
      document,
      documentVersionId: 'version-1',
      portalId: 'portal-1',
      revealPhaseOverride: 'revealed',
      route: {
        canonicalPath: '/tenant-a/sora/homepage',
        talentCode: 'sora',
        tenantCode: 'tenant-a',
      },
      runtimeAuthority: buildPublicPresenceSeedRuntimeAuthorityForTests(document.templateId),
      source: 'publicPresenceDocument',
      validationSnapshotId: 'snapshot-1',
    });

    expect(revealedProjection.metadata.title).toBe('Tokino Sora reveal');
    expect(revealedProjection.metadata.ogImage?.url).toBe('https://cdn.example.com/reveal-og.png');
    expect(buildPublicHomepageProjectionEvent(revealedProjection).source).toBe(
      'publicPresenceDocument'
    );
  });

  it('replaces raw internal debut draft identity with safe public fallback titles', () => {
    const document: PublicPresenceDocument = {
      schemaVersion: '1.0',
      templateId: 'debutReveal',
      metadata: {
        title: 'TALENT_SAKURA homepage',
        description: 'Reveal metadata',
      },
      sections: [
        {
          id: 'first-1',
          kind: 'firstEncounter',
          fields: {
            displayName: { provenance: 'publicPresence', value: 'TALENT_SAKURA' },
            teaserName: { provenance: 'publicPresence', value: 'TALENT_SAKURA' },
            revealName: { provenance: 'publicPresence', value: 'TALENT_SAKURA' },
            headline: { provenance: 'publicPresence', value: 'A new stage begins.' },
          },
          phaseVisibility: 'always',
        },
        {
          id: 'countdown-1',
          kind: 'countdownReveal',
          fields: {
            phase: { provenance: 'publicPresence', value: 'countdown' },
            revealAtUtc: { provenance: 'publicPresence', value: '2099-05-15T10:00:00.000Z' },
            teaserName: { provenance: 'publicPresence', value: 'TALENT_SAKURA' },
            revealName: { provenance: 'publicPresence', value: 'TALENT_SAKURA' },
          },
          phaseVisibility: 'countdown',
        },
      ],
    };

    const teaserProjection = buildPublicPresenceProjectionFromDocument({
      createdAt: '2026-05-15T10:00:00.000Z',
      document,
      documentVersionId: 'version-raw',
      portalId: 'portal-1',
      revealPhaseOverride: 'countdown',
      route: {
        canonicalPath: '/tenant-a/sakura/homepage',
        talentCode: 'sakura',
        tenantCode: 'tenant-a',
      },
      runtimeAuthority: buildPublicPresenceSeedRuntimeAuthorityForTests(document.templateId),
      source: 'publicPresenceDocument',
      validationSnapshotId: 'snapshot-raw',
    });

    const revealedProjection = buildPublicPresenceProjectionFromDocument({
      createdAt: '2026-05-15T10:00:00.000Z',
      document,
      documentVersionId: 'version-raw',
      portalId: 'portal-1',
      revealPhaseOverride: 'revealed',
      route: {
        canonicalPath: '/tenant-a/sakura/homepage',
        talentCode: 'sakura',
        tenantCode: 'tenant-a',
      },
      runtimeAuthority: buildPublicPresenceSeedRuntimeAuthorityForTests(document.templateId),
      source: 'publicPresenceDocument',
      validationSnapshotId: 'snapshot-raw',
    });

    expect(teaserProjection.metadata.title).toBe('Debut preview');
    expect(teaserProjection.sections[0]).toMatchObject({
      sectionType: 'hero',
      title: 'Debut preview',
    });
    expect(revealedProjection.metadata.title).toBe('Debut reveal');
    expect(revealedProjection.sections[0]).toMatchObject({
      sectionType: 'hero',
      title: 'Debut reveal',
    });
    expect(JSON.stringify(revealedProjection)).not.toContain('TALENT_SAKURA');
  });
});
