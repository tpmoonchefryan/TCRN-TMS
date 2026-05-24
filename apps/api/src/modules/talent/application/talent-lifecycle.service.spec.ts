// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocalizedText } from '@tcrn/shared';

import type { CustomerArchiveAccessService } from '../../customer/application/customer-archive-access.service';
import { TalentLifecycleRepository } from '../infrastructure/talent-lifecycle.repository';
import { TalentLifecycleService } from './talent-lifecycle.service';
import { TalentReadService } from './talent-read.service';

describe('TalentLifecycleService', () => {
  const stageDraftId = '550e8400-e29b-41d4-a716-446655440210';
  const stagePublishedId = '550e8400-e29b-41d4-a716-446655440211';
  const stageDisabledId = '550e8400-e29b-41d4-a716-446655440212';
  const stagePublishedAltId = '550e8400-e29b-41d4-a716-446655440213';

  const mockReadService = {
    findById: vi.fn(),
    getExternalPagesDomainConfig: vi.fn(),
  } as unknown as TalentReadService;

  const mockRepository = {
    listArtistStages: vi.fn(),
    readArtistLifecycleFlow: vi.fn(),
    transitionToStage: vi.fn(),
  } as unknown as TalentLifecycleRepository;

  const mockCustomerArchiveAccessService = {
    getTalentArchiveReadiness: vi.fn(),
  } as unknown as CustomerArchiveAccessService;

  const service = new TalentLifecycleService(
    mockReadService,
    mockCustomerArchiveAccessService,
    mockRepository
  );

  const draftTalent = {
    id: 'talent-123',
    code: 'SORA',
    artistStageId: stageDraftId,
    profileStoreId: 'store-123',
    lifecycleStatus: 'draft' as const,
    avatarUrl: 'https://example.com/avatar.png',
    description: createLocalizedText({ en: 'Hello' }),
    version: 1,
  };

  const artistStages = [
    {
      id: stageDraftId,
      code: 'PRE_DEBUT',
      isActive: true,
      lifecycleStatusMapping: 'draft' as const,
    },
    {
      id: stagePublishedId,
      code: 'ACTIVE',
      isActive: true,
      lifecycleStatusMapping: 'published' as const,
    },
    {
      id: stageDisabledId,
      code: 'SUSPENDED',
      isActive: true,
      lifecycleStatusMapping: 'disabled' as const,
    },
    {
      id: stagePublishedAltId,
      code: 'LIVE_EVENT',
      isActive: true,
      lifecycleStatusMapping: 'published' as const,
    },
  ];

  const artistLifecycleFlow = {
    homepagePolicyByStage: [],
    nodes: artistStages.map((stage) => ({
      stageId: stage.id,
      stageCode: stage.code,
    })),
    transitions: [
      {
        id: 'transition-draft-published',
        fromStageId: stageDraftId,
        toStageId: stagePublishedId,
        label: 'Activate',
        reason: null,
      },
      {
        id: 'transition-published-disabled',
        fromStageId: stagePublishedId,
        toStageId: stageDisabledId,
        label: 'Disable',
        reason: null,
      },
      {
        id: 'transition-published-draft',
        fromStageId: stagePublishedId,
        toStageId: stageDraftId,
        label: 'Return to draft',
        reason: null,
      },
      {
        id: 'transition-disabled-published',
        fromStageId: stageDisabledId,
        toStageId: stagePublishedId,
        label: 'Re-enable',
        reason: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds publish readiness and blocks when the profile store is inactive', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue(draftTalent as never);
    vi.mocked(mockReadService.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: null,
      marshmallow: null,
    });
    vi.mocked(mockCustomerArchiveAccessService.getTalentArchiveReadiness).mockResolvedValue({
      talentId: 'talent-123',
      hasArchiveTarget: false,
      hasActiveArchiveTarget: false,
    });

    await expect(service.getPublishReadiness('talent-123', 'tenant_test')).resolves.toMatchObject({
      canEnterPublishedState: false,
      blockers: [expect.objectContaining({ code: 'PROFILE_STORE_REQUIRED' })],
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'HOMEPAGE_NOT_PUBLISHED' }),
        expect.objectContaining({ code: 'MARSHMALLOW_NOT_ENABLED' }),
      ]),
    });
  });

  it('publishes a draft talent when readiness is clear', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue(draftTalent as never);
    vi.mocked(mockReadService.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: { isPublished: true },
      marshmallow: { isEnabled: true },
    } as never);
    vi.mocked(mockCustomerArchiveAccessService.getTalentArchiveReadiness).mockResolvedValue({
      talentId: 'talent-123',
      hasArchiveTarget: true,
      hasActiveArchiveTarget: true,
    });
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(
      artistLifecycleFlow as never
    );
    vi.mocked(mockRepository.transitionToStage).mockResolvedValue({
      ...draftTalent,
      artistStageId: stagePublishedId,
      lifecycleStatus: 'published',
      isActive: true,
      publishedBy: 'user-1',
      version: 2,
    } as never);

    await expect(service.publish('talent-123', 'tenant_test', 1, 'user-1')).resolves.toMatchObject({
      lifecycleStatus: 'published',
      version: 2,
    });
  });

  it('fails closed when publishing a talent outside draft state', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      artistStageId: stagePublishedId,
      lifecycleStatus: 'published',
      isActive: true,
    } as never);
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(
      artistLifecycleFlow as never
    );

    await expect(service.publish('talent-123', 'tenant_test', 1, 'user-1')).rejects.toThrow(
      ConflictException
    );
  });

  it('disables a published talent', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      artistStageId: stagePublishedId,
      lifecycleStatus: 'published',
      isActive: true,
    } as never);
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(
      artistLifecycleFlow as never
    );
    vi.mocked(mockRepository.transitionToStage).mockResolvedValue({
      ...draftTalent,
      artistStageId: stageDisabledId,
      lifecycleStatus: 'disabled',
      isActive: false,
      version: 2,
    } as never);

    await expect(service.disable('talent-123', 'tenant_test', 1, 'user-1')).resolves.toMatchObject({
      lifecycleStatus: 'disabled',
      version: 2,
    });
  });

  it('re-enables a disabled talent when readiness is clear', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      artistStageId: stageDisabledId,
      lifecycleStatus: 'disabled',
      isActive: false,
    } as never);
    vi.mocked(mockReadService.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: { isPublished: true },
      marshmallow: { isEnabled: true },
    } as never);
    vi.mocked(mockCustomerArchiveAccessService.getTalentArchiveReadiness).mockResolvedValue({
      talentId: 'talent-123',
      hasArchiveTarget: true,
      hasActiveArchiveTarget: true,
    });
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(
      artistLifecycleFlow as never
    );
    vi.mocked(mockRepository.transitionToStage).mockResolvedValue({
      ...draftTalent,
      artistStageId: stagePublishedId,
      lifecycleStatus: 'published',
      isActive: true,
      version: 2,
    } as never);

    await expect(service.reEnable('talent-123', 'tenant_test', 1, 'user-1')).resolves.toMatchObject(
      {
        lifecycleStatus: 'published',
        version: 2,
      }
    );
  });

  it('supports an explicit published-to-draft stage return when the flow allows it', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      artistStageId: stagePublishedId,
      lifecycleStatus: 'published',
      isActive: true,
    } as never);
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(
      artistLifecycleFlow as never
    );
    vi.mocked(mockRepository.transitionToStage).mockResolvedValue({
      ...draftTalent,
      artistStageId: stageDraftId,
      lifecycleStatus: 'draft',
      isActive: false,
      version: 2,
    } as never);

    await expect(
      service.transitionArtistStage(
        'talent-123',
        'tenant_test',
        {
          version: 1,
          targetArtistStageId: stageDraftId,
        },
        'user-1'
      )
    ).resolves.toMatchObject({
      artistStageId: stageDraftId,
      lifecycleStatus: 'draft',
      version: 2,
    });
  });

  it('supports an explicit transition-id stage return when the flow allows it', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      artistStageId: stagePublishedId,
      lifecycleStatus: 'published',
      isActive: true,
    } as never);
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(
      artistLifecycleFlow as never
    );
    vi.mocked(mockRepository.transitionToStage).mockResolvedValue({
      ...draftTalent,
      artistStageId: stageDraftId,
      lifecycleStatus: 'draft',
      isActive: false,
      version: 2,
    } as never);

    await expect(
      service.transitionArtistStage(
        'talent-123',
        'tenant_test',
        {
          version: 1,
          transitionId: 'transition-published-draft',
        },
        'user-1'
      )
    ).resolves.toMatchObject({
      artistStageId: stageDraftId,
      lifecycleStatus: 'draft',
      version: 2,
    });
  });

  it('rejects an explicit stage transition that is not allowed by the configured flow', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue(draftTalent as never);
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(
      artistLifecycleFlow as never
    );

    await expect(
      service.transitionArtistStage(
        'talent-123',
        'tenant_test',
        {
          version: 1,
          targetArtistStageId: stageDisabledId,
        },
        'user-1'
      )
    ).rejects.toThrow(ConflictException);
  });

  it('requires exactly one explicit stage transition selector', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue(draftTalent as never);
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(
      artistLifecycleFlow as never
    );

    await expect(
      service.transitionArtistStage(
        'talent-123',
        'tenant_test',
        {
          version: 1,
        },
        'user-1'
      )
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.transitionArtistStage(
        'talent-123',
        'tenant_test',
        {
          version: 1,
          targetArtistStageId: stagePublishedId,
          transitionId: 'transition-draft-published',
        },
        'user-1'
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('forces legacy published-state wrappers to fail on ambiguity while explicit stage selection still succeeds', async () => {
    const ambiguousFlow = {
      ...artistLifecycleFlow,
      transitions: [
        ...artistLifecycleFlow.transitions,
        {
          id: 'transition-disabled-live-event',
          fromStageId: stageDisabledId,
          toStageId: stagePublishedAltId,
          label: 'Promote to live event',
          reason: null,
        },
      ],
    };

    vi.mocked(mockReadService.findById).mockResolvedValue({
      ...draftTalent,
      artistStageId: stageDisabledId,
      lifecycleStatus: 'disabled',
      isActive: false,
    } as never);
    vi.mocked(mockRepository.listArtistStages).mockResolvedValue(artistStages as never);
    vi.mocked(mockRepository.readArtistLifecycleFlow).mockResolvedValue(ambiguousFlow as never);

    await expect(service.reEnable('talent-123', 'tenant_test', 1, 'user-1')).rejects.toThrow(
      ConflictException
    );

    vi.mocked(mockReadService.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: { isPublished: true },
      marshmallow: { isEnabled: true },
    } as never);
    vi.mocked(mockCustomerArchiveAccessService.getTalentArchiveReadiness).mockResolvedValue({
      talentId: 'talent-123',
      hasArchiveTarget: true,
      hasActiveArchiveTarget: true,
    });
    vi.mocked(mockRepository.transitionToStage).mockResolvedValue({
      ...draftTalent,
      artistStageId: stagePublishedAltId,
      lifecycleStatus: 'published',
      isActive: true,
      version: 2,
    } as never);

    await expect(
      service.transitionArtistStage(
        'talent-123',
        'tenant_test',
        {
          version: 1,
          targetArtistStageId: stagePublishedAltId,
        },
        'user-1'
      )
    ).resolves.toMatchObject({
      artistStageId: stagePublishedAltId,
      lifecycleStatus: 'published',
      version: 2,
    });
  });

  it('keeps move retired from normal product flow', async () => {
    await expect(service.move('talent-123', 'tenant_test', 'sub-2', 1, 'user-1')).rejects.toThrow(
      ConflictException
    );
  });

  it('fails closed when the talent does not exist', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue(null);

    await expect(service.getPublishReadiness('missing', 'tenant_test')).rejects.toThrow(
      NotFoundException
    );
  });
});
