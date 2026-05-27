import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHECKS = [
  {
    id: 'callback-live-region',
    file: 'src/domains/auth-identity/components/SsoCallbackScreen.tsx',
    required: [
      "role={state === 'failed' ? 'alert' : 'status'}",
      'aria-live="polite"',
      'returnButtonRef.current?.focus()',
      'Return to sign-in',
    ],
  },
  {
    id: 'profile-link-buttons',
    file: 'src/domains/profile/screens/ProfileScreen.tsx',
    required: [
      'type="button"',
      'disabled={isStartingSsoLink || hasActiveLink}',
      '<Link2 className="h-4 w-4" aria-hidden="true" />',
      '<Link2Off className="h-4 w-4" aria-hidden="true" />',
    ],
  },
  {
    id: 'tenant-sso-redaction-copy',
    file: 'src/domains/config-dictionary-settings/screens/TenantSettingsScreen.tsx',
    required: ['Configured (redacted)', 'clientSecretConfigured', 'tenant_product'],
  },
] as const;

interface CliOptions {
  out: string;
  browserManifest?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    out: 'sso-a11y-summary.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    } else if (arg === '--browser-manifest' && next) {
      options.browserManifest = next;
      index += 1;
    }
  }

  return options;
}

function verifyBrowserManifest(filePath?: string) {
  if (!filePath) {
    return [
      {
        id: 'browser-manifest-provided',
        passed: false,
        detail: 'missing --browser-manifest',
      },
    ];
  }

  const manifest = JSON.parse(readFileSync(filePath, 'utf8')) as {
    cases?: Array<{
      id: string;
      focusedElement?: { tagName: string; text: string } | null;
      boxes?: Record<string, { visibleInViewport?: boolean } | null>;
    }>;
  };
  const cases = new Map((manifest.cases ?? []).map((item) => [item.id, item]));
  const callbackErrorCases = ['callback-error-desktop', 'callback-error-zh-mobile'];
  const requiredMatrixCases = [
    'login-sso-provider-mobile',
    'login-sso-provider-zh-desktop',
    'callback-success-profile-redirect-desktop',
    'callback-success-profile-redirect-zh-mobile',
    'profile-sso-unlinked-mobile',
    'profile-sso-unlinked-zh-desktop',
    'tenant-sso-settings-desktop',
    'tenant-sso-settings-zh-mobile',
    'ac-external-tool-sso-readiness-desktop',
    'ac-external-tool-sso-readiness-zh-mobile',
  ];
  const allBoxesVisible = [...cases.values()].every((item) =>
    Object.values(item.boxes ?? {}).every((box) => box === null || box.visibleInViewport === true)
  );

  return [
    {
      id: 'browser-matrix-en-zh-desktop-mobile',
      passed: requiredMatrixCases.every((id) => cases.has(id)),
      detail: requiredMatrixCases,
    },
    {
      id: 'callback-error-focus-return-action',
      passed: callbackErrorCases.every((id) => cases.get(id)?.focusedElement?.tagName === 'BUTTON'),
      detail: callbackErrorCases.map((id) => ({ id, focusedElement: cases.get(id)?.focusedElement })),
    },
    {
      id: 'bounding-boxes-visible-in-viewport',
      passed: allBoxesVisible,
      detail: [...cases.values()].map((item) => ({ id: item.id, boxes: item.boxes })),
    },
  ];
}

function verifyCheck(check: (typeof CHECKS)[number]) {
  const source = readFileSync(check.file, 'utf8');
  const missing = check.required.filter((needle) => !source.includes(needle));

  return {
    id: check.id,
    file: check.file,
    required: check.required,
    missing,
    passed: missing.length === 0,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const checks = CHECKS.map(verifyCheck);
  const runtimeChecks = verifyBrowserManifest(options.browserManifest);
  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'read_only_uat',
    target_scope: 'profile_account_link',
    checks,
    runtimeChecks,
    passed: checks.every((check) => check.passed) && runtimeChecks.every((check) => check.passed),
  };

  mkdirSync(path.dirname(options.out), { recursive: true });
  writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

main();
