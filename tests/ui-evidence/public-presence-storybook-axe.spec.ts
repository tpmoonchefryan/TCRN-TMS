import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const storyPath =
  '/iframe.html?id=domains-public-presence-publicpresenceevidence--studio-home-ready&viewMode=story';
const targetSelector = '[data-testid="public-presence-evidence-target"]';

test.describe('public presence UI evidence', () => {
  test('has no scoped axe violations in the synthetic loaded state', async ({ page }) => {
    await page.goto(storyPath);

    await expect(page.locator(targetSelector)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mira Solstice Fixture Hub' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include(targetSelector)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const violations = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodeCount: violation.nodes.length,
    }));

    expect(violations).toEqual([]);
  });
});
