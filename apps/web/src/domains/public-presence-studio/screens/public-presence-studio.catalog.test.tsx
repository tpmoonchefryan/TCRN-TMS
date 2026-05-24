import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LegacyComponentStoreCompatibilityScreen,
  LegacyTemplateCenterCompatibilityScreen,
} from '@/domains/public-presence-studio/screens/public-presence-studio.catalog';

const mockRequest = vi.fn();

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useUiLocale: () => ({
    locale: 'en',
  }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
  }),
}));

function localizedText(value: string) {
  return {
    en: value,
    fr: value,
    ja: value,
    ko: value,
    zh_HANS: value,
    zh_HANT: value,
  };
}

function buildTemplateAssetEntry() {
  return {
    asset: {
      assetKind: 'template',
      code: 'active-talent-hub-local',
      componentType: null,
      createdAt: '2026-05-23T01:00:00.000Z',
      currentRevisionId: 'revision-template-1',
      description: localizedText('Talent-scoped homepage layout'),
      id: 'asset-template-1',
      isSystem: false,
      name: localizedText('Active Talent Hub Local'),
      ownerId: 'talent-1',
      ownerType: 'talent',
      status: 'active',
      templateId: 'activeTalentHub',
      updatedAt: '2026-05-23T01:10:00.000Z',
      version: 1,
    },
    canEdit: true,
    currentRevision: {
      artifactStatus: 'active',
      assetId: 'asset-template-1',
      createdAt: '2026-05-23T01:10:00.000Z',
      createdBy: 'user-1',
      id: 'revision-template-1',
      lastValidatedAt: '2026-05-23T01:12:00.000Z',
      manifest: {
        assetKind: 'template',
        defaultSectionOrder: ['firstEncounter', 'officialChannels', 'fanActions'],
        label: 'Active Talent Hub Local',
        lockedSections: [],
        name: localizedText('Active Talent Hub Local'),
        optionalSections: ['fanActions'],
        personaKitFields: ['campaignLabel', 'tagline'],
        policyReferences: ['artistLifecycleFlow'],
        recommendedSections: ['fanActions'],
        requiredSections: ['firstEncounter'],
        runtimeContractVersion: '1.0.0',
        templateId: 'activeTalentHub',
        useCase: 'Always-on fan homepage',
        validationRules: ['requiresFirstEncounter'],
      },
      revisionNumber: 1,
      runtimeContractVersion: '1.0.0',
      sourceBundle: [],
      sourceHash: 'template-hash-1',
      submittedAt: null,
      validationState: 'ready',
      validationSummary: {
        issueCount: 0,
        passCount: 3,
        warnCount: 0,
      },
    },
    isInherited: false,
    scope: {
      scopeId: 'talent-1',
      scopeType: 'talent',
    },
  };
}

function buildComponentAssetEntry() {
  return {
    asset: {
      assetKind: 'component',
      code: 'social-links-local',
      componentType: 'SocialLinks',
      createdAt: '2026-05-23T01:00:00.000Z',
      currentRevisionId: 'revision-component-1',
      description: localizedText('Talent-scoped official links block'),
      id: 'asset-component-1',
      isSystem: false,
      name: localizedText('Social Links Local'),
      ownerId: 'talent-1',
      ownerType: 'talent',
      status: 'active',
      templateId: null,
      updatedAt: '2026-05-23T01:10:00.000Z',
      version: 1,
    },
    canEdit: true,
    currentRevision: {
      artifactStatus: 'active',
      assetId: 'asset-component-1',
      createdAt: '2026-05-23T01:10:00.000Z',
      createdBy: 'user-1',
      id: 'revision-component-1',
      lastValidatedAt: '2026-05-23T01:12:00.000Z',
      manifest: {
        assetKind: 'component',
        componentType: 'SocialLinks',
        defaultProps: {
          layout: 'horizontal',
        },
        fieldKeys: ['platforms'],
        name: localizedText('Social Links Local'),
        ownerId: 'talent-1',
        ownerType: 'talent',
        projectionMode: 'list',
        rendererSupport: true,
        runtimeContractVersion: '1.0.0',
        sourcePolicy: 'bounded',
        unknownFieldPolicy: 'preserve',
        visualSupport: 'supported',
      },
      revisionNumber: 1,
      runtimeContractVersion: '1.0.0',
      sourceBundle: [],
      sourceHash: 'component-hash-1',
      submittedAt: null,
      validationState: 'ready',
      validationSummary: {
        issueCount: 0,
        passCount: 2,
        warnCount: 0,
      },
    },
    isInherited: false,
    scope: {
      scopeId: 'talent-1',
      scopeType: 'talent',
    },
  };
}

describe('public-presence-studio.catalog', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/public-presence/assets?assetKind=template&scopeType=talent&scopeId=talent-1') {
        return [];
      }

      if (path === '/api/v1/public-presence/assets?assetKind=component&scopeType=talent&scopeId=talent-1') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });
  });

  it('routes Template Center through the talent-scoped asset workspace without legacy draft activity', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/public-presence/assets?assetKind=template&scopeType=talent&scopeId=talent-1') {
        return [buildTemplateAssetEntry()];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    const { container } = render(
      <LegacyTemplateCenterCompatibilityScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    expect(screen.getByTestId('catalog-compatibility-notice').textContent).toMatch(/compatibility stop/i);
    expect(screen.getByRole('link', { name: 'Open Homepage Management' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open asset workspace' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/settings?section=config-entities',
    );
    await waitFor(() => {
      expect(screen.getAllByText('Active Talent Hub Local').length).toBeGreaterThan(0);
    });
    expect(screen.getByTestId('asset-family-template')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add template asset' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Recent draft activity|Open saved draft|Create homepage from this draft/i);
    expect(mockRequest.mock.calls.every(([path]) => !String(path).includes('/authoring/'))).toBe(true);
  });

  it('routes Component Store through the talent-scoped asset workspace and opens inspect via asset detail', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/public-presence/assets?assetKind=component&scopeType=talent&scopeId=talent-1') {
        return [buildComponentAssetEntry()];
      }

      if (path === '/api/v1/public-presence/assets/asset-component-1?scopeType=talent&scopeId=talent-1') {
        const asset = buildComponentAssetEntry();
        return {
          ...asset,
          revisions: [asset.currentRevision],
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(
      <LegacyComponentStoreCompatibilityScreen talentId="talent-1" tenantId="tenant-1" />,
    );

    expect(await screen.findByText('Social Links Local')).toBeInTheDocument();
    expect(screen.getByTestId('asset-family-component')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add component asset' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open asset workspace' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/settings?section=config-entities',
    );

    const componentCard = screen.getByText('Social Links Local').closest('div.rounded-3xl');
    expect(componentCard).not.toBeNull();

    fireEvent.click(within(componentCard as HTMLElement).getByRole('button', { name: 'Inspect' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Asset inspect' })).toBeInTheDocument();
    });
    expect(screen.getByText('Revision history')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open component IDE' })).toHaveAttribute(
      'href',
      '/studio/public-presence/tenant-1/assets/component/asset-component-1?scopeType=talent&scopeId=talent-1',
    );
    expect(mockRequest.mock.calls.every(([path]) => !String(path).includes('/authoring/'))).toBe(true);
  });
});
