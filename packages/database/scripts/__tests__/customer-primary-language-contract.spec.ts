import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const repoPackageRoot = process.cwd();

function readPackageFile(...segments: string[]) {
  return readFileSync(join(repoPackageRoot, ...segments), 'utf8');
}

describe('customer primary language locale contract', () => {
  it('stores supported UI locale tags without truncating Chinese variants', () => {
    const schema = readPackageFile('prisma', 'schema.prisma');

    assert.match(
      schema,
      /primaryLanguage\s+String\?\s+@map\("primary_language"\)\s+@db\.VarChar\(16\)/,
    );
  });

  it('keeps UAT customer and user locale seeds on canonical UI locale tags', () => {
    const customerSeed = readPackageFile('prisma', 'seeds', '23-uat-customers.ts');
    const userSeed = readPackageFile('prisma', 'seeds', '22-uat-users.ts');

    assert.match(customerSeed, /const language = i < 10 \? 'ja' : 'zh_HANS';/);
    assert.doesNotMatch(customerSeed, /const language = i < 10 \? 'ja' : 'zh';/);
    const preferredLanguageInserts = [...userSeed.matchAll(/preferred_language[^`]*`/g)].map(
      (match) => match[0],
    );

    assert.ok(preferredLanguageInserts.some((insert) => /'zh_HANS'/.test(insert)));
    assert.ok(preferredLanguageInserts.every((insert) => !/'zh'(?!_)/.test(insert)));
  });
});
