import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TranslationDrawer } from '../patterns/TranslationDrawer';

describe('TranslationDrawer', () => {
  const availableLocales = [
    { code: 'zh_HANS', label: 'Simplified Chinese' },
    { code: 'ko', label: 'Korean' },
    { code: 'fr', label: 'French' },
  ];

  const fields = [
    {
      id: 'name',
      label: 'Name',
      baseValue: 'Admin',
      translations: { zh_HANS: '管理员' },
    },
    {
      id: 'description',
      label: 'Description',
      type: 'textarea' as const,
      baseValue: 'System Administrator',
      translations: { zh_HANS: '系统管理员' },
    }
  ];

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Translate Role',
    fields,
    availableLocales,
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  it('renders base values and active locales for multiple fields', () => {
    render(<TranslationDrawer {...defaultProps} />);
    
    expect(screen.getByText('Translate Role')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('System Administrator')).toBeInTheDocument();
    
    // Active locale 'zh_HANS' renders its sections
    expect(screen.getByText('Simplified Chinese')).toBeInTheDocument();
    
    // Inputs are mapped to labels within the locale block
    const nameInputs = screen.getAllByLabelText('Name');
    // First is the base value label, second is the actual input
    expect(nameInputs[0]).toHaveValue('管理员');
    
    const descInputs = screen.getAllByLabelText('Description');
    expect(descInputs[0]).toHaveValue('系统管理员');
    
    // Inactive locales should not be rendered
    expect(screen.queryByText('Korean')).not.toBeInTheDocument();
  });

  it('supports searching and adding a new language', async () => {
    render(<TranslationDrawer {...defaultProps} />);
    
    // Click 'Add Language' to open searchable picker
    const addButton = screen.getByRole('button', { name: /Add Language/i });
    await act(async () => {
      fireEvent.click(addButton);
    });
    
    // Search for French
    const searchInput = screen.getByPlaceholderText('Search languages...');
    fireEvent.change(searchInput, { target: { value: 'fre' } });
    
    // Korean should be filtered out
    expect(screen.queryByText('Korean')).not.toBeInTheDocument();
    
    // Click French
    const frenchOption = screen.getByText('French');
    await act(async () => {
      fireEvent.click(frenchOption);
    });
    
    // French block should now be rendered
    expect(screen.getByText('French')).toBeInTheDocument();
  });

  it('can remove an active language block', async () => {
    render(<TranslationDrawer {...defaultProps} />);
    
    expect(screen.getByText('Simplified Chinese')).toBeInTheDocument();
    
    const removeButton = screen.getByLabelText('Remove Simplified Chinese translation');
    await act(async () => {
      fireEvent.click(removeButton);
    });
    
    expect(screen.queryByText('Simplified Chinese')).not.toBeInTheDocument();
  });

  it('saves the multi-field payload correctly', async () => {
    render(<TranslationDrawer {...defaultProps} />);
    
    // Open picker and add Korean
    const addButton = screen.getByRole('button', { name: /Add Language/i });
    await act(async () => {
      fireEvent.click(addButton);
    });
    const koreanOption = screen.getByText('Korean');
    await act(async () => {
      fireEvent.click(koreanOption);
    });
    
    // Simulate typing in the new Korean Name field
    // Since labels are generic "Name" per section, we need to target the specific input
    // The second "Name" label in the document will belong to the Korean block since it was appended
    const nameInputs = screen.getAllByLabelText('Name');
    fireEvent.change(nameInputs[1], { target: { value: '관리자' } });
    
    const saveButton = screen.getByText('Save');
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    expect(defaultProps.onSave).toHaveBeenCalledWith({
      name: {
        zh_HANS: '管理员',
        ko: '관리자',
      },
      description: {
        zh_HANS: '系统管理员',
        // ko description was left blank
      }
    });
  });
});
