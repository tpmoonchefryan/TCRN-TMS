import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsLayout } from '../patterns/SettingsLayout';

describe('SettingsLayout', () => {
  it('supports caller-supplied ariaLabel', () => {
    const customLabel = '設定セクション';
    render(
      <SettingsLayout
        title="Settings"
        sections={[{ id: '1', label: 'Section 1' }]}
        activeSectionId="1"
        onSectionChange={vi.fn()}
        ariaLabel={customLabel}
      >
        <div>Content</div>
      </SettingsLayout>,
    );
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', customLabel);
  });

  it('renders a caller-provided help affordance in the page header', () => {
    render(
      <SettingsLayout
        title="Settings"
        sections={[{ id: '1', label: 'Section 1' }]}
        activeSectionId="1"
        onSectionChange={vi.fn()}
        ariaLabel="Settings sections"
        help={<a href="#settings-sections">Settings guide</a>}
        sectionNavId="settings-sections"
      >
        <div>Content</div>
      </SettingsLayout>,
    );

    expect(screen.getByRole('link', { name: 'Settings guide' })).toHaveAttribute('href', '#settings-sections');
    expect(screen.getByRole('navigation')).toHaveAttribute('id', 'settings-sections');
  });

  it('supports arrow, home, and end keyboard navigation across setting sections', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    const sections = [
      { id: 'details', label: 'Details' },
      { id: 'settings', label: 'Settings' },
      { id: 'dictionary', label: 'Dictionary' },
    ];

    function SettingsLayoutHarness() {
      const [activeSectionId, setActiveSectionId] = useState('details');

      return (
        <SettingsLayout
          title="Settings"
          sections={sections}
          activeSectionId={activeSectionId}
          onSectionChange={(sectionId) => {
            onSectionChange(sectionId);
            setActiveSectionId(sectionId);
          }}
          ariaLabel="Settings sections"
        >
          <div>Content</div>
        </SettingsLayout>
      );
    }

    render(<SettingsLayoutHarness />);

    screen.getByRole('button', { name: 'Details' }).focus();

    await user.keyboard('{ArrowRight}');
    expect(onSectionChange).toHaveBeenLastCalledWith('settings');
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');

    await user.keyboard('{End}');
    expect(onSectionChange).toHaveBeenLastCalledWith('dictionary');
    expect(screen.getByRole('button', { name: 'Dictionary' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(onSectionChange).toHaveBeenLastCalledWith('settings');
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(onSectionChange).toHaveBeenLastCalledWith('details');
    expect(screen.getByRole('button', { name: 'Details' })).toHaveFocus();
  });
});
