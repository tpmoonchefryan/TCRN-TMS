// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const options = {
    route: '/ac/<acTenantId>/platform-tools',
    out: 'a11y-summary.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--route' && next) {
      options.route = next;
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
const sourcePath = path.join(
  webRoot,
  'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
);
const shellPath = path.join(webRoot, 'src/platform/routing/AcShell.tsx');
const sourceText = readFileSync(sourcePath, 'utf8');
const shellText = readFileSync(shellPath, 'utf8');
const checks = [
  {
    id: 'icon_buttons_have_aria_labels',
    passed:
      sourceText.includes('aria-label={`${copy.actions.inspect}') &&
      sourceText.includes('aria-label={`${copy.actions.configure}') &&
      sourceText.includes('aria-label={`${copy.actions.runCheck}') &&
      sourceText.includes('aria-label={`${item.connection.enabled'),
  },
  {
    id: 'drawer_has_close_label',
    passed: sourceText.includes('closeButtonAriaLabel={copy.actions.close}'),
  },
  {
    id: 'status_region_exists',
    passed: sourceText.includes('role="status"') && sourceText.includes('aria-live="polite"'),
  },
  {
    id: 'mobile_touch_targets_are_explicit',
    passed: sourceText.includes('h-11 w-11') && sourceText.includes('sm:h-9 sm:w-9'),
  },
  {
    id: 'mobile_uses_true_list_not_desktop_table',
    passed: sourceText.includes('md:hidden') && sourceText.includes('hidden md:block'),
  },
  {
    id: 'mobile_nav_route_has_shell_entry',
    passed: shellText.includes("key: 'platform-tools'") && shellText.includes('/platform-tools'),
  },
  {
    id: 'horizontal_overflow_is_bounded',
    passed: sourceText.includes('overflow-x-auto') || sourceText.includes('min-w-[860px]'),
  },
];
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'ac_platform_tool_connection',
  route: options.route,
  files: [
    path.relative(webRoot, sourcePath),
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
