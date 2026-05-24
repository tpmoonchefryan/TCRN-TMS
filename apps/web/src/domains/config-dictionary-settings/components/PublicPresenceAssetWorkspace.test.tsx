import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicPresenceAssetWorkspace } from '@/domains/config-dictionary-settings/components/PublicPresenceAssetWorkspace';

const request = vi.fn();

function localizedText(en: string) {
  return {
    en,
    fr: en,
    ja: en,
    ko: en,
    zh_HANS: en,
    zh_HANT: en,
  };
}

function buildTemplateAssetEntry(overrides: Record<string, unknown> = {}) {
  return {
    asset: {
      assetKind: 'template',
      code: 'active-talent-hub',
      componentType: null,
      createdAt: '2026-05-23T01:00:00.000Z',
      currentRevisionId: 'revision-template-1',
      description: localizedText('Always-on homepage layout for active talent operations.'),
      id: 'asset-template-1',
      isSystem: true,
      name: localizedText('Active Talent Hub'),
      ownerId: null,
      ownerType: 'system',
      status: 'active',
      templateId: 'activeTalentHub',
      updatedAt: '2026-05-23T01:05:00.000Z',
      version: 1,
      ...overrides,
    },
    canEdit: false,
    currentRevision: {
      artifactStatus: 'active',
      assetId: 'asset-template-1',
      createdAt: '2026-05-23T01:05:00.000Z',
      createdBy: 'system',
      id: 'revision-template-1',
      lastValidatedAt: '2026-05-23T01:05:00.000Z',
      manifest: {
        assetKind: 'template',
        defaultSectionOrder: ['firstEncounter', 'officialChannels'],
        label: 'Active Talent Hub',
        lockedSections: [],
        optionalSections: ['fanActions'],
        ownerId: null,
        ownerType: 'system',
        personaKitFields: ['campaignLabel'],
        policyReferences: ['artistLifecycleFlow'],
        recommendedSections: ['fanActions'],
        requiredSections: ['firstEncounter', 'officialChannels'],
        runtimeContractVersion: '2026.05',
        templateId: 'activeTalentHub',
        useCase: 'Always-on official public presence for an active talent.',
        validationRules: ['requiresOfficialChannels'],
      },
      revisionNumber: 1,
      runtimeContractVersion: '2026.05',
      sourceBundle: [
        {
          contents: 'export function ActiveTalentHubTemplate() { return null; }',
          kind: 'code',
          language: 'typescript',
          path: 'src/template.tsx',
        },
      ],
      sourceHash: 'templatehash001',
      submittedAt: null,
      validationState: 'ready',
      validationSummary: {
        issueCount: 0,
        passCount: 4,
        warnCount: 0,
      },
    },
    isInherited: true,
    scope: {
      scopeId: null,
      scopeType: 'tenant',
    },
  };
}

function buildEditableTemplateAssetEntry(overrides: Record<string, unknown> = {}) {
  const asset = buildTemplateAssetEntry({
    code: 'active-talent-hub-local',
    id: 'asset-template-local',
    isSystem: false,
    name: localizedText('Active Talent Hub Local'),
    ownerType: 'tenant',
    updatedAt: '2026-05-23T01:20:00.000Z',
    version: 2,
    ...overrides,
  });

  return {
    ...asset,
    canEdit: true,
    currentRevision: {
      ...asset.currentRevision,
      assetId: 'asset-template-local',
      id: 'revision-template-local',
      revisionNumber: 2,
      sourceHash: 'templatehash002',
    },
    isInherited: false,
  };
}

function buildComponentAssetEntry(overrides: Record<string, unknown> = {}) {
  return {
    asset: {
      assetKind: 'component',
      code: 'social-links-local',
      componentType: 'SocialLinks',
      createdAt: '2026-05-23T01:00:00.000Z',
      currentRevisionId: 'revision-component-1',
      description: localizedText('Trusted official channel cluster.'),
      id: 'asset-component-1',
      isSystem: false,
      name: localizedText('Social Links Local'),
      ownerId: null,
      ownerType: 'tenant',
      status: 'draft',
      templateId: null,
      updatedAt: '2026-05-23T01:05:00.000Z',
      version: 1,
      ...overrides,
    },
    canEdit: true,
    currentRevision: {
      artifactStatus: 'draft',
      assetId: 'asset-component-1',
      createdAt: '2026-05-23T01:05:00.000Z',
      createdBy: 'user-1',
      id: 'revision-component-1',
      lastValidatedAt: null,
      manifest: {
        assetKind: 'component',
        componentType: 'SocialLinks',
        defaultProps: {},
        fieldKeys: ['items'],
        ownerId: null,
        ownerType: 'tenant',
        projectionMode: 'singleBlock',
        rendererSupport: true,
        runtimeContractVersion: '2026.05',
        visualSupport: 'full',
      },
      revisionNumber: 1,
      runtimeContractVersion: '2026.05',
      sourceBundle: [
        {
          contents: 'export const SocialLinksComponent = () => null;',
          kind: 'code',
          language: 'typescript',
          path: 'src/component.tsx',
        },
      ],
      sourceHash: 'componenthash001',
      submittedAt: null,
      validationState: 'unvalidated',
      validationSummary: {
        issueCount: 0,
        passCount: 0,
        warnCount: 0,
      },
    },
    isInherited: false,
    scope: {
      scopeId: null,
      scopeType: 'tenant',
    },
  };
}

