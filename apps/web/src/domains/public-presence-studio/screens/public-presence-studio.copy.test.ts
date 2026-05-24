import { describe, expect, it } from 'vitest';

import { SUPPORTED_UI_LOCALES } from '@tcrn/shared';

import {
  getPublicPresenceStageSectionLabel,
  getPublicPresenceStudioTabLabel,
  getPublicPresenceTemplateLabel,
  getPublicPresenceWorkflowEventLabel,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';

describe('public-presence-studio.copy', () => {
  it.each(SUPPORTED_UI_LOCALES)('resolves required studio labels for %s', (locale) => {
    expect(getPublicPresenceStudioTabLabel(locale, 'overview')).toBeTruthy();
    expect(
      getPublicPresenceTemplateLabel(locale, {
        label: 'fallback',
        templateId: 'activeTalentHub',
      })
    ).toBeTruthy();
    expect(
      getPublicPresenceStageSectionLabel(locale, {
        kind: 'fanActions',
      })
    ).toBeTruthy();
    expect(getPublicPresenceWorkflowEventLabel(locale, 'revealAutoSwitched')).toBeTruthy();
  });
});
