import { describe, expect, it } from 'vitest';
import type { PublicPresenceDocument } from '@tcrn/shared';

import type { PublicPresenceDocumentVersionRecord } from '../domain/public-presence-foundation.policy';
import {
  buildDebutRevealAutoSwitchDependency,
  buildStudioReleaseReadinessSummary,
  extractRevealAutoSwitchAt,
} from './public-presence-release-readiness';

function createDocument(templateId: 'activeTalentHub' | 'debutReveal'): PublicPresenceDocument {
  return templateId === 'debutReveal'
    ? {
        metadata: {
          title: 'Sakura Kaze',
        },
        personaKit: {
          accentTone: 'rose',
          campaignLabel: 'Debut Reveal',
          tagline: 'Countdown updates, reveal moments, and launch links for fans.',
        },
        schemaVersion: '1.0',
        sections: [
          {
            fields: {
              displayName: {
                provenance: 'publicPresence',
                value: 'Sakura Kaze',
              },
            },
            id: 'first-1',
            kind: 'firstEncounter',
            phaseVisibility: 'always',
          },
          {
            fields: {
              phase: {
                provenance: 'publicPresence',
                value: 'countdown',
              },
              revealAtUtc: {
                provenance: 'publicPresence',
                value: '2030-05-15T10:00:00.000Z',
              },
            },
            id: 'countdown-1',
            kind: 'countdownReveal',
            phaseVisibility: 'countdown',
          },
        ],
        templateId,
      }
    : {
        metadata: {
          title: 'Sakura Kaze',
        },
        personaKit: {
          accentTone: 'rose',
          campaignLabel: 'Active Talent Hub',
          tagline: 'Official fan hub',
        },
        schemaVersion: '1.0',
        sections: [
          {
            fields: {
              displayName: {
                provenance: 'publicPresence',
                value: 'Sakura Kaze',
              },
            },
            id: 'first-1',
            kind: 'firstEncounter',
            phaseVisibility: 'always',
          },
        ],
        templateId,
      };
}

function createVersionRecord(
  templateId: 'activeTalentHub' | 'debutReveal',
  documentState: string,
): PublicPresenceDocumentVersionRecord {
  return {
    contentHash: `${templateId}-${documentState}-hash`,
    contentHashAlgorithm: 'sha256',
    createdAt: new Date('2026-05-15T12:00:00.000Z'),
    createdBy: 'user-1',
    document: createDocument(templateId) as unknown as Record<string, unknown>,
    documentSchemaVersion: '1.0',
    documentState,
    id: `${templateId}-${documentState}-version`,
    lastValidationSnapshotId: 'snapshot-1',
    portalId: 'portal-1',
    publishedAt: null,
    publishedBy: null,
    scheduledFor: null,
    templateAssetPin: null,
    templateId,
    updatedAt: new Date('2026-05-15T12:05:00.000Z'),
    versionNumber: 1,
  };
}

describe('public-presence-release-readiness', () => {
  it('extracts the reveal auto-switch timestamp from debut versions', () => {
    expect(extractRevealAutoSwitchAt(createVersionRecord('debutReveal', 'draft'))).toBe(
      '2030-05-15T10:00:00.000Z',
    );
    expect(extractRevealAutoSwitchAt(createVersionRecord('activeTalentHub', 'draft'))).toBeNull();
  });

  it('blocks Debut release when no Active Hub draft exists yet', () => {
    const dependency = buildDebutRevealAutoSwitchDependency({
      debutVersion: createVersionRecord('debutReveal', 'draft'),
      latestActiveHubVersion: null,
      publishReadyActiveHubVersion: null,
    });

    expect(dependency).toMatchObject({
      blocksPublish: true,
      nextAction: 'startActiveTalentHubDraft',
      status: 'blocked',
      targetVersionState: null,
    });
  });

  it('blocks Debut release and points to the existing Active Hub draft when approval is still missing', () => {
    const dependency = buildDebutRevealAutoSwitchDependency({
      debutVersion: createVersionRecord('debutReveal', 'draft'),
      latestActiveHubVersion: createVersionRecord('activeTalentHub', 'draft'),
      publishReadyActiveHubVersion: null,
    });

    expect(dependency).toMatchObject({
      blocksPublish: true,
      nextAction: 'openActiveTalentHubDraft',
      status: 'blocked',
      targetVersionState: 'draft',
    });
  });

  it('marks the dependency ready once an approved Active Hub target exists', () => {
    const dependency = buildDebutRevealAutoSwitchDependency({
      debutVersion: createVersionRecord('debutReveal', 'draft'),
      latestActiveHubVersion: createVersionRecord('activeTalentHub', 'draft'),
      publishReadyActiveHubVersion: createVersionRecord('activeTalentHub', 'approved'),
    });

    expect(dependency).toMatchObject({
      blocksPublish: false,
      nextAction: 'none',
      status: 'ready',
      targetVersionState: 'approved',
    });
  });

  it('returns no dependency when Debut auto-switch is not armed', () => {
    const summary = buildStudioReleaseReadinessSummary({
      latestActiveHubVersion: null,
      publishReadyActiveHubVersion: null,
      selectedVersion: createVersionRecord('activeTalentHub', 'draft'),
    });

    expect(summary).toEqual({
      blockingDependencyCount: 0,
      dependencies: [],
    });
  });
});
