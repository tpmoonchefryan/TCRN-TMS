// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const options = {
    routes: ['/ac/<acTenantId>/platform-tools'],
    out: 'a11y-summary.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--route' && next) {
      options.routes.push(next);
      index += 1;
    } else if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    }
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const platformToolsPath = path.join(
  webRoot,
  'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
);
const observabilityPath = path.join(
  webRoot,
  'src/domains/observability/screens/ObservabilityScreen.tsx'
);
const shellPath = path.join(webRoot, 'src/platform/routing/AcShell.tsx');
const platformToolsText = readFileSync(platformToolsPath, 'utf8');
const observabilityText = readFileSync(observabilityPath, 'utf8');
const shellText = readFileSync(shellPath, 'utf8');
const checks = [
  {
    id: 'icon_buttons_have_aria_labels',
    passed:
      platformToolsText.includes('aria-label={`${copy.actions.inspect}') &&
      platformToolsText.includes('aria-label={`${copy.actions.configure}') &&
      platformToolsText.includes('aria-label={`${copy.actions.runCheck}') &&
      platformToolsText.includes('aria-label={`${item.connection.enabled') &&
      observabilityText.includes('Open external observability handoff'),
  },
  {
    id: 'drawer_has_close_label',
    passed:
      platformToolsText.includes('closeButtonAriaLabel={copy.actions.close}') &&
      observabilityText.includes('closeButtonAriaLabel={closeDetailsLabel}'),
  },
  {
    id: 'status_region_exists',
    passed:
      platformToolsText.includes('role="status"') &&
      platformToolsText.includes('aria-live="polite"') &&
      observabilityText.includes('role="status"') &&
      observabilityText.includes('aria-live="polite"'),
  },
  {
    id: 'mobile_touch_targets_are_explicit',
    passed:
      platformToolsText.includes('h-11 w-11') &&
      platformToolsText.includes('sm:h-9 sm:w-9') &&
      observabilityText.includes('h-11 w-11'),
  },
  {
    id: 'mobile_uses_true_list_not_desktop_table',
    passed:
      platformToolsText.includes('md:hidden') &&
      platformToolsText.includes('hidden md:block') &&
      observabilityText.includes('md:grid-cols-2'),
  },
  {
    id: 'mobile_nav_route_has_shell_entry',
    passed: shellText.includes("key: 'platform-tools'") && shellText.includes('/platform-tools'),
  },
  {
    id: 'horizontal_overflow_is_bounded',
    passed:
      (platformToolsText.includes('overflow-x-auto') || platformToolsText.includes('min-w-[860px]')) &&
      observabilityText.includes('grid gap-3 md:grid-cols-2 xl:grid-cols-3'),
  },
  {
    id: 'no_iframe_dashboard_clone',
    passed: !platformToolsText.includes('<iframe') && !observabilityText.includes('<iframe'),
  },
  {
    id: 'tenant_external_observability_absence_marker',
    passed: observabilityText.includes('data-external-observability-absent'),
  },
];
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'observability_adapter_foundation',
  routes: Array.from(new Set(options.routes)),
  files: [
    path.relative(webRoot, platformToolsPath),
    path.relative(webRoot, observabilityPath),
    path.relative(webRoot, shellPath),
  ],
  checks,
  passed: checks.every((check) => check.passed),
};

mkdirSync(path.dirname(options.out), { recursive: true });
writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
