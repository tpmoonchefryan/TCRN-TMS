import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TopCommandBar } from '../patterns/TopCommandBar';

describe('TopCommandBar', () => {
  it('supports caller-supplied ariaLabel for search', () => {
    const customLabel = "自定义搜索";
    render(
      <TopCommandBar 
        searchProps={{ ariaLabel: customLabel }} 
      />
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', customLabel);
  });
});
