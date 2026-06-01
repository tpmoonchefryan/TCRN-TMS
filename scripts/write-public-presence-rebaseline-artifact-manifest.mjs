#!/usr/bin/env node
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CASES = [
  {
    id: 'entity-management-tenant-placement',
    files: [
      'p12-ia-tenant-entity-management-desktop-zh_Hans.png',
      'p12-ia-tenant-entity-management-desktop-zh_Hans.dom.txt',
      'p12-ia-tenant-entity-management-desktop-zh_Hans.bounds.json',
      'p12-ia-tenant-entity-management-desktop-zh_Hans.parent.json',
      'p12-ia-tenant-entity-management-mobile-zh_Hans.png',
      'p12-ia-tenant-entity-management-mobile-zh_Hans.dom.txt',
    ],
  },
  {
    id: 'entity-management-lower-scopes',
    files: [
      'p12-ia-subsidiary-entity-management-desktop-zh_Hans.png',
      'p12-ia-subsidiary-entity-management-desktop-zh_Hans.dom.txt',
      'p12-ia-subsidiary-entity-management-desktop-zh_Hans.bounds.json',
      'p12-ia-subsidiary-entity-management-desktop-zh_Hans.parent.json',
      'p12-ia-talent-entity-management-desktop-zh_Hans.png',
      'p12-ia-talent-entity-management-desktop-zh_Hans.dom.txt',
      'p12-ia-talent-entity-management-desktop-zh_Hans.bounds.json',
      'p12-ia-talent-entity-management-desktop-zh_Hans.parent.json',
    ],
  },
  {
    id: 'system-dictionaries',
    files: [
      'p12-dict-ac-system-dictionary-desktop-zh_Hans.png',
      'p12-dict-ac-system-dictionary-desktop-zh_Hans.dom.txt',
      'p12-dict-ac-system-dictionary-ui-proof.json',
      'p12-system-dictionary-readback.json',
    ],
  },
  {
    id: 'artist-stage-drawer',
    files: [
      'p12-stage-edit-drawer-desktop-zh_Hans.png',
      'p12-stage-edit-drawer-desktop-zh_Hans.dom.txt',
      'p12-stage-edit-drawer-focus.json',
      'p12-artist-stage-update-readback.json',
    ],
  },
  {
    id: 'tenant-flow',
    files: [
      'p12-flow-tenant-edit-desktop-zh_Hans.png',
      'p12-flow-tenant-edit-desktop-zh_Hans.dom.txt',
      'p12-flow-lower-readonly-desktop-zh_Hans.png',
      'p12-flow-lower-readonly-focus.json',
      'p12-homepage-policy-readback.json',
    ],
  },
  {
    id: 'homepage-management',
    files: [
      'p12-homepage-policy-completeness-desktop-zh_Hans.png',
      'p12-homepage-policy-completeness-mobile-zh_Hans.png',
      'p12-homepage-management-blocked-desktop-zh_Hans.dom.txt',
      'p12-homepage-wrong-tenant-denial.json',
    ],
  },
  {
    id: 'asset-create-duplicate-ide',
    files: [
      'p12-asset-create-template-desktop-zh_Hans.png',
      'p12-asset-create-component-desktop-zh_Hans.png',
      'p12-asset-duplicate-tenant-readback.json',
      'p12-asset-duplicate-subsidiary-readback.json',
      'p12-asset-duplicate-talent-readback.json',
      'p12-template-ide-desktop-zh_Hans.png',
      'p12-template-ide-desktop-zh_Hans.bounds.json',
      'p12-template-ide-mobile-zh_Hans.png',
      'p12-template-ide-mobile-zh_Hans.bounds.json',
      'p12-template-ide-save-reload-readback.json',
      'p12-template-ide-focus.json',
      'p12-component-ide-desktop-zh_Hans.png',
      'p12-component-ide-desktop-zh_Hans.bounds.json',
      'p12-component-ide-mobile-zh_Hans.png',
      'p12-component-ide-mobile-zh_Hans.bounds.json',
      'p12-component-ide-save-reload-readback.json',
      'p12-component-ide-focus.json',
      'p12-system-asset-write-denial.json',
    ],
  },
  {
    id: 'studio',
    files: [
      'p12-studio-covered-desktop-zh_Hans.png',
      'p12-studio-covered-desktop-zh_Hans.dom.txt',
      'p12-studio-covered-desktop-zh_Hans.bounds.json',
      'p12-studio-blocked-desktop-zh_Hans.png',
      'p12-studio-blocked-desktop-zh_Hans.dom.txt',
      'p12-studio-mobile-zh_Hans.png',
      'p12-studio-mobile-zh_Hans.bounds.json',
      'p12-studio-review-publish-focus.json',
      'p12-studio-blocked-focus.json',
    ],
  },
  {
    id: 'publish-public',
    files: [
      'p12-public-fan-route-desktop-zh_Hans.png',
      'p12-public-fan-route-mobile-zh_Hans.png',
      'p12-public-fan-route-desktop-en_US.png',
      'p12-publish-pin-readback.json',
      'p12-public-projection-readback.json',
      'p12-post-publish-immutability-readback.json',
    ],
  },
  {
    id: 'security-negative',
    files: [
      'p12-tenant-isolation-negative-readback.json',
      'p12-asset-ide-wrong-tenant-denial.json',
      'p12-asset-duplicate-wrong-tenant-denial.json',
      'p12-publish-wrong-tenant-denial.json',
    ],
  },
  {
    id: 'aggregate',
    files: [
      'p12-required-artifacts.json',
      'p12-browser-proof.json',
      'p12-api-readback.json',
      'p12-i18n-metadata-readback.json',
      'p12-a11y-report.json',
      'p12-layout-bounds.json',
      'p12-copy-boundary-scan.json',
      'p12-full-acceptance-matrix.json',
      'p12-full-acceptance-summary.md',
      'p12-artifact-verification.json',
      'p12-evidence-redaction-report.json',
      'p12-entity-management-drawer-focus.json',
      'p12-asset-duplicate-focus.json',
      'p12-mobile-sheets-a11y.json',
    ],
  },
  {
    id: 'p12-s9-closeout',
    includeInAll: false,
    files: [
      'phase-12-s9-static-cleanup-closeout-summary.md',
      'p12-source-scan-classification.json',
      'p12-source-scan-classification.md',
      'p12-s9-source-scan.command.log',
      'p12-s9-git-diff-check.log',
      'p12-s9-shared-public-presence-vitest.log',
      'p12-s9-database-generate.log',
      'p12-s9-api-typecheck.log',
      'p12-s9-web-typecheck.log',
      'p12-s9-api-aggregate-vitest.log',
      'p12-s9-web-aggregate-vitest.log',
      'p12-s9-public-presence-studio-focused-vitest.log',
      'p12-s9-subsidiary-settings-vitest.log',
      'p12-fixture-readback.json',
      'p12-s9-fixture-readback-refresh.command.log',
      'p12-full-uiux-playwright.log',
      'p12-required-artifacts.json',
      'p12-artifact-verification.json',
      'p12-s9-artifact-verification.command.log',
      'p12-uat-restore.json',
      'p12-fixture-cleanup.json',
      'p12-fixture-idempotence.json',
      'p12-s9-uat-restore.command.log',
      'p12-s9-fixture-cleanup.command.log',
      'p12-s9-fixture-idempotence.command.log',
      'p12-s9-log-warning-error-scan.log',
      'p12-s9-command-envelope.json',
      'p12-s9-resource-ledger-readback.json',
      'p12-s9-runtime-guard-drift-report.log',
      'p12-s9-local-track-status-before-refresh.log',
      'p12-s9-local-track-status-after-refresh.log',
    ],
  },
];

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const outPath = readArg('--out');
const sourcePlan = readArg('--source-plan', 'phase-12');
const caseFilter = readArg('--case', 'all');

if (!outPath) {
  console.error('--out is required');
  process.exit(1);
}

const selectedCases =
  caseFilter === 'all' ? CASES.filter((entry) => entry.includeInAll !== false) : CASES.filter((entry) => entry.id === caseFilter);

if (selectedCases.length === 0) {
  console.error(`Unknown Phase 12 artifact case: ${caseFilter}`);
  process.exit(1);
}

const requiredFiles = [...new Set(selectedCases.flatMap((entry) => entry.files))].sort();
const payload = {
  passed: true,
  sourcePlan,
  case: caseFilter,
  generatedAt: new Date().toISOString(),
  requiredFiles,
  cases: selectedCases,
  warningCount: 0,
  blockedCount: 0,
};

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(payload, null, 2));
