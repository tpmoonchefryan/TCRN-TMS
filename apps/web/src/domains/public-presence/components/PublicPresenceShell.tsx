import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { PublicPresenceDecorationLayer } from '@/domains/public-presence/components/PublicPresenceDecorationLayer';
import {
  getPublicPresenceShellWidthClasses,
  publicPresenceClassNames,
  type PublicPresenceDecorationDensity,
  type PublicPresenceMotionMode,
  type PublicPresenceShellWidth,
  publicPresenceTokens,
} from '@/domains/public-presence/public-presence-theme';

type PublicPresenceShellElement = 'main' | 'div';

export interface PublicPresenceShellProps extends HTMLAttributes<HTMLElement> {
  as?: PublicPresenceShellElement;
  children: ReactNode;
  contentClassName?: string;
  decorationAriaHidden?: boolean;
  decorationDensity?: PublicPresenceDecorationDensity;
  decorationLayer?: ReactNode;
  motion?: PublicPresenceMotionMode;
  style?: CSSProperties;
  width?: PublicPresenceShellWidth;
}

export function PublicPresenceShell({
  as: Element = 'main',
  children,
  className,
  contentClassName,
  decorationAriaHidden = true,
  decorationDensity = 'none',
  decorationLayer,
  motion = 'standard',
  width = 'lg',
  ...props
}: Readonly<PublicPresenceShellProps>) {
  return (
    <Element
      className={publicPresenceClassNames(
        'relative min-h-screen overflow-hidden px-5 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14',
        publicPresenceTokens.surface.canvas,
        className,
      )}
      {...props}
    >
      {decorationLayer ? (
        <div
          aria-hidden={decorationAriaHidden}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {decorationLayer}
        </div>
      ) : (
        <PublicPresenceDecorationLayer
          ariaHidden={decorationAriaHidden}
          density={decorationDensity}
          motion={motion}
        />
      )}
      <div
        className={publicPresenceClassNames(
          'relative z-10 mx-auto w-full',
          getPublicPresenceShellWidthClasses(width),
          contentClassName,
        )}
      >
        {children}
      </div>
    </Element>
  );
}
