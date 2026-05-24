import { type HTMLAttributes } from 'react';

import {
  getPublicPresenceDecorationDensityClasses,
  publicPresenceClassNames,
  type PublicPresenceDecorationDensity,
  type PublicPresenceMotionMode,
} from '@/domains/public-presence/public-presence-theme';

export interface PublicPresenceDecorationLayerProps extends HTMLAttributes<HTMLDivElement> {
  ariaHidden?: boolean;
  density?: PublicPresenceDecorationDensity;
  motion?: PublicPresenceMotionMode;
}

function shouldShowDecoration(
  density: PublicPresenceDecorationDensity,
  minimum: PublicPresenceDecorationDensity
) {
  const order: Record<PublicPresenceDecorationDensity, number> = {
    none: 0,
    calm: 1,
    standard: 2,
    festive: 3,
  };

  return order[density] >= order[minimum];
}

export function PublicPresenceDecorationLayer({
  ariaHidden = true,
  className,
  density = 'standard',
  motion = 'standard',
  ...props
}: Readonly<PublicPresenceDecorationLayerProps>) {
  if (density === 'none') {
    return null;
  }

  const animated = motion !== 'none';

  return (
    <div
      className={publicPresenceClassNames(
        'pointer-events-none absolute inset-0 overflow-hidden',
        getPublicPresenceDecorationDensityClasses(density),
        className
      )}
      {...props}
      aria-hidden={ariaHidden}
    >
      <span
        className={publicPresenceClassNames(
          'absolute left-6 top-12 hidden h-28 w-40 -rotate-6 rounded-lg border border-rose-100 bg-white/50 shadow-sm md:block',
          animated &&
            'motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-reduce:animate-none'
        )}
      />
      <span
        className={publicPresenceClassNames(
          'absolute right-8 top-24 hidden h-16 w-32 rotate-6 rounded-lg border border-dashed border-sky-200 bg-sky-50/40 lg:block',
          animated &&
            'motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-reduce:animate-none'
        )}
      />
      {shouldShowDecoration(density, 'standard') ? (
        <>
          <span className="absolute bottom-20 left-10 hidden h-10 w-10 rotate-12 rounded-md border border-amber-200 bg-amber-50/40 md:block" />
          <span className="absolute bottom-32 right-14 hidden h-20 w-28 -rotate-3 rounded-lg border border-emerald-100 bg-white/40 lg:block" />
        </>
      ) : null}
      {shouldShowDecoration(density, 'festive') ? (
        <>
          <span className="absolute left-[46%] top-10 hidden h-3 w-3 rotate-45 rounded-sm bg-rose-300/50 md:block" />
          <span className="absolute bottom-16 right-[28%] hidden h-3 w-3 rotate-45 rounded-sm bg-sky-300/50 md:block" />
        </>
      ) : null}
    </div>
  );
}
