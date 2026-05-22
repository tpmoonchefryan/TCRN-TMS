import { describe, expect, it } from 'vitest';

import { buildTemplateStarterBlueprint } from '@/domains/public-presence-studio/screens/public-presence-authoring-blueprint';

describe('public-presence-authoring-blueprint', () => {
  it('keeps custom homepage starter identity creator-readable across locales', () => {
    expect(buildTemplateStarterBlueprint('activeTalentHub', 'en').campaignLabel).toBe('Custom homepage starter');
    expect(buildTemplateStarterBlueprint('activeTalentHub', 'zh_HANS').campaignLabel).toBe('Custom homepage starter');
    expect(buildTemplateStarterBlueprint('activeTalentHub', 'ja').campaignLabel).toBe('Custom homepage starter');
  });
});
