import { DEFAULT_THEME, type PublicPresenceDocument } from '@tcrn/shared';
import { describe, expect, it, vi } from 'vitest';

import type { PublicHomepageData, PublicHomepageTalentRecord } from '../domain/public-homepage-read.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { PublicHomepageService } from './public-homepage.service';
import { PublicHomepageProjectionService } from './public-homepage-projection.service';

const baseHomepageData: PublicHomepageData = {
  talent: {
    displayName: 'Tokino Sora',
    avatarUrl: 'https://cdn.example.com/sora.png',
    timezone: 'Asia/Tokyo',
  },
  content: {
    version: '1.0.0',
    components: [],
  },
  theme: DEFAULT_THEME,
  seo: {
    title: 'Tokino Sora',
    description: 'Official public homepage',
    ogImageUrl: null,
  },
  updatedAt: '2026-05-15T10:00:00.000Z',
};

const publishedTalent: PublicHomepageTalentRecord = {
  id: 'talent-1',
  code: 'sora',
  displayName: 'Tokino Sora',
  avatarUrl: 'https://cdn.example.com/sora.png',
  homepagePath: 'tokino-sora',
  timezone: 'Asia/Tokyo',
};

const liveDocument: PublicPresenceDocument = {
  schemaVersion: '1.0',
  templateId: 'debutReveal',
  metadata: {
    title: 'Sora reveal',
    description: 'Reveal-safe metadata',
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
  ],
};

