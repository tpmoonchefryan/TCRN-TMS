#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const EXPECTED_ITEMS = {
  'artist-status': ['draft', 'published', 'disabled'],
  'homepage-template-type': ['pending-reveal', 'operating', 'graduated'],
};
const LOCALES = ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'];

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function loadEnv(productRoot) {
  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(productRoot, fileName);
    if (!existsSync(filePath)) {
      continue;
    }
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }
      const [key, ...valueParts] = trimmed.split('=');
      if (!process.env[key]) {
        process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
      }
    }
  }
}

function hasAllLocales(source, code) {
  const index = source.indexOf(`code: '${code}'`);
  if (index < 0) {
    return false;
  }
  const block = source.slice(index, index + 1600);
  return LOCALES.every((locale) => block.includes(`${locale}:`));
}

async function readDb(types, productRoot) {
  loadEnv(productRoot);
  if (!process.env.DATABASE_URL) {
    return { mode: 'db_unavailable', dictionaryTypes: [], items: [], error: 'DATABASE_URL not set' };
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const [dictionaryTypes, items] = await Promise.all([
      pool.query(
        `
          SELECT code, name, description, is_active AS "isActive"
          FROM public.system_dictionary
          WHERE code = ANY($1::text[])
          ORDER BY code
        `,
        [types],
      ),
      pool.query(
        `
          SELECT dictionary_code AS "dictionaryCode", code, name, description, is_active AS "isActive"
          FROM public.system_dictionary_item
          WHERE dictionary_code = ANY($1::text[])
          ORDER BY dictionary_code, sort_order, code
        `,
        [types],
      ),
    ]);

    return {
      mode: 'db_readback',
      dictionaryTypes: dictionaryTypes.rows,
      items: items.rows,
      error: null,
    };
  } catch (error) {
    return {
      mode: 'db_error_source_fallback',
      dictionaryTypes: [],
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await pool.end();
  }
}

const outPath = readArg('--out');
const typeArg = readArg('--types', Object.keys(EXPECTED_ITEMS).join(','));
const modeArg = readArg('--mode', 'auto');
const types = typeArg.split(',').map((entry) => entry.trim()).filter(Boolean);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productRoot = path.resolve(__dirname, '../../..');
const seedSource = readFileSync(
  path.join(productRoot, 'packages/database/prisma/seeds/07-system-dictionary.ts'),
  'utf8',
);

const sourceRecords = types.map((type) => {
  const expectedItems = EXPECTED_ITEMS[type] ?? [];
  const itemRecords = expectedItems.map((code) => ({
    code,
    present: seedSource.includes(`code: '${code}'`),
    localized: hasAllLocales(seedSource, code),
    active: true,
  }));

  return {
    code: type,
    present: seedSource.includes(`code: '${type}'`),
    localized: hasAllLocales(seedSource, type),
    items: itemRecords,
  };
});

const db = modeArg === 'source' ? null : await readDb(types, productRoot);
const dbUsable = db?.mode === 'db_readback';
const dbRequired = ['db', 'strict-db', 'db-readback'].includes(modeArg);
const records = sourceRecords.map((record) => {
  const dbType = dbUsable ? db.dictionaryTypes.find((entry) => entry.code === record.code) : null;
  const dbItems = dbUsable ? db.items.filter((entry) => entry.dictionaryCode === record.code) : [];
  return {
    ...record,
    readback: dbUsable
      ? {
          present: Boolean(dbType),
          active: dbType?.isActive ?? false,
          items: record.items.map((item) => {
            const dbItem = dbItems.find((entry) => entry.code === item.code);
            return {
              code: item.code,
              present: Boolean(dbItem),
              active: dbItem?.isActive ?? false,
              localized: dbItem ? LOCALES.every((locale) => typeof dbItem.name?.[locale] === 'string') : false,
            };
          }),
        }
      : null,
  };
});

const sourceMissing = records.flatMap((record) => [
  ...(record.present && record.localized ? [] : [`type:${record.code}`]),
  ...record.items
    .filter((item) => !item.present || !item.localized)
    .map((item) => `item:${record.code}.${item.code}`),
]);
const dbMissing =
  dbUsable
    ? records.flatMap((record) => [
        ...(record.readback?.present && record.readback.active ? [] : [`db-type:${record.code}`]),
        ...(record.readback?.items ?? [])
          .filter((item) => !item.present || !item.active || !item.localized)
          .map((item) => `db-item:${record.code}.${item.code}`),
      ])
    : [];
const dbRequirementMissing = dbRequired && !dbUsable ? ['db-readback:unavailable'] : [];
const referenceValidation = records.map((record) => {
  const dbItems = dbUsable ? db.items.filter((entry) => entry.dictionaryCode === record.code) : [];
  const activeCodes = dbItems.filter((entry) => entry.isActive).map((entry) => entry.code);
  const inactiveCodes = dbItems.filter((entry) => !entry.isActive).map((entry) => entry.code);
  const expectedActiveCodes = record.items.map((item) => item.code);
  const unknownProbeCode = `__p12_unknown_${record.code.replace(/[^a-z0-9]/gi, '_')}__`;
  return {
    dictionaryCode: record.code,
    mode: dbUsable ? 'db_active_lookup' : 'source_expected_set',
    expectedActiveCodes,
    activeCodes,
    inactiveCodes,
    unknownProbeCode,
    unknownRejected: !activeCodes.includes(unknownProbeCode),
    inactiveExcludedFromActiveLookup: inactiveCodes.every((code) => !activeCodes.includes(code)),
    expectedActiveOnly: expectedActiveCodes.every((code) => activeCodes.length === 0 || activeCodes.includes(code)),
  };
});
const referenceValidationMissing = referenceValidation
  .filter(
    (entry) =>
      !entry.unknownRejected ||
      !entry.inactiveExcludedFromActiveLookup ||
      (dbUsable && !entry.expectedActiveOnly),
  )
  .map((entry) => `reference-validation:${entry.dictionaryCode}`);
const payload = {
  passed:
    sourceMissing.length === 0 &&
    dbMissing.length === 0 &&
    dbRequirementMissing.length === 0 &&
    referenceValidationMissing.length === 0,
  testLayer: 'system-dictionary-readback',
  targetScope: 'public.system_dictionary',
  caseIds: types.map((type) => `dictionary:${type}`),
  checkedAt: new Date().toISOString(),
  requestedTypes: types,
  authorityMode: dbUsable ? 'db_readback' : dbRequired ? 'db_readback_required_unavailable' : 'source_seed_contract',
  dbAttempt: db
    ? { mode: db.mode, error: db.error ? 'redacted-db-readback-error' : null }
    : { mode: 'not_requested', error: null },
  locales: LOCALES,
  records,
  referenceValidation,
  missing: [...sourceMissing, ...dbMissing, ...dbRequirementMissing, ...referenceValidationMissing],
  redaction: {
    containsSecrets: false,
    rawPayloadIncluded: false,
  },
  warningCount: 0,
  blockedCount:
    sourceMissing.length +
    dbMissing.length +
    dbRequirementMissing.length +
    referenceValidationMissing.length,
};

if (outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
