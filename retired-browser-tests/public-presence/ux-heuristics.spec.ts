import { expect, test } from '@playwright/test';

import {
  buildPublicPresenceRoutes,
  signInToAcceptanceRoute,
  waitForRouteReady,
} from './support/fixture';
import { ensureMentalModelProofInitialized } from './support/proof';
import {
  assertNoUnqualifiedDuplicateControls,
  recordPanelStacking,
  recordRouteTiming,
  recordViewportMetric,
  runCopyScan,
} from './support/ux';

ensureMentalModelProofInitialized();

test('cross-route heuristics keep work surfaces dominant and free of old editor affordances', async ({
  page,
}) => {
  const routes = buildPublicPresenceRoutes();
  const protectedRoutes = [
    {
      path: routes.homepageManagement,
      ready: page.getByTestId('management-command-strip'),
      surface: page.getByTestId('management-command-strip'),
      minRatio: 0.2,
    },
    {
      path: routes.templateCenter,
      ready: page.getByTestId('template-center-catalog'),
      surface: page.getByTestId('template-center-catalog'),
      minRatio: 0.2,
    },
    {
      path: routes.componentStore,
      ready: page.getByTestId('component-store-catalog'),
      surface: page.getByTestId('component-store-catalog'),
      minRatio: 0.2,
    },
    {
      path: routes.studioActive,
      ready: page.getByTestId('canvas-stage'),
      surface: page.getByTestId('canvas-stage'),
      minRatio: 0.28,
    },
    {
      path: routes.previewActive,
      ready: page.getByTestId('preview-canvas-stage'),
      surface: page.getByTestId('preview-canvas-stage'),
      minRatio: 0.28,
    },
    {
      path: routes.templateIde,
      ready: page.getByTestId('ide-editor-surface'),
      surface: page.getByTestId('ide-editor-surface'),
      minRatio: 0.28,
    },
    {
      path: routes.componentIde,
      ready: page.getByTestId('ide-editor-surface'),
      surface: page.getByTestId('ide-editor-surface'),
      minRatio: 0.28,
    },
  ];

  await page.setViewportSize({ width: 1280, height: 720 });

  for (const entry of protectedRoutes) {
    await signInToAcceptanceRoute(page, entry.path);
    const elapsedMs = await waitForRouteReady(page, entry.ready, entry.path);

    await recordRouteTiming(`${entry.path}#heuristics`, elapsedMs);
    await recordViewportMetric(page, entry.path, 'primary-surface', entry.surface);
    await assertNoUnqualifiedDuplicateControls(page, entry.path);
    await runCopyScan(page, entry.path, {
      allowSchemaTerms: entry.path.includes('/templates/new') || entry.path.includes('/components/new'),
    });

    const ratio = await entry.surface.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)) / window.innerHeight;
    });

    expect(ratio).toBeGreaterThan(entry.minRatio);
    await expect(page.locator('body')).not.toContainText(/Component palette|drag component|free layout/i);
  }

  await signInToAcceptanceRoute(page, routes.studioActive);
  await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Studio heuristics');
  await recordPanelStacking(page, routes.studioActive, [
    '[data-testid="studio-left-drawer-desktop"]',
    '[data-testid="studio-right-drawer-desktop"]',
  ]);
});
