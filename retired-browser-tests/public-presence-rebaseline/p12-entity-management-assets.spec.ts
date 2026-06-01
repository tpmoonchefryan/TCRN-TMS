import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const evidenceDir = process.env.PUBLIC_PRESENCE_REBASELINE_EVIDENCE_DIR ?? null;
const fixtureReadbackPath =
  process.env.PUBLIC_PRESENCE_REBASELINE_FIXTURE_READBACK ??
  (evidenceDir ? path.join(evidenceDir, 'p12-fixture-readback.json') : null);

type Locale = 'zh_HANS' | 'fr';

function readTenantId() {
  if (process.env.PUBLIC_PRESENCE_REBASELINE_TENANT_ID) {
    return process.env.PUBLIC_PRESENCE_REBASELINE_TENANT_ID;
  }
  if (!fixtureReadbackPath) {
    throw new Error('PUBLIC_PRESENCE_REBASELINE_FIXTURE_READBACK or evidence dir is required.');
  }
  const fixture = JSON.parse(readFileSync(fixtureReadbackPath, 'utf8'));
  const resolvedTenantId = fixture?.canonicalFixture?.resolved?.tenant?.id;
  if (typeof resolvedTenantId !== 'string' || resolvedTenantId.length === 0) {
    throw new Error(`Fixture readback does not contain a resolved tenant id: ${fixtureReadbackPath}`);
  }
  return resolvedTenantId;
}

const tenantId = readTenantId();

function envelope(data: unknown, meta?: unknown) {
  return meta ? { success: true, data, meta } : { success: true, data };
}

function writeArtifact(fileName: string, payload: unknown) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(path.join(evidenceDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function screenshot(page: Page, fileName: string) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, fileName), fullPage: true });
}

async function writeDom(page: Page, fileName: string) {
  if (!evidenceDir) return;
  mkdirSync(evidenceDir, { recursive: true });
  const text = await page.locator('body').innerText();
  writeFileSync(path.join(evidenceDir, fileName), text, 'utf8');
}

function localized(en: string, zhHans: string, fr: string) {
  return {
    en,
    zh_HANS: zhHans,
    zh_HANT: zhHans,
    ja: en,
    ko: en,
    fr,
  };
}

function buildSession(locale: Locale) {
  return {
    accessToken: 'phase12-public-presence-browser-proof',
    tokenType: 'Bearer',
    expiresIn: 3600,
    authenticatedAt: '2026-06-01T00:00:00.000Z',
    tenantId,
    tenantName: 'UAT Corp',
    tenantTier: 'standard',
    tenantCode: 'UAT_CORP',
    capabilities: {
      tenantId,
      scopeType: 'tenant',
      scopeId: null,
      enabledCapabilityCodes: ['core.settings', 'public_presence.homepage'],
      disabledReasons: {},
      registryVersion: 'phase-12-public-presence-rebaseline',
      resolvedAt: '2026-06-01T00:00:00.000Z',
    },
    user: {
      id: randomUUID(),
      username: 'corp_admin',
      email: 'phase12-public-presence@example.test',
      displayName: 'Phase 12 Proof',
      avatarUrl: null,
      preferredLanguage: locale,
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
    },
  };
}

function buildTemplateAsset(locale: Locale) {
  const name = localized('Active Talent Hub', '常驻艺人主页', 'Hub artiste actif');
  const description = localized(
    'System template for always-on public fan pages.',
    '用于常驻粉丝主页发布的系统模板。',
    'Modele systeme pour les pages fan publiques permanentes.',
  );

  return {
    asset: {
      assetKind: 'template',
      code: 'SYS_ACTIVE_TALENT_HUB',
      componentType: null,
      createdAt: '2026-06-01T00:00:00.000Z',
      currentRevisionId: 'template-revision-1',
      description,
      id: 'template-asset-1',
      isSystem: true,
      name,
      ownerId: null,
      ownerType: 'system',
      status: 'active',
      templateId: 'activeTalentHub',
      templateTypeCode: 'operating',
      updatedAt: '2026-06-01T00:00:00.000Z',
      version: 1,
    },
    canEdit: false,
    currentRevision: {
      artifactStatus: 'active',
      assetId: 'template-asset-1',
      createdAt: '2026-06-01T00:00:00.000Z',
      createdBy: null,
      id: 'template-revision-1',
      lastValidatedAt: '2026-06-01T00:00:00.000Z',
      manifest: {
        assetKind: 'template',
        defaultSectionOrder: ['hero'],
        label: locale === 'zh_HANS' ? '常驻艺人主页' : 'Active Talent Hub',
        lockedSections: [],
        optionalSections: [],
        personaKitFields: [],
        policyReferences: ['homepage-template-type:operating'],
        recommendedSections: ['hero'],
        requiredSections: ['hero'],
        runtimeContractVersion: '1.0.0',
        templateId: 'activeTalentHub',
        templateTypeCode: 'operating',
        useCase: 'always-on',
        validationRules: [],
      },
      revisionNumber: 1,
      runtimeContractVersion: '1.0.0',
      sourceBundle: [],
      sourceHash: 'sha256-template-proof',
      submittedAt: null,
      validationState: 'ready',
      validationSummary: { issueCount: 0, passCount: 4, warnCount: 0 },
    },
    isInherited: true,
    scope: {
      scopeId: null,
      scopeType: 'tenant',
    },
  };
}

