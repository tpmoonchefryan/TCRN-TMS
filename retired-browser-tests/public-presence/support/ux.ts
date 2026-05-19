import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

import { getEvidenceRoot, updateMentalModelProof } from './proof';

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function buildArtifactPath(name: string, extension: 'png' | 'html' | 'json') {
  return path.resolve(getEvidenceRoot(), `${name}.${extension}`);
}

export async function captureRouteEvidence(
  page: Page,
  name: string,
  testInfo: TestInfo,
) {
  const bodyHtml = await page.content();
  const viewport = page.viewportSize() ?? { height: 0, width: 0 };
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);

  if (scrollHeight <= viewport.height) {
    await page.screenshot({ path: buildArtifactPath(name, 'png') });
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: buildArtifactPath(`${name}-top`, 'png') });
    await page.evaluate((height) => window.scrollTo(0, Math.max(0, height / 2 - window.innerHeight / 2)), scrollHeight);
    await page.screenshot({ path: buildArtifactPath(`${name}-mid`, 'png') });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.screenshot({ path: buildArtifactPath(`${name}-bottom`, 'png') });
  }

  writeFileSync(buildArtifactPath(name, 'html'), bodyHtml, 'utf8');
  await testInfo.attach(`${name}-dom`, {
    body: bodyHtml,
    contentType: 'text/html',
  });
}

export async function collectDuplicateVisibleControls(page: Page) {
  return page.evaluate(() => {
    const counts = new Map<string, number>();
    const nodes = Array.from(document.querySelectorAll('button, a'));

    for (const node of nodes) {
      const element = node as HTMLElement;

      if (element.offsetParent === null) {
        continue;
      }

      const label = element.innerText.replace(/\s+/g, ' ').trim();

      if (!label) {
        continue;
      }

      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([label, count]) => ({ count, label }));
  });
}

export async function assertNoUnqualifiedDuplicateControls(page: Page, route: string) {
  const duplicates = await collectDuplicateVisibleControls(page);
  const blockers = duplicates.filter((entry) => /^(Add Template|Add Component|Edit|Configure|Inspect)$/.test(entry.label));

  updateMentalModelProof((current) => ({
    ...current,
    duplicateLabelFindings: [
      ...current.duplicateLabelFindings,
      {
        blockers,
        duplicates,
        route,
      },
    ],
  }));

  expect(blockers, `${route} still exposes unqualified duplicate control labels.`).toEqual([]);
}

export async function recordViewportMetric(
  page: Page,
  route: string,
  surfaceName: string,
  locator: Locator,
) {
  const metric = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));

    return {
      height: rect.height,
      ratio: viewportHeight > 0 ? Number((visibleHeight / viewportHeight).toFixed(3)) : 0,
      top: rect.top,
      visibleHeight,
      viewportHeight,
      width: rect.width,
    };
  });

  updateMentalModelProof((current) => ({
    ...current,
    firstViewportMetrics: [
      ...current.firstViewportMetrics,
      {
        route,
        surfaceName,
        ...metric,
      },
    ],
  }));
}

export async function runCopyScan(
  page: Page,
  route: string,
  {
    allowSchemaTerms = false,
  }: {
    allowSchemaTerms?: boolean;
  } = {},
) {
  const bodyText = normalizeText(
    await page.evaluate(() => document.body.innerText || document.body.textContent || ''),
  );
  const patterns = [
    'projection',
    'content hash',
    'policy version',
    'workflow event id',
    'migration',
    'Puck',
    'CodeMirror',
  ];

  if (!allowSchemaTerms) {
    patterns.push('props schema', 'editable fields', 'editing boundary', 'registry');
  }

  const findings = patterns.filter((pattern) => new RegExp(pattern, 'i').test(bodyText));

  updateMentalModelProof((current) => ({
    ...current,
    copyScanResults: [
      ...current.copyScanResults,
      {
        allowSchemaTerms,
        findings,
        route,
      },
    ],
  }));

  expect(findings, `${route} leaks internal or design-rationale copy.`).toEqual([]);
}

export async function recordRouteTiming(route: string, elapsedMs: number) {
  updateMentalModelProof((current) => ({
    ...current,
    loadingGateTimings: [
      ...current.loadingGateTimings,
      {
        elapsedMs,
        route,
      },
    ],
  }));
}

export async function recordViewport(route: string, viewportLabel: string) {
  updateMentalModelProof((current) => ({
    ...current,
    routeList: current.routeList.includes(route) ? current.routeList : [...current.routeList, route],
    viewportList: current.viewportList.includes(viewportLabel)
      ? current.viewportList
      : [...current.viewportList, viewportLabel],
  }));
}

export async function recordPanelStacking(
  page: Page,
  route: string,
  surfaceSelectors: string[],
) {
  const visibleCount = await page.evaluate((selectors) => (
    selectors.filter((selector) => {
      const node = document.querySelector(selector) as HTMLElement | null;
      return Boolean(node && node.offsetParent !== null);
    }).length
  ), surfaceSelectors);

  updateMentalModelProof((current) => ({
    ...current,
    panelStackingFindings: [
      ...current.panelStackingFindings,
      {
        route,
        selectors: surfaceSelectors,
        visibleCount,
      },
    ],
  }));
}
