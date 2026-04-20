import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccountDropdownMenu } from '../patterns/AccountDropdownMenu';
import { FormSection } from '../patterns/FormSection';
import { LocaleSwitcher } from '../patterns/LocaleSwitcher';

describe('Generic UI Hardening', () => {
  it('FormSection renders without max-w-4xl constraint', () => {
    const { container } = render(
      <FormSection title="Test Title" description="Test Description">
        <div>Content</div>
      </FormSection>
    );
    expect(container.innerHTML).not.toContain('max-w-4xl');
  });

  it('AccountDropdownMenu uses solid white background for menu', async () => {
    const user = userEvent.setup();
    render(
      <AccountDropdownMenu 
        user={{ name: 'Test', email: 'test@example.com' }} 
        onNavigateProfile={vi.fn()}
        onNavigateSecurity={vi.fn()}
        onSignOut={vi.fn()}
      />
    );
    const button = screen.getByRole('button');
    await user.click(button);
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('bg-white');
    expect(menu.className).not.toContain('bg-white/95');
    expect(menu.className).not.toContain('backdrop-blur-xl');
  });

  it('LocaleSwitcher uses solid white background for menu', async () => {
    const user = userEvent.setup();
    render(
      <LocaleSwitcher 
        currentLocale="en"
        options={[{ code: 'en', label: 'English' }]}
        onChange={vi.fn()}
      />
    );
    const button = screen.getByRole('button');
    await user.click(button);
    const menu = screen.getByRole('listbox');
    expect(menu.className).toContain('bg-white');
    expect(menu.className).not.toContain('bg-white/95');
    expect(menu.className).not.toContain('backdrop-blur-xl');
  });
});
