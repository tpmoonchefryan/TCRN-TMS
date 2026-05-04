import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const forbiddenLegalEntityPattern = /子公司|子会社|자회사|\b[Ff]iliales?\b/u;

function collectProductionSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entryName) => {
    const entryPath = join(directory, entryName);
    const entryStat = statSync(entryPath);

    if (entryStat.isDirectory()) {
      return collectProductionSourceFiles(entryPath);
    }

    if (!/\.tsx?$/.test(entryName)) {
      return [];
    }

    if (/\.(test|spec)\.tsx?$/.test(entryName)) {
      return [];
    }

    return [entryPath];
  });
}

describe('subsidiary scope wording', () => {
  it('does not use legal-entity subsidiary translations in production UI copy', () => {
    const matches = collectProductionSourceFiles(sourceRoot).flatMap((sourceFile) => {
      return readFileSync(sourceFile, 'utf8')
        .split('\n')
        .flatMap((line, lineIndex) => {
          if (!forbiddenLegalEntityPattern.test(line)) {
            return [];
          }

          return `${relative(sourceRoot, sourceFile)}:${lineIndex + 1}: ${line.trim()}`;
        });
    });

    expect(matches).toEqual([]);
  });
});
