import {
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import {
  getPublicPresenceAccentClasses,
  getPublicPresenceStateClasses,
  type PublicPresenceAccentTone,
  publicPresenceClassNames,
  type PublicPresenceStateTone,
  publicPresenceTokens,
} from '@/domains/public-presence/public-presence-theme';

export type PublicPresenceBadgeTone = PublicPresenceAccentTone | PublicPresenceStateTone;
export type PublicPresenceBadgeVariant = 'solid' | 'soft' | 'outline';

export interface PublicPresenceBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  icon?: ReactNode;
  iconAriaHidden?: boolean;
  tone?: PublicPresenceBadgeTone;
  variant?: PublicPresenceBadgeVariant;
}

const stateTones = new Set<PublicPresenceBadgeTone>([
  'neutral',
  'info',
  'success',
  'warning',
  'error',
  'unavailable',
]);

function getBadgeToneClasses(tone: PublicPresenceBadgeTone) {
  if (stateTones.has(tone)) {
    return getPublicPresenceStateClasses(tone as PublicPresenceStateTone);
  }

  return getPublicPresenceAccentClasses(tone as PublicPresenceAccentTone);
}

export function PublicPresenceBadge({
  children,
  className,
  icon,
  iconAriaHidden = true,
  tone = 'rose',
  variant = 'soft',
  ...props
}: Readonly<PublicPresenceBadgeProps>) {
  const toneClasses = getBadgeToneClasses(tone);
  const variantClasses =
    variant === 'solid'
      ? toneClasses.solid
      : variant === 'outline'
        ? publicPresenceClassNames('border bg-white/80', toneClasses.border, toneClasses.soft)
        : toneClasses.soft;

  return (
    <span
      className={publicPresenceClassNames(
        'inline-flex min-h-7 items-center gap-2 px-3 py-1 text-xs font-semibold leading-5',
        publicPresenceTokens.radius.badge,
        variantClasses,
        className,
      )}
      {...props}
    >
      {icon ? (
        <span
          aria-hidden={iconAriaHidden}
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5"
        >
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
