import { type HTMLAttributes, type ReactNode } from 'react';

import {
  getPublicPresenceMotionClasses,
  getPublicPresenceSurfaceClasses,
  publicPresenceClassNames,
  type PublicPresenceMotionMode,
  type PublicPresenceSurfaceVariant,
  publicPresenceTokens,
} from '@/domains/public-presence/public-presence-theme';

type PublicPresenceSurfaceElement = 'div' | 'section' | 'article' | 'aside';

export interface PublicPresenceSurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: PublicPresenceSurfaceElement;
  children: ReactNode;
  interactive?: boolean;
  motion?: PublicPresenceMotionMode;
  variant?: PublicPresenceSurfaceVariant;
}

export function PublicPresenceSurface({
  as: Element = 'div',
  children,
  className,
  interactive = false,
  motion = 'standard',
  variant = 'panel',
  ...props
}: Readonly<PublicPresenceSurfaceProps>) {
  return (
    <Element
      className={publicPresenceClassNames(
        'relative overflow-hidden p-5 sm:p-6',
        publicPresenceTokens.radius.card,
        getPublicPresenceSurfaceClasses(variant),
        interactive &&
          'focus-within:ring-2 focus-within:ring-rose-200/70 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.13)] motion-reduce:hover:translate-y-0',
        interactive ? getPublicPresenceMotionClasses(motion) : undefined,
        className
      )}
      {...props}
    >
      {children}
    </Element>
  );
}
