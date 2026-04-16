import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

interface ApiResponseBlock {
  line: number;
  block: string;
}

const modulesDir = resolve(__dirname, '../modules');

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = `${dir}/${entry.name}`;

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return entry.isFile() && entry.name.endsWith('controller.ts') ? [fullPath] : [];
  });

const extractApiResponseBlocks = (source: string): ApiResponseBlock[] => {
  const blocks: ApiResponseBlock[] = [];
  const marker = '@ApiResponse({';
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf(marker, cursor);
    if (start === -1) {
      break;
    }

    let index = start + marker.length - 1;
    let depth = 0;
    let inString: '"' | "'" | '`' | null = null;
    let escaped = false;

    while (index < source.length) {
      const char = source[index];

      if (inString) {
        if (!escaped && char === inString) {
          inString = null;
        }
        escaped = !escaped && char === '\\';
        index += 1;
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        index += 1;
        continue;
      }

      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          index += 1;
          break;
        }
      }

      index += 1;
    }

    const block = source.slice(start, index);
    const line = source.slice(0, start).split('\n').length;
    blocks.push({ line, block });
    cursor = index;
  }

  return blocks;
};

describe('Swagger response schema compliance', () => {
  it('requires every controller ApiResponse to declare schema or content', () => {
    const offenders = walk(modulesDir).flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const responseBlocks = extractApiResponseBlocks(source);

      return responseBlocks
        .filter(({ block }) => !block.includes('schema:') && !block.includes('content:'))
        .map(({ line }) => `${filePath}:${line}`);
    });

    expect(offenders).toEqual([]);
  });
});
