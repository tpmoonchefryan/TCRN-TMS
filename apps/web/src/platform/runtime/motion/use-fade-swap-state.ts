import { useEffect, useRef, useState } from 'react';

import { motionConstants, tokens } from '@/platform/ui/foundations/tokens';

type FadeSwapPhase = 'entered' | 'leaving' | 'entering';

type UseFadeSwapStateOptions = {
  durationMs?: number;
};

type FadeSwapState<T extends string> = {
  displayedValue: T;
  phase: FadeSwapPhase;
  transitionClassName: string;
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);

      return () => {
        mediaQuery.removeEventListener('change', update);
      };
    }

    mediaQuery.addListener(update);

    return () => {
      mediaQuery.removeListener(update);
    };
  }, []);

  return prefersReducedMotion;
}

function getTransitionClassName(phase: FadeSwapPhase) {
  return [
    tokens.motion.transitionQuick,
    tokens.motion.reduced,
    'ease-out',
    phase === 'leaving' ? 'pointer-events-none opacity-0' : 'opacity-100',
  ].join(' ');
}

export function useFadeSwapState<T extends string>(
  targetValue: T,
  options: UseFadeSwapStateOptions = {},
): FadeSwapState<T> {
  const durationMs = options.durationMs ?? motionConstants.durationQuickMs;
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayedValue, setDisplayedValue] = useState(targetValue);
  const [phase, setPhase] = useState<FadeSwapPhase>('entered');
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      setDisplayedValue(targetValue);
      setPhase('entered');

      return undefined;
    }

    if (targetValue === displayedValue) {
      return undefined;
    }

    setPhase('leaving');

    const timeout = window.setTimeout(() => {
      setDisplayedValue(targetValue);
      setPhase('entering');

      frameRef.current = window.requestAnimationFrame(() => {
        setPhase('entered');
        frameRef.current = null;
      });
    }, durationMs);

    return () => {
      window.clearTimeout(timeout);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [displayedValue, durationMs, prefersReducedMotion, targetValue]);

  return {
    displayedValue,
    phase,
    transitionClassName: getTransitionClassName(phase),
  };
}
