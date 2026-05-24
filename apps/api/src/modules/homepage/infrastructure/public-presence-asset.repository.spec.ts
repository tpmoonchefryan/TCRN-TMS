import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildPublicPresenceTemplateAssetManifest,
  getPublicPresenceTemplateSeedText,
} from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { PublicPresenceAssetRepository } from './public-presence-asset.repository';

describe('PublicPresenceAssetRepository', () => {
  let queryRawUnsafe: ReturnType<typeof vi.fn>;
  let transactionQueryRawUnsafe: ReturnType<typeof vi.fn>;
  let transaction: ReturnType<typeof vi.fn>;
  let repository: PublicPresenceAssetRepository;

  beforeEach(() => {
    queryRawUnsafe = vi.fn();
    transactionQueryRawUnsafe = vi.fn();
    transaction = vi.fn(
      async (
        operation: (prisma: {
          $queryRawUnsafe: typeof transactionQueryRawUnsafe;
        }) => Promise<unknown>
      ) =>
        operation({
          $queryRawUnsafe: transactionQueryRawUnsafe,
        })
    );
    repository = new PublicPresenceAssetRepository({
      getPrisma: () => ({
        $queryRawUnsafe: queryRawUnsafe,
        $transaction: transaction,
      }),
    } as unknown as DatabaseService);
  });

  it('returns the default tenant visibility chain when scopeType is tenant', async () => {
    await expect(repository.resolveScopeChain('tenant_test', 'tenant', null)).resolves.toEqual([
      { ownerType: 'system', ownerId: null },
      { ownerType: 'tenant', ownerId: null },
    ]);
    expect(queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('resolves subsidiary ancestors before the current subsidiary scope', async () => {
    queryRawUnsafe
      .mockResolvedValueOnce([{ id: 'sub-2', path: '/root/sub-2' }])
      .mockResolvedValueOnce([{ id: 'sub-1' }]);

    await expect(
      repository.resolveScopeChain('tenant_test', 'subsidiary', 'sub-2')
    ).resolves.toEqual([
      { ownerType: 'system', ownerId: null },
      { ownerType: 'tenant', ownerId: null },
      { ownerType: 'subsidiary', ownerId: 'sub-1' },
      { ownerType: 'subsidiary', ownerId: 'sub-2' },
    ]);
  });

  it('skips current revisions lookup when no asset ids are requested', async () => {
    await expect(repository.listCurrentRevisionsByAssetIds('tenant_test', [])).resolves.toEqual([]);
    expect(queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('qualifies revision columns when listing current revisions through the asset join', async () => {
    queryRawUnsafe.mockResolvedValueOnce([]);

    await repository.listCurrentRevisionsByAssetIds('tenant_test', ['asset-1']);

    const sql = String(queryRawUnsafe.mock.calls[0][0]);

    expect(sql).toContain('r.id as "id"');
    expect(sql).toContain('r.created_at as "createdAt"');
    expect(sql).toContain('r.validation_summary as "validationSummary"');
    expect(sql).not.toContain('\n  id,\n');
  });

  it('qualifies revision columns when reading one current revision through the asset join', async () => {
    queryRawUnsafe.mockResolvedValueOnce([]);

    await repository.findCurrentRevision('tenant_test', 'asset-1');

    const sql = String(queryRawUnsafe.mock.calls[0][0]);

    expect(sql).toContain('r.id as "id"');
    expect(sql).toContain('WHERE a.id = $1::uuid');
    expect(sql).not.toContain('\n  id,\n');
  });

  it('assigns current_revision_id when creating and activating a new revision', async () => {
    queryRawUnsafe.mockResolvedValueOnce([]);
    const seedText = getPublicPresenceTemplateSeedText('activeTalentHub');

    await repository.createRevisionAndAssignCurrent('tenant_test', {
      actorId: '11111111-1111-4111-8111-111111111111',
      artifactStatus: 'active',
      assetId: '11111111-1111-4111-8111-111111111112',
      description: seedText.description,
      manifest: buildPublicPresenceTemplateAssetManifest('activeTalentHub', {
        assetCode: 'activetalenthub',
        assetId: '11111111-1111-4111-8111-111111111112',
        description: seedText.description,
        name: seedText.name,
        ownerId: null,
        ownerType: 'system',
      }),
      name: seedText.name,
      sourceBundle: [
        {
          contents: '{"templateId":"activeTalentHub"}',
          kind: 'schema',
          language: 'json',
          path: 'manifest.json',
        },
      ],
      sourceHash: 'a'.repeat(64),
      status: 'active',
      validationState: 'ready',
      validationSummary: {
        issueCount: 0,
        passCount: 4,
        warnCount: 0,
      },
    });

    const sql = String(queryRawUnsafe.mock.calls[0][0]);

    expect(sql).toContain('current_revision_id = (SELECT id FROM inserted_revision)');
    expect(sql).toContain('version = version + 1');
    expect(sql).toContain('WHERE id = $1::uuid');
  });

  it('creates a new asset inside a transaction and assigns the created current revision', async () => {
    const seedText = getPublicPresenceTemplateSeedText('activeTalentHub');
    const assetId = '11111111-1111-4111-8111-111111111113';
    const revisionId = '11111111-1111-4111-8111-111111111114';
    transactionQueryRawUnsafe
      .mockResolvedValueOnce([{ id: assetId }])
      .mockResolvedValueOnce([{ id: revisionId }])
      .mockResolvedValueOnce([
        {
          assetKind: 'template',
          code: 'activetalenthub-copy',
          componentType: null,
          createdAt: new Date('2026-05-24T00:00:00.000Z'),
          currentRevisionId: revisionId,
          description: seedText.description,
          id: assetId,
          isSystem: false,
          name: seedText.name,
          ownerId: null,
          ownerType: 'tenant',
          status: 'draft',
          templateId: 'activeTalentHub',
          updatedAt: new Date('2026-05-24T00:01:00.000Z'),
          version: 1,
        },
      ]);

    const result = await repository.createAssetWithCurrentRevision('tenant_test', {
      actorId: '11111111-1111-4111-8111-111111111111',
      artifactStatus: 'draft',
      assetKind: 'template',
      code: 'activetalenthub-copy',
      componentType: null,
      description: seedText.description,
      manifest: buildPublicPresenceTemplateAssetManifest('activeTalentHub', {
        assetCode: 'activetalenthub-copy',
        description: seedText.description,
        name: seedText.name,
        ownerId: null,
        ownerType: 'tenant',
      }),
      name: seedText.name,
      ownerId: null,
      ownerType: 'tenant',
      sourceBundle: [
        {
          contents: '{"templateId":"activeTalentHub"}',
          kind: 'schema',
          language: 'json',
          path: 'manifest.json',
        },
      ],
      sourceHash: 'b'.repeat(64),
      status: 'draft',
      templateId: 'activeTalentHub',
      validationState: 'unvalidated',
      validationSummary: {
        issueCount: 0,
        passCount: 0,
        warnCount: 0,
      },
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionQueryRawUnsafe).toHaveBeenCalledTimes(3);
    expect(String(transactionQueryRawUnsafe.mock.calls[2][0])).toContain(
      'current_revision_id = $2::uuid'
    );
    expect(transactionQueryRawUnsafe.mock.calls[2][1]).toBe(assetId);
    expect(transactionQueryRawUnsafe.mock.calls[2][2]).toBe(revisionId);
    expect(result.currentRevisionId).toBe(revisionId);
  });

  it('throws when the created asset cannot be updated with its current revision', async () => {
    const seedText = getPublicPresenceTemplateSeedText('activeTalentHub');
    transactionQueryRawUnsafe
      .mockResolvedValueOnce([{ id: '11111111-1111-4111-8111-111111111113' }])
      .mockResolvedValueOnce([{ id: '11111111-1111-4111-8111-111111111114' }])
      .mockResolvedValueOnce([]);

    await expect(
      repository.createAssetWithCurrentRevision('tenant_test', {
        actorId: '11111111-1111-4111-8111-111111111111',
        artifactStatus: 'draft',
        assetKind: 'template',
        code: 'activetalenthub-copy',
        componentType: null,
        description: seedText.description,
        manifest: buildPublicPresenceTemplateAssetManifest('activeTalentHub', {
          assetCode: 'activetalenthub-copy',
          description: seedText.description,
          name: seedText.name,
          ownerId: null,
          ownerType: 'tenant',
        }),
        name: seedText.name,
        ownerId: null,
        ownerType: 'tenant',
        sourceBundle: [
          {
            contents: '{"templateId":"activeTalentHub"}',
            kind: 'schema',
            language: 'json',
            path: 'manifest.json',
          },
        ],
        sourceHash: 'b'.repeat(64),
        status: 'draft',
        templateId: 'activeTalentHub',
        validationState: 'unvalidated',
        validationSummary: {
          issueCount: 0,
          passCount: 0,
          warnCount: 0,
        },
      })
    ).rejects.toThrow('Created asset could not be updated with its current revision.');
  });
});
