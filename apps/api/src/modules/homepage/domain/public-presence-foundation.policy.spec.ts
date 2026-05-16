// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  createPublicPresenceValidationArtifact,
  type PublicPresenceDocument,
} from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

import {
  buildPublicPresenceHashableDocument,
  calculatePublicPresenceContentHash,
  derivePublicPresenceValidationState,
} from './public-presence-foundation.policy';

const safeDocument: PublicPresenceDocument = {
  schemaVersion: '1.0',
  templateId: 'activeTalentHub',
  sections: [
    {
      id: 'first-1',
      kind: 'firstEncounter',
      fields: {
        displayName: {
          value: 'Tokino Sora',
          provenance: 'override',
        },
        headline: {
          value: 'Official talent hub',
          provenance: 'publicPresence',
        },
      },
    },
    {
      id: 'channels-1',
      kind: 'officialChannels',
      components: [
        {
          id: 'social-1',
          type: 'SocialLinks',
          props: {
            layout: 'horizontal',
            platforms: [
              {
                label: 'YouTube',
                platformCode: 'youtube',
                url: 'https://www.youtube.com/@tokinosora',
              },
            ],
            style: 'pill',
          },
        },
      ],
    },
  ],
  metadata: {
    description: 'Official talent hub',
    title: 'Tokino Sora',
  },
};

describe('public presence foundation policy', () => {
  it('builds a stable canonical hash regardless of object key order', () => {
    const reorderedDocument: PublicPresenceDocument = {
      metadata: {
        title: 'Tokino Sora',
        description: 'Official talent hub',
      },
      schemaVersion: '1.0',
      sections: [
        {
          fields: {
            headline: {
              provenance: 'publicPresence',
              value: 'Official talent hub',
            },
            displayName: {
              value: 'Tokino Sora',
              provenance: 'override',
            },
          },
          id: 'first-1',
          kind: 'firstEncounter',
        },
        safeDocument.sections[1],
      ],
      templateId: 'activeTalentHub',
    };

    expect(buildPublicPresenceHashableDocument(reorderedDocument)).toEqual(
      buildPublicPresenceHashableDocument(safeDocument),
    );
    expect(calculatePublicPresenceContentHash(reorderedDocument)).toBe(
      calculatePublicPresenceContentHash(safeDocument),
    );
  });

  it('derives the persisted validation state from the strongest issue state', () => {
    const safeArtifact = createPublicPresenceValidationArtifact(safeDocument, {
      mode: 'draft',
    });
    const unsafeArtifact = createPublicPresenceValidationArtifact(
      {
        ...safeDocument,
        sections: [
          safeDocument.sections[0],
          {
            id: 'actions-1',
            kind: 'fanActions',
            components: [
              {
                id: 'cta-1',
                type: 'LinkButton',
                props: {
                  label: 'Unsafe CTA',
                  url: 'javascript:alert(1)',
                },
              },
            ],
          },
        ],
      },
      { mode: 'draft' },
    );

    expect(derivePublicPresenceValidationState(safeArtifact.snapshot)).toBe(
      'validEditable',
    );
    expect(derivePublicPresenceValidationState(unsafeArtifact.snapshot)).toBe(
      'unsafe',
    );
  });
});
