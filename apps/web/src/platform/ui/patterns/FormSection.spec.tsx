// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormSection } from '@/platform/ui/patterns/FormSection';

describe('FormSection', () => {
  it('renders a generic section header, description, and child content', () => {
    render(
      <FormSection
        title="Profile details"
        icon={<span data-testid="section-icon">I</span>}
        description={<p>Reusable form section description</p>}
      >
        <div>Section body</div>
      </FormSection>,
    );

    expect(screen.getByRole('heading', { name: 'Profile details' })).toBeInTheDocument();
    expect(screen.getByTestId('section-icon')).toBeInTheDocument();
    expect(screen.getByText('Reusable form section description')).toBeInTheDocument();
    expect(screen.getByText('Section body')).toBeInTheDocument();
  });
});
