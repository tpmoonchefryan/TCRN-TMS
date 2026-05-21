import type { RequestContext } from '@tcrn/shared';
import { describe, expect, it, vi } from 'vitest';

import { PublicPresenceAuthoringService } from './public-presence-authoring.service';

const context: RequestContext = {
  tenantId: 'tenant-1',
  tenantSchema: 'tenant_test',
  userId: 'reviewer-1',
  userName: 'reviewer',
};

describe('PublicPresenceAuthoringService', () => {
  function createService() {
    const publicPresenceAuthoringRepository = {
      findBySubject: vi.fn().mockResolvedValue(null),
      listByKind: vi.fn().mockResolvedValue([]),
      upsertDraft: vi.fn().mockImplementation(async (_tenantSchema: string, input: Record<string, unknown>) => ({
        artifactKind: input.artifactKind,
        artifactStatus: input.artifactStatus,
        createdAt: new Date('2026-05-21T01:00:00.000Z'),
        id: 'draft-1',
        lastSavedAt: new Date('2026-05-21T01:05:00.000Z'),
        lastValidatedAt: input.lastValidatedAt ?? null,
        sourceBundle: input.sourceBundle,
        subjectKey: input.subjectKey,
        submittedAt: input.submittedAt ?? null,
        talentId: input.talentId,
        updatedAt: new Date('2026-05-21T01:05:00.000Z'),
        validationState: input.validationState,
        validationSummary: input.validationSummary,
        version: 1,
      })),
    };

    return {
      publicPresenceAuthoringRepository,
      service: new PublicPresenceAuthoringService(
        publicPresenceAuthoringRepository as never,
      ),
    };
  }

  it('saves a durable draft with a normalized default subject key', async () => {
    const { service, publicPresenceAuthoringRepository } = createService();

    const result = await service.saveDraft('template', 'talent-1', context, {
      sourceBundle: [
        {
          contents: 'export const template = true;\n',
          kind: 'code',
          language: 'typescript',
          path: 'src/template.tsx',
        },
      ],
    });

    expect(publicPresenceAuthoringRepository.upsertDraft).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        artifactKind: 'template',
        artifactStatus: 'draft',
        subjectKey: 'new',
        validationState: 'unvalidated',
      }),
    );
    expect(result.subjectKey).toBe('new');
    expect(result.sourceBundle[0]?.path).toBe('src/template.tsx');
  });

  it('stores validation state and submission timestamps for submitted drafts', async () => {
    const { service, publicPresenceAuthoringRepository } = createService();

    const result = await service.submitDraft('component', 'talent-1', context, {
      sourceBundle: [
        {
          contents: 'export const component = true;\n',
          kind: 'code',
          language: 'typescript',
          path: 'src/component.tsx',
        },
      ],
      subjectKey: 'SocialLinks',
      validationSummary: {
        issueCount: 1,
        passCount: 3,
        warnCount: 1,
      },
    });

    expect(publicPresenceAuthoringRepository.upsertDraft).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        artifactKind: 'component',
        artifactStatus: 'submitted',
        subjectKey: 'SocialLinks',
        validationState: 'warning',
      }),
    );
    expect(result.artifactStatus).toBe('submitted');
    expect(result.submittedAt).not.toBeNull();
    expect(result.validationSummary.warnCount).toBe(1);
  });
});