describe('PublicHomepageProjectionService', () => {
  function createService() {
    const publicHomepageService = {
      getPublishedHomepageOrThrow: vi.fn(),
      getPublishedHomepageByCodesOrThrow: vi.fn(),
    } as unknown as PublicHomepageService;

    const publicHomepageReadRepository = {
      listActiveTenantSchemas: vi.fn().mockResolvedValue(['tenant_alpha']),
      findPublishedTalentByPath: vi.fn().mockResolvedValue(null),
      findActiveTenantSchemaByCode: vi.fn().mockResolvedValue('tenant_alpha'),
      findPublishedTalentByCode: vi.fn().mockResolvedValue(null),
    } as unknown as PublicHomepageReadRepository;

    const publicPresenceFoundationRepository = {
      findPortalByTalentId: vi.fn().mockResolvedValue(null),
      findDocumentVersionById: vi.fn().mockResolvedValue(null),
    } as unknown as PublicPresenceFoundationRepository;

    const homepageAdminRepository = {
      findTalentById: vi.fn(),
      findTenantCodeBySchema: vi.fn(),
    } as unknown as HomepageAdminRepository;

    return {
      service: new PublicHomepageProjectionService(
        publicHomepageService,
        publicHomepageReadRepository,
        publicPresenceFoundationRepository,
        homepageAdminRepository,
      ),
      publicHomepageService,
      publicHomepageReadRepository,
      publicPresenceFoundationRepository,
      homepageAdminRepository,
    };
  }

  it('falls back to the legacy public homepage runtime when no live Public Presence version exists', async () => {
    const {
      service,
      publicHomepageService,
    } = createService();

    vi.mocked(publicHomepageService.getPublishedHomepageOrThrow).mockResolvedValue(
      baseHomepageData,
    );

    const projection = await service.getPublishedHomepageProjectionOrThrow('tokino-sora');

    expect(projection.route).toMatchObject({
      canonicalPath: '/p/tokino-sora',
      legacyPath: 'tokino-sora',
    });
    expect(projection.portalId).toBeNull();
    expect(publicHomepageService.getPublishedHomepageOrThrow).toHaveBeenCalledWith('tokino-sora');
    expect(service.toPublicProjection(projection)).not.toHaveProperty('contentHash');
  });

  it('prefers the live Public Presence document when the portal has a published version', async () => {
    const {
      service,
      publicHomepageReadRepository,
      publicPresenceFoundationRepository,
    } = createService();

    vi.mocked(publicHomepageReadRepository.findPublishedTalentByPath).mockResolvedValue(
      publishedTalent,
    );
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'draft-1',
      liveVersionId: 'live-1',
      latestVersionNumber: 3,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdAt: new Date('2026-05-15T08:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      version: 1,
    });
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue({
      id: 'live-1',
      portalId: 'portal-1',
      versionNumber: 2,
      documentSchemaVersion: '1.0',
      templateId: 'debutReveal',
      document: liveDocument as unknown as Record<string, unknown>,
      documentState: 'published',
      contentHashAlgorithm: 'sha256',
      contentHash: 'public-presence-hash',
      lastValidationSnapshotId: 'snapshot-1',
      scheduledFor: null,
      publishedAt: new Date('2026-05-15T10:00:00.000Z'),
      publishedBy: 'user-1',
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdBy: 'user-1',
    });

    const projection = await service.getPublishedHomepageProjectionOrThrow('tokino-sora');

    expect(projection.portalId).toBe('portal-1');
    expect(projection.documentVersionId).toBe('live-1');
    expect(projection.route).toMatchObject({
      canonicalPath: '/p/tokino-sora',
      legacyPath: 'tokino-sora',
      talentCode: 'sora',
    });
    expect(projection.metadata.title).toBe('Project S');
    expect(projection.metadata.ogImage).toBeNull();
    expect(service.toPublicProjection(projection)).not.toHaveProperty('documentVersionId');
  });

  it('builds draft preview projections for the Studio route with optional phase overrides', async () => {
    const {
      service,
      homepageAdminRepository,
      publicPresenceFoundationRepository,
    } = createService();

    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      id: 'talent-1',
      code: 'sora',
      displayName: 'Tokino Sora',
      avatarUrl: 'https://cdn.example.com/sora.png',
      homepagePath: 'tokino-sora',
      customDomain: null,
      customDomainVerified: false,
      timezone: 'Asia/Tokyo',
    });
    vi.mocked(homepageAdminRepository.findTenantCodeBySchema).mockResolvedValue(
      'tenant-a',
    );
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'draft-1',
      liveVersionId: 'live-1',
      latestVersionNumber: 3,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdAt: new Date('2026-05-15T08:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      version: 1,
    });
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue({
      id: 'draft-1',
      portalId: 'portal-1',
      versionNumber: 3,
      documentSchemaVersion: '1.0',
      templateId: 'debutReveal',
      document: liveDocument as unknown as Record<string, unknown>,
      documentState: 'draft',
      contentHashAlgorithm: 'sha256',
      contentHash: 'draft-hash',
      lastValidationSnapshotId: 'snapshot-2',
      scheduledFor: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdBy: 'user-1',
    });

    const projection = await service.getDraftPreviewProjectionOrThrow(
      'talent-1',
      'tenant_alpha',
      'revealed',
    );

    expect(projection.route).toMatchObject({
      canonicalPath: '/tenant-a/sora/homepage',
      legacyPath: 'tokino-sora',
      tenantCode: 'tenant-a',
      talentCode: 'sora',
    });
    expect(projection.resolvedRevealPhase).toBe('revealed');
    expect(projection.metadata.title).toBe('Sora reveal');
  });

  it('uses the talent display name when an existing debut draft still stores raw internal identity copy', async () => {
    const {
      service,
      homepageAdminRepository,
      publicPresenceFoundationRepository,
    } = createService();

    vi.mocked(homepageAdminRepository.findTalentById).mockResolvedValue({
      id: 'talent-1',
      code: 'talent_sakura',
      displayName: 'Sakura Ch.',
      avatarUrl: 'https://cdn.example.com/sakura.png',
      homepagePath: 'sakura-home',
      customDomain: null,
      customDomainVerified: false,
      timezone: 'Asia/Tokyo',
    });
    vi.mocked(homepageAdminRepository.findTenantCodeBySchema).mockResolvedValue(
      'tenant-a',
    );
    vi.mocked(publicPresenceFoundationRepository.findPortalByTalentId).mockResolvedValue({
      id: 'portal-1',
      talentId: 'talent-1',
      draftVersionId: 'draft-raw',
      liveVersionId: null,
      latestVersionNumber: 15,
      latestValidationState: 'validEditable',
      lastValidatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdAt: new Date('2026-05-15T08:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      version: 1,
    });
    vi.mocked(publicPresenceFoundationRepository.findDocumentVersionById).mockResolvedValue({
      id: 'draft-raw',
      portalId: 'portal-1',
      versionNumber: 15,
      documentSchemaVersion: '1.0',
      templateId: 'debutReveal',
      document: {
        schemaVersion: '1.0',
        templateId: 'debutReveal',
        metadata: {
          title: 'TALENT_SAKURA',
        },
        sections: [
          {
            id: 'firstEncounter-1',
            kind: 'firstEncounter',
            fields: {
              headline: { provenance: 'publicPresence', value: 'TALENT_SAKURA debut campaign' },
              displayName: { provenance: 'publicPresence', value: 'TALENT_SAKURA' },
            },
            phaseVisibility: 'always',
          },
          {
            id: 'countdownReveal-2',
            kind: 'countdownReveal',
            fields: {
              phase: { provenance: 'publicPresence', value: 'teaser' },
              timezone: { provenance: 'publicPresence', value: 'UTC' },
            },
            phaseVisibility: 'teaser',
          },
        ],
      } as unknown as Record<string, unknown>,
      documentState: 'draft',
      contentHashAlgorithm: 'sha256',
      contentHash: 'draft-raw-hash',
      lastValidationSnapshotId: 'snapshot-raw',
      scheduledFor: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      updatedAt: new Date('2026-05-15T10:00:00.000Z'),
      createdBy: 'user-1',
    });

    const projection = await service.getDraftPreviewProjectionOrThrow(
      'talent-1',
      'tenant_alpha',
      'teaser',
    );

    expect(projection.metadata.title).toBe('Sakura Ch.');
    expect(projection.sections[0]).toMatchObject({
      sectionType: 'hero',
      title: 'Sakura Ch.',
      description: 'Countdown updates, reveal moments, and launch links for fans.',
      timezone: null,
    });
    expect(JSON.stringify(projection)).not.toContain('TALENT_SAKURA');
  });
});
