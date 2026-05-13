import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createHomepagePuckBackgroundField,
  createHomepagePuckBackgroundOverlayField,
  createHomepagePuckImageField,
} from '@/domains/homepage-management/editor/puck/HomepagePuckMediaField';

const OriginalFileReader = globalThis.FileReader;

describe('HomepagePuckMediaField', () => {
  afterEach(() => {
    globalThis.FileReader = OriginalFileReader;
  });

  it('uploads image files through the provided asset uploader', async () => {
    const onChange = vi.fn();
    const onUpload = vi.fn().mockResolvedValue('/api/v1/public/assets/homepage-assets/tenant/talent/avatar.png');
    const field = createHomepagePuckImageField({
      clearLabel: 'Remove',
      label: 'Image URL',
      onUpload,
      placeholder: 'https://cdn.example.com/image.png',
      uploadErrorLabel: 'Image upload failed.',
      uploadLabel: 'Add image',
      uploadingLabel: 'Uploading image',
    });

    const { container } = render(field.render({
      field,
      id: 'image-url',
      name: 'imageUrl',
      onChange,
      value: '',
    }));

    expect(screen.getByPlaceholderText('https://cdn.example.com/image.png')).toBeInTheDocument();
    expect(screen.getByLabelText('Image URL')).toHaveAttribute('name', 'imageUrl');
    expect(screen.getByText('Add image')).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]');

    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [new File(['avatar'], 'avatar.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({
        name: 'avatar.png',
        type: 'image/png',
      }));
      expect(onChange).toHaveBeenCalledWith('/api/v1/public/assets/homepage-assets/tenant/talent/avatar.png');
    });
  });

  it('keeps a data-url fallback when no asset uploader is provided', async () => {
    const onChange = vi.fn();
    const field = createHomepagePuckImageField({
      clearLabel: 'Remove',
      label: 'Image URL',
      placeholder: 'https://cdn.example.com/image.png',
      uploadLabel: 'Add image',
    });

    class MockFileReader {
      result: string | null = 'data:image/png;base64,preview';
      error: Error | null = null;
      onerror: null | (() => void) = null;
      onload: null | (() => void) = null;

      readAsDataURL() {
        this.onload?.();
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

    const { container } = render(field.render({
      field,
      id: 'image-url',
      name: 'imageUrl',
      onChange,
      value: '',
    }));

    const fileInput = container.querySelector('input[type="file"]');

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [new File(['avatar'], 'avatar.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('data:image/png;base64,preview');
    });
  });

  it('renders gradient and overlay background fields with presets', () => {
    const onChange = vi.fn();
    const gradientField = createHomepagePuckBackgroundField({
      clearLabel: 'Remove',
      kind: 'gradient',
      label: 'Background value',
      placeholder: 'linear-gradient(135deg, #FAFBFC 0%, #E0E7FF 100%)',
      uploadLabel: 'Add image',
    });
    const overlayField = createHomepagePuckBackgroundOverlayField({
      label: 'Image overlay',
    });

    render(gradientField.render({
      field: gradientField,
      id: 'background-value',
      name: 'backgroundValue',
      onChange,
      value: '',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Background value preset 1' }));

    expect(onChange).toHaveBeenCalledWith('linear-gradient(135deg, #FAFBFC 0%, #E0E7FF 100%)');
    expect(screen.getByLabelText('Background value')).toHaveAttribute('name', 'backgroundValue');

    onChange.mockReset();

    render(overlayField.render({
      field: overlayField,
      id: 'background-overlay',
      name: 'backgroundOverlay',
      onChange,
      value: '',
    }));

    expect(screen.getByLabelText('Image overlay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'rgba(15, 23, 42, 0.35)' })).toBeInTheDocument();
  });
});
