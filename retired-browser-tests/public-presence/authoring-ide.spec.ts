import { expect, test } from '@playwright/test';

import {
  buildPublicPresenceRoutes,
  signInToAcceptanceRoute,
  waitForRouteReady,
} from './support/fixture';
import { ensureMentalModelProofInitialized } from './support/proof';
import {
  captureRouteEvidence,
  recordRouteTiming,
  recordViewport,
  recordViewportMetric,
  runCopyScan,
} from './support/ux';

ensureMentalModelProofInitialized();

test('template and component IDEs keep editor-first layout and visible save/validate states', async ({
  page,
}, testInfo) => {
  const routes = buildPublicPresenceRoutes();

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(page, routes.templateIde);

  let elapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('ide-editor-surface'),
    'Template IDE',
  );

  await recordRouteTiming(routes.templateIde, elapsedMs);
  await recordViewport(routes.templateIde, 'desktop-1280x720');
  await recordViewportMetric(page, routes.templateIde, 'ide-editor-surface', page.getByTestId('ide-editor-surface'));
  await runCopyScan(page, routes.templateIde, { allowSchemaTerms: true });
  await expect(page.getByTestId('ide-topbar')).not.toContainText(/^Add Template$/);
  await page.waitForFunction(() => Boolean((window as {
    monaco?: {
      editor?: {
        getModels?: () => Array<{ getValue: () => string; setValue: (value: string) => void }>;
      };
    };
  }).monaco?.editor?.getModels?.().length));
  await page.evaluate(() => {
    const monaco = (window as {
      monaco?: {
        editor?: {
          getModels?: () => Array<{ getValue: () => string; setValue: (value: string) => void }>;
        };
      };
    }).monaco;
    const model = monaco?.editor?.getModels?.()[0];

    if (!model) {
      throw new Error('Monaco model unavailable.');
    }

    model.setValue(`${model.getValue()}\n// ar29`);
  });
  await expect(page.getByTestId('ide-topbar')).toContainText('Unsaved changes');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByTestId('ide-topbar')).toContainText('Draft saved');
  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByTestId('ide-validation-status')).toContainText('Validation refreshed');
  await captureRouteEvidence(page, 'template-ide-desktop', testInfo);

  await signInToAcceptanceRoute(page, routes.componentIde);

  elapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('ide-editor-surface'),
    'Component IDE',
  );

  await recordRouteTiming(routes.componentIde, elapsedMs);
  await runCopyScan(page, routes.componentIde, { allowSchemaTerms: true });
  await expect(page.getByTestId('ide-topbar')).not.toContainText(/^Add Component$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForRouteReady(page, page.getByTestId('ide-editor-surface'), 'Component IDE mobile');
  await recordViewport(routes.componentIde, 'mobile-390x844');
  await page.getByRole('button', { name: 'Preview view' }).click();
  await expect(
    page.getByTestId('ide-preview-surface').getByRole('button', { name: 'Mobile' }).first(),
  ).toHaveAttribute('aria-pressed', 'true');
  await captureRouteEvidence(page, 'component-ide-mobile', testInfo);
});
