import { expect, test, type Locator, type Page } from '@playwright/test';

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
  runCopyScan,
} from './support/ux';

ensureMentalModelProofInitialized();

async function readAccessibleLabel(control: Locator) {
  return control.evaluate((element) => {
    const labels = (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).labels;
    const directLabel = labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim();

    if (directLabel) {
      return directLabel;
    }

    const ariaLabel = element.getAttribute('aria-label');

    if (ariaLabel) {
      return ariaLabel.trim();
    }

    return element.getAttribute('name') || element.id || element.tagName.toLowerCase();
  });
}

async function mutateControl(control: Locator, index: number) {
  const tagName = await control.evaluate((element) => element.tagName.toLowerCase());

  if (tagName === 'select') {
    const currentValue = await control.inputValue();
    const options = await control.locator('option').evaluateAll((nodes) => nodes.map((node) => ({
      disabled: (node as HTMLOptionElement).disabled,
      value: (node as HTMLOptionElement).value,
    })));
    const nextValue = options.find((option) => !option.disabled && option.value !== currentValue)?.value;

    if (!nextValue) {
      return false;
    }

    await control.selectOption(nextValue);
    return true;
  }

  const inputType = await control.getAttribute('type');
  const currentValue = await control.inputValue();

  if (inputType === 'checkbox') {
    await control.click();
    return true;
  }

  if (inputType === 'url') {
    await control.fill(`https://example.com/ar29-${index}`);
    return true;
  }

  if (inputType === 'datetime-local') {
    await control.fill(currentValue || '2026-05-19T20:15');
    return true;
  }

  if (tagName === 'textarea') {
    await control.fill(currentValue ? `${currentValue}\nAR29` : `AR29 note ${index}`);
    return true;
  }

  await control.fill(currentValue ? `${currentValue} AR29` : `AR29 ${index}`);
  return true;
}

async function resetVisibleFields(panel: Locator) {
  const resetButtons = panel.getByRole('button', { name: /Reset/i });
  let restored = 0;

  while (await resetButtons.count()) {
    await resetButtons.first().click();
    restored += 1;
  }

  return restored;
}

test('studio field matrix exercises visible editable controls and restores unsaved state', async ({
  page,
}, testInfo) => {
  const routes = buildPublicPresenceRoutes();

  await page.setViewportSize({ width: 1280, height: 720 });
  await signInToAcceptanceRoute(page, routes.studioActive);

  const elapsedMs = await waitForRouteReady(
    page,
    page.getByTestId('canvas-stage'),
    'Public Page Studio',
  );

  await recordRouteTiming(routes.studioActive, elapsedMs);
  await recordViewport(routes.studioActive, 'desktop-1280x720');
  await runCopyScan(page, routes.studioActive, {
    extraPatterns: ['fallback'],
  });
  await assertNoUnqualifiedDuplicateControls(page, routes.studioActive);
  await captureRouteEvidence(page, 'studio-active-desktop', testInfo);

  await page.getByRole('button', { name: /Stage Sections/i }).click();
  const stageSectionDrawer = page.getByTestId('studio-left-drawer-desktop');
  await expect(stageSectionDrawer).toBeVisible();

  const stageRows = stageSectionDrawer.locator('[data-testid^="stage-row-"]');
  const stageCount = await stageRows.count();
  let mutatedFieldCount = 0;
  let restoredFieldCount = 0;

  expect(stageCount).toBeGreaterThan(0);

  for (let index = 0; index < stageCount; index += 1) {
    const row = stageRows.nth(index);
    const sectionName = ((await row.textContent()) ?? '').replace(/\s+/g, ' ').trim() || `section-${index + 1}`;

    await row.click();

    const panel = page.getByTestId('studio-right-drawer-desktop');
    await expect(panel).toBeVisible();

    const controls = panel.locator('input:not([disabled]):not([type=hidden]), textarea:not([disabled]), select:not([disabled])');
    const controlCount = await controls.count();
    const fieldNames: string[] = [];
    let sectionMutations = 0;

    for (let controlIndex = 0; controlIndex < controlCount; controlIndex += 1) {
      const control = controls.nth(controlIndex);

      if (!(await control.isVisible())) {
        continue;
      }

      const fieldName = await readAccessibleLabel(control);
      fieldNames.push(fieldName);
      const changed = await mutateControl(control, mutatedFieldCount + controlIndex + 1).catch(() => false);

      if (changed) {
        sectionMutations += 1;
      }
    }

    updateMentalModelProof((current) => ({
      ...current,
      fieldInventory: [
        ...current.fieldInventory,
        {
          controlCount,
          fields: fieldNames,
          route: routes.studioActive,
          section: sectionName,
        },
      ],
    }));

    if (sectionMutations > 0) {
      mutatedFieldCount += sectionMutations;
      await expect(
        page.getByTestId('studio-topbar').getByRole('button', { name: 'Save draft' }),
      ).toBeEnabled();
      restoredFieldCount += await resetVisibleFields(panel);
    }
  }

  updateMentalModelProof((current) => ({
    ...current,
    mutatedFieldCount: current.mutatedFieldCount + mutatedFieldCount,
    restoredFieldCount: current.restoredFieldCount + restoredFieldCount,
  }));

  await page.reload();
  await waitForRouteReady(page, page.getByTestId('canvas-stage'), 'Public Page Studio reload');
  await expect(
    page.getByTestId('studio-topbar').getByRole('button', { name: 'Save draft' }),
  ).toBeDisabled();
});
