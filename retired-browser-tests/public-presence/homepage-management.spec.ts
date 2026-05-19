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

test('homepage management keeps live operation controls in the first viewport', async ({
  page,
}, testInfo) => {
  const routes = buildPublicPresenceRoutes();

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(page, routes.homepageManagement);

  const elapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('management-command-strip'),
    'Homepage Management',
  );

  await recordRouteTiming(routes.homepageManagement, elapsedMs);
  await recordViewport(routes.homepageManagement, 'desktop-1280x720');
  await runCopyScan(page, routes.homepageManagement);
  await assertNoUnqualifiedDuplicateControls(page, routes.homepageManagement);
  await recordViewportMetric(
    page,
    routes.homepageManagement,
    'management-command-strip',
    page.getByTestId('management-command-strip'),
  );
  await captureRouteEvidence(page, 'homepage-management-desktop', testInfo);
  const commandStrip = page.getByTestId('management-command-strip');

  await expect(commandStrip.getByRole('link', { name: 'Open live public page' })).toHaveAttribute(
    'href',
    routes.publicPage,
  );
  await expect(commandStrip.getByRole('link', { name: 'Review & Publish' })).toBeVisible();
  await expect(commandStrip.getByRole('link', { name: 'Route settings' })).toBeVisible();
  await expect(commandStrip.getByRole('link', { name: 'SEO basics' })).toBeVisible();

  const commandViewportBounds = await page.getByTestId('management-command-strip').evaluate((element) => {
    const rect = element.getBoundingClientRect();

    return {
      bottom: rect.bottom,
      top: rect.top,
      viewportHeight: window.innerHeight,
    };
  });

  expect(commandViewportBounds.top).toBeLessThan(commandViewportBounds.viewportHeight * 0.6);
  expect(commandViewportBounds.bottom).toBeLessThanOrEqual(commandViewportBounds.viewportHeight);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const mobileElapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('management-command-strip'),
    'Homepage Management mobile',
  );

  await recordRouteTiming(`${routes.homepageManagement}#mobile`, mobileElapsedMs);
  await recordViewport(routes.homepageManagement, 'mobile-390x844');
  await captureRouteEvidence(page, 'homepage-management-mobile', testInfo);
});
