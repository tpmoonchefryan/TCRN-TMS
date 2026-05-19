import { expect, test } from '@playwright/test';

import {
  buildPublicPresenceRoutes,
  signInToAcceptanceRoute,
  waitForRouteReady,
} from './support/fixture';
import { ensureMentalModelProofInitialized } from './support/proof';
import {
  captureRouteEvidence,
  recordPanelStacking,
  recordRouteTiming,
  recordViewport,
  recordViewportMetric,
} from './support/ux';

ensureMentalModelProofInitialized();

test('studio workflow keeps canvas mounted and side surfaces scoped', async ({
  page,
}, testInfo) => {
  const routes = buildPublicPresenceRoutes();

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(page, routes.studioActive);

  const elapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('canvas-stage'),
    'Public Page Studio workflow',
  );

  await recordRouteTiming(`${routes.studioActive}#workflow`, elapsedMs);
  await recordViewport(routes.studioActive, 'desktop-1280x720');
  await recordViewportMetric(page, routes.studioActive, 'canvas-stage', page.getByTestId('canvas-stage'));
  await expect(page.getByTestId('canvas-stage')).toBeVisible();

  await page.getByRole('button', { name: /Persona/i }).click();
  await expect(page.getByTestId('studio-left-drawer-desktop')).toBeVisible();
  await page.getByRole('button', { name: /Readiness/i }).click();
  await expect(page.getByTestId('studio-left-drawer-desktop')).toBeVisible();
  await page.getByRole('button', { name: /Advanced/i }).click();
  await expect(page.getByTestId('studio-left-drawer-desktop')).toBeVisible();

  await recordPanelStacking(page, routes.studioActive, [
    '[data-testid="studio-left-drawer-desktop"]',
    '[data-testid="studio-right-drawer-desktop"]',
    '[data-testid="studio-mobile-manage-sheet"]',
    '[data-testid="studio-mobile-preview-tools-sheet"]',
  ]);
  await captureRouteEvidence(page, 'studio-workflow-desktop', testInfo);

  await page.goto(routes.studioActive);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Public Page Studio mobile workflow');

  await page.getByTestId('studio-mobile-manage-button').click();
  const mobileManageSheet = page.getByTestId('studio-mobile-manage-sheet');
  await expect(mobileManageSheet).toBeVisible();
  await expect(page.getByTestId('studio-mobile-preview-tools-sheet')).toHaveCount(0);

  await mobileManageSheet.getByRole('button', { name: /^Preview tools$/i }).click();
  await expect(page).toHaveURL(/sheet=preview-tools/);
  await expect(page.getByTestId('studio-mobile-manage-sheet')).toHaveCount(0);
  const previewToolsSheet = page.getByTestId('studio-mobile-preview-tools-sheet');
  await expect(previewToolsSheet).toBeVisible();
  const previewToolsButton = page.getByRole('button', { name: /^Preview tools$/i }).first();
  await expect(previewToolsButton).toHaveAttribute('aria-expanded', 'true');
  await previewToolsSheet.getByRole('button', { name: /^Manage$/i }).click();
  await expect(page).toHaveURL(/sheet=manage/);
  await expect(page.getByTestId('studio-mobile-preview-tools-sheet')).toHaveCount(0);
  await expect(page.getByTestId('studio-mobile-manage-sheet')).toBeVisible();

  await page.goto(`${routes.studioActive}?viewport=mobile&sheet=preview-tools`);
  await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Public Page Studio mobile workflow deep-linked preview tools');
  await expect(page.getByTestId('studio-mobile-preview-tools-sheet')).toBeVisible();
  await expect(page.getByTestId('studio-mobile-manage-sheet')).toHaveCount(0);

  await page.goto(`${routes.studioActive}?viewport=mobile&sheet=manage`);
  await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Public Page Studio mobile workflow deep-linked manage');
  await expect(page.getByTestId('studio-mobile-manage-sheet')).toBeVisible();
  await expect(page.getByTestId('studio-mobile-preview-tools-sheet')).toHaveCount(0);

  await recordViewport(routes.studioActive, 'mobile-390x844');
  await captureRouteEvidence(page, 'studio-workflow-mobile', testInfo);
});
