import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  buildSession,
  installApiMocks,
  subsidiaryId,
  talentId,
  tenantId,
} from '../../apps/web/scripts/capture-event-backbone-ui-evidence.mjs';

const evidenceDir = process.env.P8_EVENT_BACKBONE_EVIDENCE_DIR ?? null;

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

test('AC platform tools deep link lands on the event backbone family', async ({ page }) => {
  await preparePage(page, 'en', 'ac');
  await page.goto(`/ac/${tenantId}/platform-tools?family=event_backbone`);
  await expect(page).toHaveURL(new RegExp(`/ac/${tenantId}/platform-tools\\?family=event_backbone`));
  await expect(page.getByRole('heading', { name: /Platform Tool Connections/i })).toBeVisible();
  await expect(page.locator('select').filter({ has: page.locator('option[value="event_backbone"]') })).toHaveValue(
    'event_backbone'
  );
  await expect(page.locator('[data-event-backbone-summary="ac-readiness"]')).toBeVisible();
  await expect(page.getByText(/TCRN owns event meaning/i)).toBeVisible();
  await expect(page.getByText(/No raw payload/i)).toBeVisible();
  await expect(page.getByText(/NATS JetStream/i).first()).toBeVisible();
  await expect(page.locator('[data-overflow-check="event-backbone-stream-table"]')).toBeVisible();
  await expect(page.locator('[data-overflow-check="event-backbone-consumer-table"]')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);

  await capture(page, 'p8-playwright-spec-platform-tools-event-backbone.png');
});

test('ordinary tenant, subsidiary, and talent settings do not expose event stream controls', async ({
  page,
}) => {
  await preparePage(page, 'en', 'standard');

  const routes = [
    `/tenant/${tenantId}/settings`,
    `/tenant/${tenantId}/subsidiary/${subsidiaryId}/settings`,
    `/tenant/${tenantId}/talent/${talentId}/settings`,
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(route));
    await expect(page.getByText(/Event Backbone|NATS JetStream|stream controls|consumer durable|DLQ/i)).toHaveCount(0);
  }

  await capture(page, 'p8-playwright-spec-ordinary-settings-event-backbone-absence.png');
});
