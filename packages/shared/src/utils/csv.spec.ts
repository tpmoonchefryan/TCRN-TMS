// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import { escapeCsvCell } from './csv';

describe('escapeCsvCell', () => {
  it.each(['=cmd', '+cmd', '-cmd', '@cmd', '\tcmd', '\rcmd'])(
    'neutralizes spreadsheet formula prefix %#',
    (value) => {
      const escaped = escapeCsvCell(value);
      expect(escaped.replace(/^"/, '').startsWith("'")).toBe(true);
    }
  );

  it('still quotes commas, quotes, and newlines after neutralization', () => {
    expect(escapeCsvCell('=1,2')).toBe('"\'=1,2"');
    expect(escapeCsvCell('"quoted"')).toBe('"""quoted"""');
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"');
  });
});
