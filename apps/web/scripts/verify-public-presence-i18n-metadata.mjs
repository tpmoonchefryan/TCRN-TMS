#!/usr/bin/env node
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productRoot = path.resolve(__dirname, '../../..');
const REQUIRED_CATALOG_TYPES = [
  'artist-stage',
  'homepage-template-asset',
  'homepage-component-asset',
];
const REQUIRED_FIELD_KEYS = ['artistStatusCode', 'homepageTemplateTypeCode'];
const REQUIRED_DICTIONARY_TYPES = ['artist-status', 'homepage-template-type'];

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readText(relativePath) {
  return readFileSync(path.join(productRoot, relativePath), 'utf8');
}

function parseLocales() {
  const source = readText('packages/shared/src/constants/locale.ts');
  const match = source.match(/SUPPORTED_UI_LOCALES\s*=\s*\[([^\]]+)\]/);
  if (!match) {
    throw new Error('SUPPORTED_UI_LOCALES could not be parsed.');
  }
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function objectBlockAfter(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    return '';
  }

  const start = source.indexOf('{', markerIndex);
  if (start < 0) {
    return '';
  }

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return '';
}

function localeBlock(source, locale) {
  const index = source.indexOf(`${locale}:`);
  if (index < 0) {
    return '';
  }

  const start = source.indexOf('{', index);
  if (start < 0) {
    return '';
  }

  let depth = 0;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(index, cursor + 1);
      }
    }
  }

  return '';
}

const outPath = readArg('--out');
const localeArg = readArg('--locales', 'all');
const locales = parseLocales();
const selectedLocales =
  localeArg === 'all' ? locales : localeArg.split(',').map((entry) => entry.trim()).filter(Boolean);

const settingsCopy = readText('apps/web/src/domains/config-dictionary-settings/screens/settings-family.copy.ts');
const catalogSource = readText(
  'apps/web/src/domains/config-dictionary-settings/components/config-entity-catalog.ts',
);
const dictionarySeed = readText('packages/database/prisma/seeds/07-system-dictionary.ts');
const assetRuntime = readText('packages/shared/src/public-presence/asset-runtime.ts');
const catalogCopySection = objectBlockAfter(settingsCopy, 'const CONFIG_ENTITY_COPY');
const fieldCopySection = objectBlockAfter(settingsCopy, 'const CONFIG_FIELD_COPY');

const localeResults = selectedLocales.map((locale) => {
  const block = locale === 'en' ? catalogSource : localeBlock(catalogCopySection, locale);
  const fieldBlock = locale === 'en' ? catalogSource : localeBlock(fieldCopySection, locale);
  const dictionaryBlock = locale === 'en' ? dictionarySeed : localeBlock(dictionarySeed, locale);
  const assetBlock = locale === 'en' ? assetRuntime : localeBlock(assetRuntime, locale);
  const catalogTypes = REQUIRED_CATALOG_TYPES.map((type) => ({
    type,
    present: block.includes(type),
  }));
  const fieldKeys = REQUIRED_FIELD_KEYS.map((key) => ({
    key,
    present: fieldBlock.includes(key),
  }));
  const dictionaryTypes = REQUIRED_DICTIONARY_TYPES.map((type) => ({
    type,
    present: dictionarySeed.includes(`code: '${type}'`) && dictionaryBlock.length > 0,
  }));
  const systemAssetText = {
    locale,
    templateSeedTextPresent: assetBlock.includes(locale === 'en' ? 'Active Talent Hub' : locale),
    componentSeedTextPresent: assetBlock.length > 0,
  };
  const missing = [
    ...catalogTypes.filter((entry) => !entry.present).map((entry) => `catalog:${entry.type}`),
    ...fieldKeys.filter((entry) => !entry.present).map((entry) => `field:${entry.key}`),
    ...dictionaryTypes.filter((entry) => !entry.present).map((entry) => `dictionary:${entry.type}`),
    ...(systemAssetText.componentSeedTextPresent ? [] : ['asset-runtime:component-seed-text']),
  ];

  return {
    locale,
    catalogTypes,
    fieldKeys,
    dictionaryTypes,
    systemAssetText,
    missing,
    passed: missing.length === 0,
  };
});

const missingLocales = selectedLocales.filter((locale) => !locales.includes(locale));
const payload = {
  passed: missingLocales.length === 0 && localeResults.every((entry) => entry.passed),
  checkedAt: new Date().toISOString(),
  productRoot,
  locales: selectedLocales,
  supportedLocales: locales,
  missingLocales,
  requiredCatalogTypes: REQUIRED_CATALOG_TYPES,
  requiredFieldKeys: REQUIRED_FIELD_KEYS,
  requiredDictionaryTypes: REQUIRED_DICTIONARY_TYPES,
  results: localeResults,
  warningCount: 0,
  blockedCount:
    missingLocales.length + localeResults.reduce((total, entry) => total + entry.missing.length, 0),
};

if (outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
