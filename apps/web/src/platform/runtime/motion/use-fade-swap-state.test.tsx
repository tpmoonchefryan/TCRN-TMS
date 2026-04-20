import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFadeSwapState } from '@/platform/runtime/motion/use-fade-swap-state';

type HarnessProps = {
  value: 'details' | 'settings' | 'dictionary';
};

function installMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  })));
}

function installAnimationFrame() {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn().mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
}

function FadeSwapHarness({ value }: HarnessProps) {
  const { displayedValue, phase, transitionClassName } = useFadeSwapState(value);

  return (
    <div>
      <p data-testid="displayed-value">{displayedValue}</p>
      <p data-testid="phase">{phase}</p>
      <p data-testid="transition-class">{transitionClassName}</p>
    </div>
  );
}

describe('useFadeSwapState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installMatchMedia(false);
    installAnimationFrame();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the current value mounted while fading out before switching', () => {
    const { rerender } = render(<FadeSwapHarness value="details" />);

    rerender(<FadeSwapHarness value="settings" />);

    expect(screen.getByTestId('displayed-value')).toHaveTextContent('details');
    expect(screen.getByTestId('phase')).toHaveTextContent('leaving');
    expect(screen.getByTestId('transition-class')).toHaveTextContent('opacity-0');

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByTestId('displayed-value')).toHaveTextContent('settings');
    expect(screen.getByTestId('phase')).toHaveTextContent('entered');
    expect(screen.getByTestId('transition-class')).toHaveTextContent('opacity-100');
  });

  it('collapses rapid successive swaps to the latest target value', () => {
    const { rerender } = render(<FadeSwapHarness value="details" />);

    rerender(<FadeSwapHarness value="settings" />);
    rerender(<FadeSwapHarness value="dictionary" />);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByTestId('displayed-value')).toHaveTextContent('dictionary');
    expect(screen.getByTestId('phase')).toHaveTextContent('entered');
  });

  it('switches immediately when reduced motion is enabled', () => {
    installMatchMedia(true);

    const { rerender } = render(<FadeSwapHarness value="details" />);

    rerender(<FadeSwapHarness value="settings" />);

    expect(screen.getByTestId('displayed-value')).toHaveTextContent('settings');
    expect(screen.getByTestId('phase')).toHaveTextContent('entered');
    expect(screen.getByTestId('transition-class')).toHaveTextContent('opacity-100');
  });
});
