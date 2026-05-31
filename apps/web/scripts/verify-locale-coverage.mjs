// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const options = {
    scope: 'platform-tool-connections',
    locales: ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'fr'],
    out: 'locale-coverage.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--scope' && next) {
      options.scope = next;
      index += 1;
    } else if (arg === '--locales' && next) {
      options.locales = next.split(',').map((item) => item.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    }
  }

  return options;
}

function normalizeLocale(locale) {
  return locale.replace('zh-Hans', 'zh_HANS').replace('zh-Hant', 'zh_HANT');
}

const options = parseArgs(process.argv.slice(2));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const filesByScope = {
  'platform-tool-connections': [
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/platform-tool-connections.copy.ts'
    ),
    path.join(webRoot, 'src/platform/routing/AcShell.tsx'),
  ],
  'observability-adapter-foundation': [
    path.join(webRoot, 'src/domains/observability/screens/observability.copy.ts'),
    path.join(webRoot, 'src/domains/observability/screens/ObservabilityScreen.tsx'),
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/platform-tool-connections.copy.ts'
    ),
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
    ),
    path.join(webRoot, 'src/platform/routing/AcShell.tsx'),
  ],
  'runtime-feature-flag-adapter': [
    path.join(webRoot, 'src/domains/runtime-flags/screens/runtime-flags.copy.ts'),
    path.join(webRoot, 'src/domains/runtime-flags/screens/RuntimeFlagsScreen.tsx'),
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/platform-tool-connections.copy.ts'
    ),
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
    ),
    path.join(webRoot, 'src/platform/routing/AcShell.tsx'),
  ],
  'webhook-delivery-adapter': [
    path.join(webRoot, 'src/domains/integration-management/screens/integration-management.copy.ts'),
    path.join(webRoot, 'src/domains/integration-management/screens/IntegrationManagementScreen.tsx'),
    path.join(webRoot, 'src/domains/webhook-management/screens/WebhookManagementScreen.tsx'),
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/platform-tool-connections.copy.ts'
    ),
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
    ),
    path.join(webRoot, 'src/platform/routing/AcShell.tsx'),
  ],
  'event-backbone-adapter': [
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/platform-tool-connections.copy.ts'
    ),
    path.join(
      webRoot,
      'src/domains/platform-tool-connections/screens/PlatformToolConnectionsScreen.tsx'
    ),
    path.join(webRoot, 'src/domains/event-backbone/api/event-backbone.api.ts'),
    path.join(webRoot, 'src/app/ac/[tenantId]/platform-tools/page.tsx'),
    path.join(webRoot, 'src/platform/routing/AcShell.tsx'),
  ],
};
const files = filesByScope[options.scope] ?? [];
const fileTexts = files.map((filePath) => ({
  filePath,
  text: readFileSync(filePath, 'utf8'),
}));
const normalizedLocales = options.locales.map(normalizeLocale);
const coverage = normalizedLocales.map((locale) => ({
  locale,
  presentInFiles: fileTexts
    .filter((entry) => entry.text.includes(`${locale}:`) || entry.text.includes(`'${locale}'`))
    .map((entry) => path.relative(webRoot, entry.filePath)),
}));
const missingLocales = coverage.filter((entry) => entry.presentInFiles.length === 0);
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: options.scope,
  requestedLocales: options.locales,
  normalizedLocales,
  files: files.map((filePath) => path.relative(webRoot, filePath)),
  coverage,
  missingLocales,
  passed: files.length > 0 && missingLocales.length === 0,
};

mkdirSync(path.dirname(options.out), { recursive: true });
writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
