import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { SUPPORTED_UI_LOCALES } from '@tcrn/shared';

const SEED_ROOT = join(process.cwd(), 'prisma', 'seeds');
const DEFAULT_LOCALE_SETTING_PATTERN = /defaultLanguage:\s*['"]([^'"]+)['"]/g;

function collectSeedFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSeedFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

describe('seed locale contract', () => {
  it('keeps seeded defaultLanguage values aligned with supported UI locales', () => {
    const supportedLocales = new Set<string>(SUPPORTED_UI_LOCALES);
    const invalidDefaultLanguages = collectSeedFiles(SEED_ROOT).flatMap((seedFilePath) => {
      const seedSource = readFileSync(seedFilePath, 'utf8');
      const matches = [...seedSource.matchAll(DEFAULT_LOCALE_SETTING_PATTERN)];

      return matches
        .map((match) => ({ seedFilePath, value: match[1] }))
        .filter(({ value }) => !supportedLocales.has(value));
    });

    assert.deepEqual(invalidDefaultLanguages, []);
  });
});