async function preparePage(page: Page, locale: Locale) {
  await page.addInitScript(
    ({ session, localeOverride }) => {
      window.sessionStorage.setItem('tcrn.web.session', JSON.stringify(session));
      window.localStorage.setItem('tcrn.web.locale.override', localeOverride);
    },
    { session: buildSession(locale), localeOverride: locale },
  );

  await page.route('**/api/v1/organization/settings', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        envelope({
          scopeType: 'tenant',
          scopeId: null,
          settings: {
            defaultLanguage: 'zh-CN',
            timezone: 'Asia/Shanghai',
          },
          overrides: [],
          inheritedFrom: {
            defaultLanguage: 'tenant',
            timezone: 'tenant',
          },
          version: 1,
        }),
      ),
    }),
  );

  await page.route('**/api/v1/system-dictionary', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        envelope([
          {
            type: 'artist-status',
            name: locale === 'zh_HANS' ? '艺人状态' : 'Statut artiste',
            description: null,
            count: 3,
          },
          {
            type: 'homepage-template-type',
            name: locale === 'zh_HANS' ? '主页模板类型' : 'Type de modele de page d accueil',
            description: null,
            count: 3,
          },
        ]),
      ),
    }),
  );

  await page.route('**/api/v1/module-capabilities/effective', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        envelope({
          tenantId,
          effective: buildSession(locale).capabilities,
          registryVersion: 'phase-12-public-presence-rebaseline',
        }),
      ),
    }),
  );

  await page.route('**/api/v1/public-presence/assets?*', (route) => {
    const url = new URL(route.request().url());
    const assetKind = url.searchParams.get('assetKind');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(assetKind === 'template' ? [buildTemplateAsset(locale)] : [])),
    });
  });
}

test.describe('P12 Entity Management asset family proof', () => {
  for (const locale of ['zh_HANS', 'fr'] as const) {
    test(`renders localized Public Presence asset families inside Entity Management (${locale})`, async ({
      page,
    }) => {
      await preparePage(page, locale);
      await page.setViewportSize({ width: 1440, height: 980 });
      await page.goto(
        `/tenant/${tenantId}/settings?section=config-entities&configEntityType=homepage-template-asset`,
      );

      const templateFamilyLabel =
        locale === 'zh_HANS' ? '主页模板资产' : 'Asset modele de page d accueil';
      const componentFamilyLabel =
        locale === 'zh_HANS' ? '主页组件资产' : 'Asset composant de page d accueil';
      const pageHeading = locale === 'zh_HANS' ? '租户设置' : /Param.tres du tenant/;
      const assetName = locale === 'zh_HANS' ? '常驻艺人主页' : 'Hub artiste actif';
      const duplicateLabel = locale === 'zh_HANS' ? '复制到此范围' : 'Dupliquer ici';

      await expect(page.getByRole('heading', { name: pageHeading })).toBeVisible();
      await expect(page.getByRole('button', { name: new RegExp(templateFamilyLabel) })).toBeVisible();
      await expect(page.getByRole('button', { name: new RegExp(componentFamilyLabel) })).toBeVisible();
      await expect(page.getByText(templateFamilyLabel, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(assetName, { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: duplicateLabel })).toBeVisible();
      await expect(page.getByText('Homepage Assets')).toHaveCount(0);
      await expect(page.getByText('主页资产')).toHaveCount(0);
      await expect(page.getByText('Template Center')).toHaveCount(0);
      await expect(page.getByText('Component Store')).toHaveCount(0);

      const proof = await page.evaluate(() => {
        const activeButton = [...document.querySelectorAll('button')].find((button) =>
          button.textContent?.includes('homepage-template-asset'),
        );
        const selectedHeading = [...document.querySelectorAll('p')].find((node) =>
          ['主页模板资产', 'Asset modele de page d accueil'].some((label) =>
            node.textContent?.trim().includes(label),
          ),
        );
        const familySection = document.querySelector('[data-testid="asset-family-template"]');
        const workspaceGrid = familySection?.closest('.grid') ?? null;
        const rectOf = (element: Element | null) => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        };
        return {
          activeCatalogButtonText: activeButton?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
          selectedHeadingText: selectedHeading?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
          familySectionParentClass: familySection?.parentElement?.className ?? null,
          familySectionBounds: rectOf(familySection),
          workspaceGridBounds: rectOf(workspaceGrid),
          bodyForbiddenText: {
            homepageAssets: document.body.innerText.includes('Homepage Assets'),
            zhHomepageAssets: document.body.innerText.includes('主页资产'),
            templateCenter: document.body.innerText.includes('Template Center'),
            componentStore: document.body.innerText.includes('Component Store'),
          },
        };
      });

      const prefix =
        locale === 'zh_HANS'
          ? 'p12-ia-tenant-entity-management-desktop-zh_Hans'
          : 'p12-ia-tenant-entity-management-desktop-fr';
      await screenshot(page, `${prefix}.png`);
      await writeDom(page, `${prefix}.dom.txt`);
      writeArtifact(`${prefix}.bounds.json`, proof);
      if (locale === 'zh_HANS') {
        writeArtifact('p12-ia-tenant-entity-management-desktop-zh_Hans.parent.json', proof);
      }
    });
  }
});
