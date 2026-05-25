import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  SUPPORTED_UI_LOCALES,
} from '../../../shared/src/constants/locale';
import {
  ARTIST_STATUS_CODES,
  ARTIST_STATUS_DICTIONARY_CODE,
  HOMEPAGE_TEMPLATE_TYPE_DICTIONARY_CODE,
  PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
  PUBLIC_PRESENCE_TEMPLATE_TYPE_CODES,
} from '../../../shared/src/public-presence';
import { getPublicPresenceSystemAssetSeeds } from '../../../shared/src/public-presence/asset-runtime';

const DATABASE_ROOT = process.cwd();
const SHARED_ROOT = join(DATABASE_ROOT, '..', 'shared');

function readDatabaseFile(...segments: string[]) {
  return readFileSync(join(DATABASE_ROOT, ...segments), 'utf8');
}

function readSharedFile(...segments: string[]) {
  return readFileSync(join(SHARED_ROOT, ...segments), 'utf8');
}

function assertLocalizedText(label: string, value: Record<string, unknown>) {
  for (const locale of SUPPORTED_UI_LOCALES) {
    assert.equal(
      typeof value[locale],
      'string',
      `${label} must include locale ${locale}`,
    );
    assert.notEqual(String(value[locale]).trim(), '', `${label}.${locale} must not be empty`);
  }
}

describe('Public Presence seed contract', () => {
  it('declares Artist Status and Homepage Template Type system dictionaries with supported locales', () => {
    const dictionarySeed = readDatabaseFile('prisma', 'seeds', '07-system-dictionary.ts');

    assert.match(dictionarySeed, new RegExp(`code:\\s*'${ARTIST_STATUS_DICTIONARY_CODE}'`));
    assert.match(dictionarySeed, new RegExp(`code:\\s*'${HOMEPAGE_TEMPLATE_TYPE_DICTIONARY_CODE}'`));

    for (const statusCode of ARTIST_STATUS_CODES) {
      assert.match(dictionarySeed, new RegExp(`code:\\s*'${statusCode}'`));
    }

    for (const templateTypeCode of PUBLIC_PRESENCE_TEMPLATE_TYPE_CODES) {
      assert.match(dictionarySeed, new RegExp(`code:\\s*'${templateTypeCode}'`));
    }

    for (const locale of SUPPORTED_UI_LOCALES) {
      assert.match(dictionarySeed, new RegExp(`${locale}:\\s*'[^']+'`));
    }
  });

  it('builds source-backed localized system template and component asset seeds', () => {
    const seeds = getPublicPresenceSystemAssetSeeds();
    const templateSeeds = seeds.filter((seed) => seed.assetKind === 'template');
    const componentSeeds = seeds.filter((seed) => seed.assetKind === 'component');

    assert.ok(templateSeeds.length >= 2, 'expected at least active and reveal template seeds');
    assert.ok(componentSeeds.length > 0, 'expected system component seeds');

    for (const seed of seeds) {
      assertLocalizedText(`${seed.code}.name`, seed.name);
      assertLocalizedText(`${seed.code}.description`, seed.description);
      assert.equal(seed.manifest.runtimeContractVersion, PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION);
      assert.equal(seed.manifest.assetKind, seed.assetKind);
      assert.ok(seed.sourceBundle.length > 0, `${seed.code} must have a source bundle`);
      assert.ok(
        seed.sourceBundle.every((file) => file.contents.trim().length > 0),
        `${seed.code} source files must not be empty`,
      );

      if (seed.manifest.assetKind === 'template') {
        assert.ok(seed.templateId, `${seed.code} template seed must expose templateId`);
        assert.ok(
          PUBLIC_PRESENCE_TEMPLATE_TYPE_CODES.includes(seed.manifest.templateTypeCode),
          `${seed.code} template seed must reference Homepage Template Type`,
        );
      } else {
        assert.ok(seed.componentType, `${seed.code} component seed must expose componentType`);
      }
    }
  });

  it('wires Public Presence system assets into base seed and tenant template copy', () => {
    const baseSeed = readDatabaseFile('prisma', 'seeds', 'index.ts');
    const assetSeed = readDatabaseFile('prisma', 'seeds', '09-public-presence-assets.ts');
    const templateBootstrap = readDatabaseFile('src', 'platform', 'tenancy', 'template-bootstrap.ts');
    const templateParity = readDatabaseFile('scripts', 'verify-tenant-template-parity.ts');

    assert.match(baseSeed, /seedPublicPresenceSystemAssets/);
    assert.match(assetSeed, /getPublicPresenceSystemAssetSeeds/);
    assert.match(assetSeed, /public_presence_asset/);
    assert.match(assetSeed, /public_presence_asset_revision/);
    assert.match(assetSeed, /current_revision_id/);
    assert.match(templateBootstrap, /'artist_stage'/);
    assert.match(templateBootstrap, /'public_presence_asset'/);
    assert.match(templateBootstrap, /'public_presence_asset_revision'/);
    assert.match(templateParity, /WHERE owner_type = 'system'/);
    assert.match(templateParity, /WHERE asset\.owner_type = 'system'/);
  });

  it('keeps shared test tenant fixtures on Artist Status instead of retired lifecycle mapping', () => {
    const testUtils = readSharedFile('src', 'testing', 'test-utils.ts');

    assert.match(testUtils, /artist_status_code/);
    assert.doesNotMatch(testUtils, /lifecycle_status_mapping/);
  });
});
