import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SupportedUiLocale } from '@tcrn/shared';

import { TranslationDrawer } from '../patterns/TranslationDrawer';

describe('TranslationDrawer', () => {
  const availableLocales: Array<{ code: SupportedUiLocale; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'zh_HANS', label: 'Simplified Chinese' },
    { code: 'zh_HANT', label: 'Traditional Chinese' },
    { code: 'ja', label: 'Japanese' },
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
    },
  ];

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Translate Role',
    fields,
    availableLocales,
    onSave: vi.fn().mockResolvedValue(undefined),
    saveButtonLabel: 'Apply translations',
    cancelButtonLabel: 'Discard changes',
    closeButtonAriaLabel: 'Close translations',
    addLanguageLabel: 'Quick add language',
    addOtherLanguageLabel: 'Choose another language',
    removeLanguageVisibleLabel: 'Remove locale',
    removeLanguageAriaLabel: (language: string) => `Remove ${language} locale`,
    emptyTranslationsText: 'No locale variants configured yet.',
    baseValueSuffix: '(Source value)',
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
    expect(screen.queryByText('Korean', { selector: 'h3' })).not.toBeInTheDocument();
  });

  it('supports quick add via pills', async () => {
    render(<TranslationDrawer {...defaultProps} />);

    // There is no search mode wall anymore
    expect(screen.queryByPlaceholderText('Search languages...')).not.toBeInTheDocument();

    // Click 'Korean' pill (a priority locale)
    const koreanPill = screen.getByRole('button', { name: 'Korean' });
    await act(async () => {
      fireEvent.click(koreanPill);
    });

    // Korean block should now be rendered
    expect(screen.getByText('Korean', { selector: 'h3' })).toBeInTheDocument();

    // And focus should move to the newly added field (the first field in Korean block)
    const nameInputs = screen.getAllByLabelText('Name');
    // nameInputs[0] is zh_HANS, nameInputs[1] is ko
    expect(nameInputs[1]).toHaveFocus();
  });

  it('does not expose a separate long-tail language picker', () => {
    render(<TranslationDrawer {...defaultProps} />);

    expect(
      screen.queryByRole('combobox', { name: 'Choose another language' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'French' })).toBeInTheDocument();
  });

  it('can remove an active language block', async () => {
    render(<TranslationDrawer {...defaultProps} />);

    expect(screen.getByText('Simplified Chinese')).toBeInTheDocument();

    const removeButton = screen.getByLabelText('Remove Simplified Chinese locale');
    await act(async () => {
      fireEvent.click(removeButton);
    });

    expect(screen.queryByText('Simplified Chinese', { selector: 'h3' })).not.toBeInTheDocument();
  });

  it('saves the multi-field payload correctly', async () => {
    render(<TranslationDrawer {...defaultProps} />);

    // Add Korean
    const koreanPill = screen.getByRole('button', { name: 'Korean' });
    await act(async () => {
      fireEvent.click(koreanPill);
    });

    // Simulate typing in the new Korean Name field
    const nameInputs = screen.getAllByLabelText('Name');
    fireEvent.change(nameInputs[1], { target: { value: '관리자' } });

    const saveButton = screen.getByText('Apply translations');
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
      },
    });
  });

  it('uses caller-provided legacy labels without english fallbacks', () => {
    render(
      <TranslationDrawer
        open
        onOpenChange={vi.fn()}
        title="Rule translations"
        baseValue=""
        translations={{}}
        legacyFieldLabel="Rule name"
        availableLocales={availableLocales}
        onSave={vi.fn().mockResolvedValue(undefined)}
        saveButtonLabel="Apply translations"
        cancelButtonLabel="Discard changes"
        closeButtonAriaLabel="Close translations"
        addLanguageLabel="Quick add language"
        addOtherLanguageLabel="Choose another language"
        removeLanguageVisibleLabel="Remove locale"
        removeLanguageAriaLabel={(language) => `Remove ${language} locale`}
        emptyTranslationsText="No locale variants configured yet."
        baseValueSuffix="(Source value)"
      />
    );

    expect(screen.getByText('Rule name')).toBeInTheDocument();
    expect(screen.getByText('No locale variants configured yet.')).toBeInTheDocument();
    expect(screen.queryByText('Translation')).not.toBeInTheDocument();
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });
});
