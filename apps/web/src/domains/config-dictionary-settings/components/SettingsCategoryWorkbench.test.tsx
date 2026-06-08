import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsCategoryWorkbench } from '@/domains/config-dictionary-settings/components/SettingsCategoryWorkbench';

describe('SettingsCategoryWorkbench', () => {
  it('wraps category tabs instead of forcing horizontal overflow', () => {
    render(
      <SettingsCategoryWorkbench
        ariaLabel="Settings categories"
        categories={[
          { id: 'defaults', label: 'Defaults' },
          { id: 'lifecycle-flow', label: 'Artist Lifecycle Flow' },
          { id: 'sso', label: 'Single Sign-On' },
          { id: 'captcha', label: 'CAPTCHA' },
        ]}
        activeCategoryId="defaults"
        onCategoryChange={vi.fn()}
      >
        <p>Settings content</p>
      </SettingsCategoryWorkbench>
    );

    const nav = screen.getByRole('navigation', { name: 'Settings categories' });
    const categoryList = nav.firstElementChild;

    expect(categoryList).toHaveClass('flex-wrap');
    expect(categoryList).not.toHaveClass('overflow-x-auto');
    expect(screen.getByRole('button', { name: 'Single Sign-On' })).toHaveClass('max-w-full');
    expect(screen.getByText('Single Sign-On')).toHaveClass('break-words');
  });
});
