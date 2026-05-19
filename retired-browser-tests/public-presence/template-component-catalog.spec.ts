import { expect, test } from '@playwright/test';

import {
  buildPublicPresenceRoutes,
  signInToAcceptanceRoute,
  waitForRouteReady,
} from './support/fixture';
import { ensureMentalModelProofInitialized } from './support/proof';
import {
  assertNoUnqualifiedDuplicateControls,
  captureRouteEvidence,
  recordRouteTiming,
  recordViewport,
  recordViewportMetric,
  runCopyScan,
} from './support/ux';

ensureMentalModelProofInitialized();

test('template center and component store keep catalog actions scoped and inspection closable', async ({
  page,
}, testInfo) => {
  const routes = buildPublicPresenceRoutes();

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(page, routes.templateCenter);

  let elapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('template-center-catalog'),
    'Template Center',
  );

  await recordRouteTiming(routes.templateCenter, elapsedMs);
  await recordViewport(routes.templateCenter, 'desktop-1280x720');
  await recordViewportMetric(page, routes.templateCenter, 'template-center-catalog', page.getByTestId('template-center-catalog'));
  await runCopyScan(page, routes.templateCenter);
  await assertNoUnqualifiedDuplicateControls(page, routes.templateCenter);
  await expect(page.getByRole('link', { name: 'Add Template' })).toHaveCount(1);
  await captureRouteEvidence(page, 'template-center-desktop', testInfo);

  const inspectTemplateButton = page.getByRole('button', { name: /Inspect: Active Talent Hub/i });
  await inspectTemplateButton.click();
  await expect(page.getByTestId('template-inspect-drawer')).toBeVisible();
  await page.getByRole('button', { name: /Close template inspection/i }).click();
  await expect(page.getByTestId('template-inspect-drawer')).toBeHidden();
  await expect(inspectTemplateButton).toBeFocused();

  await signInToAcceptanceRoute(page, routes.componentStore);

  elapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('component-store-catalog'),
    'Component Store',
  );

  await recordRouteTiming(routes.componentStore, elapsedMs);
  await recordViewportMetric(page, routes.componentStore, 'component-store-catalog', page.getByTestId('component-store-catalog'));
  await runCopyScan(page, routes.componentStore);
  await assertNoUnqualifiedDuplicateControls(page, routes.componentStore);
  await expect(page.getByRole('link', { name: 'Add Component' })).toHaveCount(1);
  await expect(page.locator('body')).not.toContainText(
    /ProfileCard|props schema|editable fields|editing boundary|Studio handling|Handled from Advanced only|Studio editing ready|Advanced only|protected behavior|Component ID:|Live preview:|editing range|Studio ready|Advanced handling|typed destination rules|bounded controls|outside Studio editing|locked audio module|read-only|locked separator|locked spacing block|locked official updates feed/i,
  );
  await captureRouteEvidence(page, 'component-store-desktop', testInfo);

  const inspectComponentButton = page.getByRole('button', { name: /Inspect: Social Links/i });
  await inspectComponentButton.click();
  await expect(page.getByTestId('component-inspect-drawer')).toBeVisible();
  await runCopyScan(page, `${routes.componentStore}#inspect-social-links`, {
    extraPatterns: [
      'protected behavior',
      'editing range',
      'Studio ready',
      'Advanced handling',
      'Component ID:',
      'Live preview:',
      'Editable fields:',
    ],
  });
  await expect(page.getByTestId('component-inspect-drawer')).not.toContainText(
    /protected behavior|editing range|Studio ready|Advanced handling|Component ID:|Live preview:|Editable fields:/i,
  );
  await page.getByRole('button', { name: /Close component inspection/i }).click();
  await expect(page.getByTestId('component-inspect-drawer')).toBeHidden();
  await expect(inspectComponentButton).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const mobileElapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('component-store-catalog'),
    'Component Store mobile',
  );

  await recordRouteTiming(`${routes.componentStore}#mobile`, mobileElapsedMs);
  await recordViewport(routes.componentStore, 'mobile-390x844');
  await captureRouteEvidence(page, 'component-store-mobile', testInfo);
});
