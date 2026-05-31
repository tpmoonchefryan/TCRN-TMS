import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  buildSession,
  installApiMocks,
  tenantId,
} from '../../apps/web/scripts/capture-webhook-delivery-ui-evidence.mjs';

const evidenceDir = process.env.P7_WEBHOOK_EVIDENCE_DIR ?? null;

async function preparePage(page: Page, locale: string, tenantTier: 'standard' | 'ac') {
  await page.addInitScript(
    ({ session, localeOverride }) => {
      window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(session));
      window.localStorage.setItem('tcrn.web.locale.override', localeOverride);
    },
    {
      session: buildSession(locale, tenantTier),
      localeOverride: locale,
    }
  );
  await installApiMocks(page);
}

async function capture(page: Page, fileName: string) {
  if (!evidenceDir) {
    return;
  }

  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: true });
}

test('tenant webhook delivery drawer requires reason and confirms test/replay dry-runs', async ({
  page,
}) => {
  await preparePage(page, 'en', 'standard');
  await page.goto(`/tenant/${tenantId}/webhook-management`);
  await expect(page).toHaveURL(new RegExp(`/tenant/${tenantId}/webhook-management`));

  await page.getByRole('button', { name: /Delivery/i }).click();
  await expect(page.getByRole('heading', { name: /Delivery Attempts/i })).toBeVisible();
  await expect(page.getByLabel('Reason')).toHaveValue('');
  await expect(page.getByRole('button', { name: /Replay dry-run/i })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Record test/i })).toBeDisabled();
  await expect(page.getByText(/provider console|console fournisseur/i)).toHaveCount(0);

  await page.getByLabel('Reason').fill('Named Playwright spec operator reason');
  await expect(page.getByRole('button', { name: /Record test/i })).toBeEnabled();
  await page.getByRole('button', { name: /Replay dry-run/i }).click();
  const replayDialog = page
    .getByRole('dialog')
    .filter({ hasText: /Replay this delivery attempt as dry-run/i });
  await expect(replayDialog).toBeVisible();
  await replayDialog.getByRole('button', { name: /^Cancel$/i }).click();
  await expect(replayDialog).toBeHidden();

  await page.getByRole('button', { name: /Record test/i }).click();
  const recordDialog = page
    .getByRole('dialog')
    .filter({ hasText: /Record dry-run delivery test/i });
  await expect(recordDialog).toBeVisible();
  await recordDialog.getByRole('button', { name: /^Record test$/i }).click();
  await expect(page.getByText(/Dry-run delivery attempt recorded/i)).toBeVisible();
  await expect(page.getByText(/Request summary/i)).toBeVisible();
  await expect(page.getByText(/Response summary/i)).toBeVisible();
  await expect(page.getByText(/provider token|Svix app id|NATS stream/i)).toHaveCount(0);

  await capture(page, 'p7-playwright-spec-webhook-delivery-drawer.png');
});

test('AC platform tools deep link lands on the webhook delivery family', async ({ page }) => {
  await preparePage(page, 'en', 'ac');
  await page.goto(`/ac/${tenantId}/platform-tools?family=webhook_delivery`);
  await expect(page).toHaveURL(new RegExp(`/ac/${tenantId}/platform-tools\\?family=webhook_delivery`));
  await expect(page.getByRole('heading', { name: /Platform Tool Connections/i })).toBeVisible();
  await expect(page.locator('select').filter({ has: page.locator('option[value="webhook_delivery"]') })).toHaveValue(
    'webhook_delivery'
  );
  await expect(page.locator('option[value="webhook_delivery"]')).toBeAttached();
  await expect(page.getByText(/Svix-like Webhook Delivery Provider/i).first()).toBeVisible();

  await capture(page, 'p7-playwright-spec-platform-tools-webhook-delivery.png');
});
