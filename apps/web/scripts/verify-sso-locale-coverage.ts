import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const LOCALES = ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'] as const;
type Locale = (typeof LOCALES)[number];

const TENANT_SSO_CONTROL_STRINGS: Array<Record<Locale, string>> = [
  {
    en: 'Add provider',
    zh_HANS: '新增提供方',
    zh_HANT: '新增提供者',
    ja: 'プロバイダーを追加',
    ko: '공급자 추가',
    fr: 'Ajouter un fournisseur',
  },
  {
    en: 'Keep secret',
    zh_HANS: '保留密钥',
    zh_HANT: '保留密鑰',
    ja: 'シークレットを保持',
    ko: '비밀 값 유지',
    fr: 'Conserver le secret',
  },
  {
    en: 'Replace secret',
    zh_HANS: '替换密钥',
    zh_HANT: '替換密鑰',
    ja: 'シークレットを置換',
    ko: '비밀 값 교체',
    fr: 'Remplacer le secret',
  },
  {
    en: 'Clear secret',
    zh_HANS: '清除密钥',
    zh_HANT: '清除密鑰',
    ja: 'シークレットを削除',
    ko: '비밀 값 지우기',
    fr: 'Effacer le secret',
  },
  {
    en: 'Check discovery',
    zh_HANS: '检查发现配置',
    zh_HANT: '檢查探索設定',
    ja: 'ディスカバリーを確認',
    ko: '디스커버리 확인',
    fr: 'Verifier la decouverte',
  },
  {
    en: 'Saving provider',
    zh_HANS: '正在保存提供方',
    zh_HANT: '正在儲存提供者',
    ja: 'プロバイダーを保存中',
    ko: '공급자 저장 중',
    fr: 'Enregistrement du fournisseur',
  },
  {
    en: 'Save provider',
    zh_HANS: '保存提供方',
    zh_HANT: '儲存提供者',
    ja: 'プロバイダーを保存',
    ko: '공급자 저장',
    fr: 'Enregistrer le fournisseur',
  },
  {
    en: 'Edit provider',
    zh_HANS: '编辑提供方',
    zh_HANT: '編輯提供者',
    ja: 'プロバイダーを編集',
    ko: '공급자 편집',
    fr: 'Modifier le fournisseur',
  },
  {
    en: 'Disable provider',
    zh_HANS: '停用提供方',
    zh_HANT: '停用提供者',
    ja: 'プロバイダーを無効化',
    ko: '공급자 비활성화',
    fr: 'Desactiver le fournisseur',
  },
  {
    en: 'Enable provider',
    zh_HANS: '启用提供方',
    zh_HANT: '啟用提供者',
    ja: 'プロバイダーを有効化',
    ko: '공급자 활성화',
    fr: 'Activer le fournisseur',
  },
];

const TARGETS = [
  {
    surface: 'sso_callback',
    file: 'apps/web/src/domains/auth-identity/components/SsoCallbackScreen.tsx',
    anchors: ['SSO sign-in', 'SSO account link', 'SSO result is missing or expired.'],
  },
  {
    surface: 'profile_account_link',
    file: 'apps/web/src/domains/profile/screens/ProfileScreen.tsx',
    anchors: ['Single sign-on connections', 'Link provider', 'External-tool SSO readiness'],
  },
  {
    surface: 'tenant_sso_settings',
    file: 'apps/web/src/domains/config-dictionary-settings/screens/TenantSettingsScreen.tsx',
    anchors: ['Single Sign-On', 'Loading SSO providers', 'Configured (redacted)'],
  },
] as const;

interface CliOptions {
  out: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    out: 'sso-locale-coverage.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    }
  }

  return options;
}

function verifyTarget(target: (typeof TARGETS)[number]) {
  const source = readFileSync(target.file, 'utf8');
  const missingLocales = LOCALES.filter((locale) => !source.includes(`${locale}:`));
  const missingAnchors = target.anchors.filter((anchor) => !source.includes(anchor));

  return {
    surface: target.surface,
    file: target.file,
    locales: Object.fromEntries(LOCALES.map((locale) => [locale, source.includes(`${locale}:`)])),
    missingLocales,
    anchors: Object.fromEntries(target.anchors.map((anchor) => [anchor, source.includes(anchor)])),
    missingAnchors,
    passed: missingLocales.length === 0 && missingAnchors.length === 0,
  };
}

function extractLegacyOverrideBlock(source: string, key: string) {
  const needle = `'${key}': buildExactText(`;
  const start = source.indexOf(needle);
  if (start < 0) {
    return null;
  }

  const end = source.indexOf('\n  ),', start);
  if (end < 0) {
    return null;
  }

  return source.slice(start, end);
}

function verifyTenantSsoControlStrings() {
  const componentSource = readFileSync(
    'apps/web/src/domains/config-dictionary-settings/screens/TenantSettingsScreen.tsx',
    'utf8'
  );
  const copySource = readFileSync(
    'apps/web/src/domains/config-dictionary-settings/screens/settings-family.copy.ts',
    'utf8'
  );

  const controls = TENANT_SSO_CONTROL_STRINGS.map((control) => {
    const overrideBlock = extractLegacyOverrideBlock(copySource, control.en);
    const missingLocales = LOCALES.filter(
      (locale) => overrideBlock?.includes(`'${control[locale]}'`) !== true
    );
    const componentAnchorPresent = componentSource.includes(control.en);

    return {
      en: control.en,
      componentAnchorPresent,
      overridePresent: Boolean(overrideBlock),
      locales: Object.fromEntries(
        LOCALES.map((locale) => [locale, Boolean(overrideBlock?.includes(`'${control[locale]}'`))])
      ),
      missingLocales,
      passed: componentAnchorPresent && Boolean(overrideBlock) && missingLocales.length === 0,
    };
  });

  return {
    surface: 'tenant_sso_management_controls',
    sourceFiles: [
      'apps/web/src/domains/config-dictionary-settings/screens/TenantSettingsScreen.tsx',
      'apps/web/src/domains/config-dictionary-settings/screens/settings-family.copy.ts',
    ],
    controls,
    passed: controls.every((control) => control.passed),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = TARGETS.map(verifyTarget);
  const tenantSsoControlStrings = verifyTenantSsoControlStrings();
  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'source_scan',
    data_mode: 'read_only_uat',
    target_scope: 'profile_account_link',
    locales: LOCALES,
    targets,
    tenantSsoControlStrings,
    passed: targets.every((target) => target.passed) && tenantSsoControlStrings.passed,
  };

  mkdirSync(path.dirname(options.out), { recursive: true });
  writeFileSync(options.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

main();