describe('PublicPresenceAssetWorkspace', () => {
  beforeEach(() => {
    request.mockReset();
  });

  it('keeps system template assets read-only and duplicates them into the current scope', async () => {
    const templateAssets = [buildTemplateAssetEntry(), buildEditableTemplateAssetEntry()];

    request.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/public-presence/assets?assetKind=template&scopeType=tenant') {
        return templateAssets;
      }

      if (path === '/api/v1/public-presence/assets?assetKind=component&scopeType=tenant') {
        return [];
      }

      if (
        path === '/api/v1/public-presence/assets/asset-template-1/duplicate?scopeType=tenant' &&
        init?.method === 'POST'
      ) {
        const duplicated = buildEditableTemplateAssetEntry({
          code: 'active-talent-hub-copy',
          id: 'asset-template-copy',
          name: localizedText('Active Talent Hub Copy'),
        });
        templateAssets.push(duplicated);
        return {
          ...duplicated,
          revisions: [duplicated.currentRevision],
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <PublicPresenceAssetWorkspace
        locale="en"
        request={request}
        scopeType="tenant"
        tenantId="tenant-1"
      />
    );

    const [systemRow] = await screen.findAllByText('Active Talent Hub');
    const systemCard = systemRow.closest('div.rounded-3xl');
    expect(systemCard).not.toBeNull();
    expect(
      within(systemCard as HTMLElement).queryByRole('link', { name: 'Edit template' })
    ).not.toBeInTheDocument();
    expect(within(systemCard as HTMLElement).getByText('System')).toBeInTheDocument();

    fireEvent.click(
      within(systemCard as HTMLElement).getByRole('button', { name: 'Duplicate here' })
    );

    await waitFor(() => {
      expect(
        screen.getByText('An editable copy was created in the current scope.')
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Edit duplicated template' })).toHaveAttribute(
        'href',
        '/studio/public-presence/tenant-1/assets/template/asset-template-copy?scopeType=tenant'
      );
    });
  });

  it('opens inspect and create drawers for component assets in the current scope', async () => {
    request.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/public-presence/assets?assetKind=template&scopeType=tenant') {
        return [];
      }

      if (path === '/api/v1/public-presence/assets?assetKind=component&scopeType=tenant') {
        return [buildComponentAssetEntry()];
      }

      if (path === '/api/v1/public-presence/assets/asset-component-1?scopeType=tenant') {
        const asset = buildComponentAssetEntry();
        return {
          ...asset,
          revisions: [asset.currentRevision],
        };
      }

      if (path === '/api/v1/public-presence/assets?scopeType=tenant' && init?.method === 'POST') {
        return {
          ...buildComponentAssetEntry({
            code: 'video-embed-local',
            componentType: 'VideoEmbed',
            id: 'asset-component-2',
            name: localizedText('Video Embed Local'),
          }),
          revisions: [],
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <PublicPresenceAssetWorkspace
        locale="en"
        request={request}
        scopeType="tenant"
        tenantId="tenant-1"
      />
    );

    const componentRow = await screen.findByText('Social Links Local');
    const componentCard = componentRow.closest('div.rounded-3xl');
    expect(componentCard).not.toBeNull();

    fireEvent.click(within(componentCard as HTMLElement).getByRole('button', { name: 'Inspect' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Asset inspect' })).toBeInTheDocument();
      expect(screen.getByText('Revision history')).toBeInTheDocument();
      expect(screen.getByText(/componenthas/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add component asset' }));
    const drawer = await screen.findByRole('dialog', { name: 'Add homepage component asset' });
    expect(within(drawer).getByRole('combobox')).toBeInTheDocument();

    fireEvent.change(within(drawer).getByRole('combobox'), {
      target: {
        value: 'VideoEmbed',
      },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: /Create component asset/i }));

    await waitFor(() => {
      expect(screen.getByText('Component asset created for this scope.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Open component IDE' })).toHaveAttribute(
        'href',
        '/studio/public-presence/tenant-1/assets/component/asset-component-2?scopeType=tenant'
      );
    });
  });
});
