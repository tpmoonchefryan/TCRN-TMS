import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '../types/homepage/presets';
import { importLegacyHomepageContent } from './legacy-adapter';

describe('legacy homepage adapter', () => {
  it('maps safe legacy homepage blocks into public presence sections with source preservation', () => {
    const result = importLegacyHomepageContent({
      content: {
        version: '1.0',
        components: [
          {
            id: 'profile-1',
            order: 1,
            props: {
              avatarUrl: 'https://cdn.example.com/legacy/avatar.webp',
              bio: 'Legacy imported profile.',
              displayName: 'Legacy Star',
            },
            type: 'ProfileCard',
            visible: true,
          },
          {
            id: 'social-1',
            order: 2,
            props: {
              platforms: [
                {
                  label: 'YouTube',
                  platformCode: 'youtube',
                  url: 'https://www.youtube.com/@legacy-star',
                },
              ],
            },
            type: 'SocialLinks',
            visible: true,
          },
          {
            id: 'cta-1',
            order: 3,
            props: {
              label: 'Join now',
              url: 'https://example.com/join',
            },
            type: 'LinkButton',
            visible: true,
          },
          {
            id: 'note-1',
            order: 4,
            props: {
              contentHtml: '<h2>Announcement</h2><p>Legacy note body.</p>',
            },
            type: 'RichText',
            visible: true,
          },
          {
            id: 'gallery-1',
            order: 5,
            props: {
              images: [
                {
                  alt: 'Hero key visual',
                  url: 'https://cdn.example.com/legacy/hero.webp',
                },
              ],
            },
            type: 'ImageGallery',
            visible: true,
          },
          {
            id: 'video-1',
            order: 6,
            props: {
              title: 'Debut teaser',
              videoUrl: 'https://www.youtube.com/watch?v=abc123',
            },
            type: 'VideoEmbed',
            visible: true,
          },
          {
            id: 'marshmallow-1',
            order: 7,
            props: {
              displayMode: 'full',
              showSubmitButton: true,
            },
            type: 'MarshmallowWidget',
            visible: true,
          },
          {
            id: 'schedule-1',
            order: 8,
            props: {
              events: [
                {
                  day: 'Mon',
                  time: '20:00 JST',
                  title: 'Weekly karaoke',
                },
              ],
              title: 'This week',
            },
            type: 'Schedule',
            visible: true,
          },
          {
            id: 'live-1',
            order: 9,
            props: {
              isLive: true,
              platform: 'youtube',
              streamUrl: 'https://youtube.com/live/legacy-star',
              title: 'Live now',
            },
            type: 'LiveStatus',
            visible: true,
          },
          {
            id: 'bili-1',
            order: 10,
            props: {
              title: 'Bilibili updates',
              uid: '123456',
            },
            type: 'BilibiliDynamic',
            visible: true,
          },
        ],
      },
      importedAt: '2026-05-15T10:00:00.000Z',
      seoDescription: 'Legacy SEO description',
      seoTitle: 'Legacy SEO title',
      theme: DEFAULT_THEME,
    });

    expect(result.document.sections.map((section) => section.kind)).toEqual(
      expect.arrayContaining([
        'firstEncounter',
        'officialChannels',
        'fanActions',
        'agencyNotes',
        'teaserRevealMedia',
        'fanInteraction',
        'stageSchedule',
        'currentLaunchAction',
        'officialUpdatesFeed',
      ]),
    );
    expect(result.validationArtifact.snapshot.issueCounts.fatal).toBe(0);
    expect(result.validationArtifact.snapshot.issueCounts.blocker).toBe(0);
    expect(result.nodeMappings.every((mapping) => mapping.mappingStatus === 'mapped')).toBe(true);
    expect(result.sourcePreservation).toHaveLength(10);
    expect(result.importRecord.mappingSummary.mapped).toBe(10);
  });

  it('preserves hidden reveal payloads, unsupported nodes, and unsafe legacy blocks without leaking them into mapped public fields', () => {
    const result = importLegacyHomepageContent({
      content: {
        version: '1.0',
        components: [
          {
            id: 'profile-1',
            order: 1,
            props: {
              displayName: 'Teaser Name',
              revealName: 'Secret Identity',
            },
            type: 'ProfileCard',
            visible: true,
          },
          {
            id: 'unsafe-note',
            order: 2,
            props: {
              contentHtml: '<p>Hello</p><script>alert(1)</script>',
            },
            type: 'RichText',
            visible: true,
          },
          {
            id: 'unsafe-cta',
            order: 3,
            props: {
              label: 'Click me',
              url: 'javascript:alert(1)',
            },
            type: 'LinkButton',
            visible: true,
          },
          {
            id: 'music-1',
            order: 4,
            props: {
              artist: 'Legacy Star',
              platform: 'spotify',
              title: 'Deferred player',
            },
            type: 'MusicPlayer',
            visible: true,
          },
          {
            id: 'future-1',
            order: 5,
            props: {
              secretInternalField: 'keep-me',
            },
            type: 'FutureBlock',
            visible: true,
          },
        ],
      },
      importedAt: '2026-05-15T10:00:00.000Z',
      seoTitle: 'Legacy teaser',
      theme: DEFAULT_THEME,
    });

    expect(result.document.sections.map((section) => section.kind)).toContain('legacyCompatibility');
    expect(JSON.stringify(result.document)).not.toContain('Secret Identity');
    expect(result.sourcePreservation.find((item) => item.originalComponentId === 'profile-1')?.rawProps).toMatchObject({
      revealName: 'Secret Identity',
    });
    expect(result.nodeMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mappingStatus: 'unsafeBlocked',
          originalComponentId: 'unsafe-note',
        }),
        expect.objectContaining({
          mappingStatus: 'unsafeBlocked',
          originalComponentId: 'unsafe-cta',
        }),
        expect.objectContaining({
          mappingStatus: 'lockedSourceOwned',
          originalComponentId: 'music-1',
        }),
        expect.objectContaining({
          mappingStatus: 'unsupported',
          originalComponentId: 'future-1',
        }),
      ]),
    );
    expect(result.validationArtifact.snapshot.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'unsafe.html.executable',
        'unsafe.url.protocol',
        'registry.unknownSection',
        'registry.unknownComponent',
      ]),
    );
  });

  it('emits a deterministic dry-run report for migration planning', () => {
    const result = importLegacyHomepageContent({
      content: {
        version: '1.0',
        components: [
          {
            id: 'profile-1',
            order: 1,
            props: {
              displayName: 'Dry Run',
            },
            type: 'ProfileCard',
            visible: true,
          },
          {
            id: 'future-1',
            order: 2,
            props: {
              raw: true,
            },
            type: 'FutureBlock',
            visible: true,
          },
        ],
      },
      importedAt: '2026-05-15T10:00:00.000Z',
      seoTitle: 'Dry Run',
      theme: DEFAULT_THEME,
    });

    expect(result.dryRunReport).toMatchObject({
      importerVersion: '1.0.0',
      sourceCount: 2,
      mappedCount: 1,
      unsupportedCount: 1,
      hasCompatibilitySection: true,
    });
    expect(result.importRecord.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.importRecord.sourceThemeHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
