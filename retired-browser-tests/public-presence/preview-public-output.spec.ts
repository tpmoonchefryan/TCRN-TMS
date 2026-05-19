import { expect, test } from '@playwright/test';

import {
  buildPublicPresenceRoutes,
  signInToAcceptanceRoute,
  waitForRouteReady,
} from './support/fixture';
import { ensureMentalModelProofInitialized, updateMentalModelProof } from './support/proof';
import {
  assertNoUnqualifiedDuplicateControls,
  captureRouteEvidence,
  recordRouteTiming,
  recordViewport,
  recordViewportMetric,
  runCopyScan,
} from './support/ux';

ensureMentalModelProofInitialized();

test('preview route preserves deep-link state and public route stays fan-facing', async ({
  page,
}, testInfo) => {
  const routes = buildPublicPresenceRoutes();
  const deepLinkedPreviewPath = `${routes.previewActive}?viewport=mobile&details=1`;

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(page, deepLinkedPreviewPath);

  const elapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('preview-canvas-stage'),
    'Standalone Preview',
  );

  await recordRouteTiming(routes.previewActive, elapsedMs);
  await recordViewport(routes.previewActive, 'desktop-1280x720');
  await recordViewportMetric(page, routes.previewActive, 'preview-canvas-stage', page.getByTestId('preview-canvas-stage'));
  await runCopyScan(page, routes.previewActive);
  await assertNoUnqualifiedDuplicateControls(page, routes.previewActive);
  await expect(page.getByRole('button', { name: 'Mobile' }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('preview-side-rail')).toBeVisible();
  const editThisSectionLink = page.getByRole('link', { name: 'Edit this section' });
  await expect(editThisSectionLink).toBeVisible();
  await expect(editThisSectionLink).toHaveAttribute(
    'href',
    /templateId=activeTalentHub&leftPanel=sections&stagePanel=edit%3AfirstEncounter$/,
  );
  await captureRouteEvidence(page, 'preview-active-desktop', testInfo);

  await page.reload();
  await waitForRouteReady(page, page.getByTestId('preview-canvas-stage'), 'Standalone Preview deep link reload');
  await expect(page).toHaveURL(/viewport=mobile/);
  await expect(page).toHaveURL(/details=1/);

  await editThisSectionLink.click();
  await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Studio route from preview edit link');
  await expect(page).toHaveURL(/templateId=activeTalentHub/);
  await expect(page).toHaveURL(/leftPanel=sections/);
  await expect(page).toHaveURL(/stagePanel=edit%3AfirstEncounter/);
  await expect(page.getByText('Fan preview unavailable')).toHaveCount(0);
  await expect(page.getByText('Public Presence version not found')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(routes.publicPage);
  await expect(page.locator('body')).toBeVisible();
  await recordViewport(routes.publicPage, 'mobile-390x844');
  await runCopyScan(page, routes.publicPage);
  await expect(page.locator('body')).not.toContainText(/Studio|Template IDE|Component IDE|Secondary fan actions stay grouped/i);
  await captureRouteEvidence(page, 'public-page-mobile', testInfo);

  updateMentalModelProof((current) => ({
    ...current,
    publicRouteProof: {
      blockedTerms: [],
      route: routes.publicPage,
      viewport: 'mobile-390x844',
    },
  }));
});
