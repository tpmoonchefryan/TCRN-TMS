import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useState } from 'react';

import { useOverlayFocusManager } from '@/domains/public-presence-studio/screens/public-presence-studio-overlay';

function OverlayHarness({
  mode,
}: Readonly<{
  mode: 'desktop' | 'mobile';
}>) {
  const [open, setOpen] = useState(false);
  const overlay = useOverlayFocusManager({
    desktopBreakpoint: 1280,
    onClose: () => setOpen(false),
    open,
  });

  return (
    <div>
      <button
        type="button"
        onClick={(event) => {
          overlay.registerTrigger(event.currentTarget);
          setOpen(true);
        }}
      >
        Open overlay
      </button>
      {open ? (
        <div
          aria-label={mode === 'desktop' ? 'Desktop overlay panel' : 'Mobile overlay sheet'}
          data-testid="overlay-panel"
          role={mode === 'desktop' ? 'region' : 'dialog'}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            ref={mode === 'desktop' ? overlay.desktopInitialFocusRef : overlay.mobileInitialFocusRef}
          >
            Close overlay
          </button>
        </div>
      ) : null}
    </div>
  );
}

describe('useOverlayFocusManager', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
  });

  it('moves focus to the desktop close action and returns it to the trigger on close', async () => {
    render(<OverlayHarness mode="desktop" />);

    const openButton = screen.getByRole('button', { name: 'Open overlay' });
    fireEvent.click(openButton);

    const closeButton = await screen.findByRole('button', { name: 'Close overlay' });
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    fireEvent.click(closeButton);
    await waitFor(() => {
      expect(screen.queryByTestId('overlay-panel')).not.toBeInTheDocument();
      expect(openButton).toHaveFocus();
    });
  });

  it('closes on Escape and returns focus to the trigger for mobile sheets', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
      writable: true,
    });

    render(<OverlayHarness mode="mobile" />);

    const openButton = screen.getByRole('button', { name: 'Open overlay' });
    fireEvent.click(openButton);

    const closeButton = await screen.findByRole('button', { name: 'Close overlay' });
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('overlay-panel')).not.toBeInTheDocument();
      expect(openButton).toHaveFocus();
    });
  });
});
