import { expect, test, type Page } from '@playwright/test';

import {
  buildPublicPresenceRoutes,
  signInToAcceptanceRoute,
  waitForRouteReady,
} from './support/fixture';

async function collectCloseLaneFindings(page: Page) {
  return page.evaluate(() => {
    const panels = Array.from(document.querySelectorAll<HTMLElement>([
      '[data-testid="studio-left-drawer-desktop"]',
      '[data-testid="studio-right-drawer-desktop"]',
      '[data-testid="studio-mobile-manage-sheet"]',
      '[data-testid="studio-mobile-preview-tools-sheet"]',
      '[role="dialog"]',
    ].join(','))).filter((panel) => {
      const rect = panel.getBoundingClientRect();

      return rect.width > 0 && rect.height > 0;
    });

    return panels.flatMap((panel) => {
      const panelRect = panel.getBoundingClientRect();
      const closeButtons = Array.from(panel.querySelectorAll<HTMLElement>('button')).filter((button) => {
        const label = [
          button.getAttribute('aria-label'),
          button.getAttribute('title'),
          button.textContent,
        ].join(' ');

        return /close/i.test(label);
      });

      return closeButtons.flatMap((button) => {
        const findings: Array<{
          buttonLabel: string;
          laneHeight: number;
          laneWidth: number;
          panelHeight: number;
          panelWidth: number;
          testId: string | null;
        }> = [];
        let current = button.parentElement;

        while (current && current !== panel) {
          const rect = current.getBoundingClientRect();
          const isDedicatedLane =
            rect.height >= panelRect.height * 0.75
            && rect.width <= 96
            && rect.width <= panelRect.width * 0.28;

          if (isDedicatedLane) {
            findings.push({
              buttonLabel: button.getAttribute('aria-label') || button.textContent?.trim() || 'close',
              laneHeight: Math.round(rect.height),
              laneWidth: Math.round(rect.width),
              panelHeight: Math.round(panelRect.height),
              panelWidth: Math.round(panelRect.width),
              testId: current.getAttribute('data-testid'),
            });
          }

          current = current.parentElement;
        }

        return findings;
      });
    });
  });
}

test('AR33 Studio gates close lane, save feedback, source editor, and collection operations', async ({
  page,
}, testInfo) => {
  const routes = buildPublicPresenceRoutes();

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(page, routes.studioActive);
  await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'AR33 Studio');

  await expect(page.getByRole('button', { name: /Save source/i })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /Source Schema/i })).toHaveCount(0);

  const leftRail = page.getByTestId('left-rail');
  await leftRail.getByRole('button', { name: /Readiness/i }).click();
  await expect(page.getByTestId('studio-left-drawer-desktop')).toBeVisible();
  expect(await collectCloseLaneFindings(page)).toEqual([]);

  await leftRail.getByRole('button', { name: /Stage Sections/i }).click();
  await page.getByTestId('stage-row-stageSchedule').click();
  await expect(page.getByTestId('studio-right-drawer-desktop')).toBeVisible();
  const scheduleDeleteCount = await page.getByTestId('studio-right-drawer-desktop').getByRole('button', { name: 'Delete' }).count();
  expect(scheduleDeleteCount).toBeGreaterThan(0);
  await expect(page.getByTestId('studio-right-drawer-desktop').getByRole('button', { name: 'Delete' }).first()).toBeVisible();
  expect(await collectCloseLaneFindings(page)).toEqual([]);

  await page.getByTestId('stage-row-firstEncounter').click();
  const editPanel = page.getByTestId('studio-right-drawer-desktop');
  const firstInput = editPanel.locator('input:not([disabled]):not([type="hidden"])').first();
  const originalValue = await firstInput.inputValue();

  await firstInput.fill(`${originalValue} AR33`);
  await page.getByTestId('studio-topbar').getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await expect(page.getByText('Draft saved.')).toHaveCount(0, { timeout: 7000 });
  await expect(page.getByTestId('studio-topbar')).toContainText('Saved');

  await firstInput.fill(originalValue);
  await page.getByTestId('studio-topbar').getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await expect(page.getByText('Draft saved.')).toHaveCount(0, { timeout: 7000 });

  await testInfo.attach('ar33-studio-proof.json', {
    body: JSON.stringify({
      closeLaneFindings: await collectCloseLaneFindings(page),
      hasSaveSourceButton: await page.getByRole('button', { name: /Save source/i }).count(),
      hasSourceSchemaTextbox: await page.getByRole('textbox', { name: /Source Schema/i }).count(),
      savedBadgeVisible: await page.getByTestId('studio-topbar').getByText('Saved').count(),
      scheduleDeleteVisible: scheduleDeleteCount,
    }, null, 2),
    contentType: 'application/json',
  });
});

test('AR33 Advanced, Template, and Component IDEs are source-bundle-first', async ({
  page,
}, testInfo) => {
  const routes = buildPublicPresenceRoutes();

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(page, routes.advancedIde);
  await waitForRouteReady(page, page.getByTestId('ide-editor-surface'), 'AR33 Advanced IDE');

  await expect(page.getByRole('button', { name: 'Page source' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Custom HTML' }).click();
  await expect(page.getByTestId('ide-custom-html-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Files' }).click();
  await expect(page.getByTestId('ide-file-src/index.html')).toBeVisible();
  await expect(page.getByTestId('ide-file-src/styles.css')).toBeVisible();
  await expect(page.getByTestId('ide-file-tests/safety.spec.ts')).toBeVisible();
  await expect(page.getByTestId('ide-file-fixtures/default.json')).toBeVisible();

  await signInToAcceptanceRoute(page, routes.templateIde);
  await waitForRouteReady(page, page.getByTestId('ide-editor-surface'), 'AR33 Template IDE');
  await page.getByRole('button', { name: 'Files' }).click();
  await expect(page.getByTestId('ide-file-src/template.tsx')).toBeVisible();
  await expect(page.getByTestId('ide-file-src/theme.css')).toBeVisible();
  await expect(page.getByTestId('ide-file-tests/preview.spec.ts')).toBeVisible();
  await expect(page.getByTestId('ide-file-manifest.json')).toBeVisible();

  await signInToAcceptanceRoute(page, routes.componentIde);
  await waitForRouteReady(page, page.getByTestId('ide-editor-surface'), 'AR33 Component IDE');
  await page.getByRole('button', { name: 'Files' }).click();
  await expect(page.getByTestId('ide-file-src/component.tsx')).toBeVisible();
  await expect(page.getByTestId('ide-file-src/component.css')).toBeVisible();
  await expect(page.getByTestId('ide-file-tests/component.spec.ts')).toBeVisible();
  await expect(page.getByTestId('ide-file-manifest.json')).toBeVisible();

  await testInfo.attach('ar33-authoring-source-format-proof.json', {
    body: JSON.stringify({
      advancedModes: ['page-source', 'custom-html', 'registry-snippets'],
      advancedPrimaryFiles: ['src/index.html', 'src/styles.css', 'tests/safety.spec.ts'],
      componentPrimaryFiles: ['src/component.tsx', 'src/component.css', 'tests/component.spec.ts'],
      templatePrimaryFiles: ['src/template.tsx', 'src/theme.css', 'tests/preview.spec.ts'],
    }, null, 2),
    contentType: 'application/json',
  });
});
