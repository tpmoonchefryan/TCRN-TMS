import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const DATABASE_ROOT = process.cwd();
const SEED_ROOT = join(DATABASE_ROOT, 'prisma', 'seeds');

function readSeedFile(fileName: string) {
  return readFileSync(join(SEED_ROOT, fileName), 'utf8');
}

function collectSeedFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSeedFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

describe('seed idempotency contract', () => {
  it('does not use random time offsets in deterministic base or UAT seeds', () => {
    const randomUsages = collectSeedFiles(SEED_ROOT).flatMap((seedFilePath) => {
      const source = readFileSync(seedFilePath, 'utf8');

      return source.includes('Math.random') ? [seedFilePath] : [];
    });

    assert.deepEqual(randomUsages, []);
  });

  it('upserts tenant Artist Stage and Public Presence asset seed rows', () => {
    const publicPresenceSeed = readSeedFile('09-public-presence-assets.ts');

    assert.match(publicPresenceSeed, /ensureArtistStageSeed/);
    assert.match(publicPresenceSeed, /ensurePublicPresenceAssetSeed/);
    assert.match(publicPresenceSeed, /SELECT id[\s\S]+FROM "\$\{schemaName\}"\.artist_stage/);
    assert.match(publicPresenceSeed, /SELECT id[\s\S]+FROM "\$\{schemaName\}"\.public_presence_asset/);
    assert.match(publicPresenceSeed, /ON CONFLICT \(asset_id, revision_number\) DO UPDATE/);
  });

  it('creates UAT Talents with non-null Artist Stage references and rerun-safe updates', () => {
    const uatOrgSeed = readSeedFile('21-uat-organization.ts');

    assert.match(uatOrgSeed, /artist_stage_id/);
    assert.match(uatOrgSeed, /resolveUatArtistStageIds/);
    assert.match(uatOrgSeed, /ON CONFLICT \(code\) DO UPDATE SET[\s\S]+artist_stage_id = EXCLUDED\.artist_stage_id/);
  });

  it('creates UAT organization fixtures with LocalizedText descriptions', () => {
    const uatOrgSeed = readSeedFile('21-uat-organization.ts');

    assert.match(uatOrgSeed, /subsidiary \(id, parent_id, code, path, depth, name, description,/);
    assert.match(uatOrgSeed, /talent \(id, subsidiary_id, profile_store_id, artist_stage_id, code, path, name, description,/);
    assert.match(uatOrgSeed, /description = EXCLUDED\.description/);
  });
});
