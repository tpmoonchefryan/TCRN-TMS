import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsLayout } from '../patterns/SettingsLayout';

describe('SettingsLayout', () => {
  it('supports caller-supplied ariaLabel', () => {
    const customLabel = "設定セクション";
    render(
      <SettingsLayout 
        title="Settings"
        sections={[{ id: '1', label: 'Section 1' }]}
        activeSectionId="1"
        onSectionChange={vi.fn()}
        ariaLabel={customLabel}
      >
        <div>Content</div>
      </SettingsLayout>
    );
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', customLabel);
  });
});
