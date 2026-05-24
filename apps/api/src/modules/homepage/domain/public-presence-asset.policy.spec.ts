import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  appendPublicPresenceAssetCopySuffix,
  buildDraftPublicPresenceAssetSummary,
  buildValidatedPublicPresenceAssetSummary,
  calculatePublicPresenceAssetSourceHash,
  normalizePublicPresenceAssetCode,
  normalizePublicPresenceAssetScope,
  parsePublicPresenceAssetManifest,
  parsePublicPresenceSourceBundle,
} from './public-presence-asset.policy';

describe('public-presence-asset.policy', () => {
  it('normalizes asset scopes and rejects malformed tenant/lower-scope combinations', () => {
    expect(normalizePublicPresenceAssetScope()).toEqual({
      scopeId: null,
      scopeType: 'tenant',
    });
    expect(normalizePublicPresenceAssetScope('talent', 'talent-1')).toEqual({
      scopeId: 'talent-1',
      scopeType: 'talent',
    });

    expect(() => normalizePublicPresenceAssetScope('tenant', 'talent-1')).toThrow(
      BadRequestException,
    );
    expect(() => normalizePublicPresenceAssetScope('subsidiary')).toThrow(
      BadRequestException,
    );
  });

  it('keeps source hashes stable across manifest key order and file order changes', () => {
    const manifest = parsePublicPresenceAssetManifest({
      assetKind: 'template',
      runtimeContractVersion: '1.0.0',
      label: 'Active Talent Hub',
      useCase: 'Always-on homepage',
      templateId: 'activeTalentHub',
      requiredSections: ['firstEncounter'],
      recommendedSections: ['officialChannels'],
      optionalSections: [],
      lockedSections: [],
      defaultSectionOrder: ['firstEncounter', 'officialChannels'],
      personaKitFields: [],
      validationRules: [],
      policyReferences: [],
    });
    expect(manifest.assetKind).toBe('template');

    if (manifest.assetKind !== 'template') {
      throw new Error('Expected template manifest');
    }

    const bundleA = parsePublicPresenceSourceBundle([
      {
        path: 'manifest.json',
        kind: 'schema',
        language: 'json',
        contents: '{"a":1}',
      },
      {
        path: 'src/index.tsx',
        kind: 'code',
        language: 'tsx',
        contents: 'export const Template = () => null;\n',
      },
      {
        path: 'fixtures/default.json',
        kind: 'fixture',
        language: 'json',
        contents: '{"title":"A"}',
      },
    ]);

    const bundleB = parsePublicPresenceSourceBundle([
      {
        path: 'fixtures/default.json',
        kind: 'fixture',
        language: 'json',
        contents: '{"title":"A"}',
      },
      {
        path: 'src/index.tsx',
        kind: 'code',
        language: 'tsx',
        contents: 'export const Template = () => null;\n',
      },
      {
        path: 'manifest.json',
        kind: 'schema',
        language: 'json',
        contents: '{"a":1}',
      },
    ]);

    const reorderedManifest = parsePublicPresenceAssetManifest({
      ...manifest,
      defaultSectionOrder: [...manifest.defaultSectionOrder],
      lockedSections: [...manifest.lockedSections],
      optionalSections: [...manifest.optionalSections],
      personaKitFields: [...manifest.personaKitFields],
      policyReferences: [...manifest.policyReferences],
      recommendedSections: [...manifest.recommendedSections],
      requiredSections: [...manifest.requiredSections],
      validationRules: [...manifest.validationRules],
    });

    expect(calculatePublicPresenceAssetSourceHash({
      manifest,
      sourceBundle: bundleA,
    })).toBe(
      calculatePublicPresenceAssetSourceHash({
        manifest: reorderedManifest,
        sourceBundle: bundleB,
      }),
    );
  });

  it('produces validation summaries and localized copy labels for duplicate flows', () => {
    expect(buildDraftPublicPresenceAssetSummary()).toEqual({
      validationState: 'unvalidated',
      validationSummary: {
        issueCount: 0,
        passCount: 0,
        warnCount: 0,
      },
    });

    expect(buildValidatedPublicPresenceAssetSummary([
      {
        path: 'manifest.json',
        kind: 'schema',
        language: 'json',
        contents: '{}',
      },
      {
        path: 'fixtures/default.json',
        kind: 'fixture',
        language: 'json',
        contents: '{}',
      },
      {
        path: 'src/index.tsx',
        kind: 'code',
        language: 'tsx',
        contents: 'export const x = 1;\n',
      },
    ])).toEqual({
      validationState: 'ready',
      validationSummary: {
        issueCount: 0,
        passCount: 4,
        warnCount: 0,
      },
    });

    expect(normalizePublicPresenceAssetCode('  Hero Banner  ')).toBe('hero-banner');
    expect(appendPublicPresenceAssetCopySuffix({
      en: 'Hero Banner',
      zh_HANS: '主页横幅',
      zh_HANT: '主頁橫幅',
      ja: 'ヒーローバナー',
      ko: '히어로 배너',
      fr: 'Banniere hero',
    }).ja).toBe('ヒーローバナーコピー');
  });
});
