import {
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { PublicPresenceSurface } from '@/domains/public-presence/components/PublicPresenceSurface';
import {
  getPublicPresenceStateClasses,
  publicPresenceClassNames,
  type PublicPresenceStateTone,
  type PublicPresenceSurfaceVariant,
  publicPresenceTokens,
} from '@/domains/public-presence/public-presence-theme';

export interface PublicPresenceStateViewProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  iconAriaHidden?: boolean;
  secondaryText?: ReactNode;
  surfaceVariant?: PublicPresenceSurfaceVariant;
  title: ReactNode;
  tone?: PublicPresenceStateTone;
}

export function PublicPresenceStateView({
  actions,
  className,
  description,
  icon,
  iconAriaHidden = true,
  secondaryText,
  surfaceVariant = 'note',
  title,
  tone = 'neutral',
  ...props
}: Readonly<PublicPresenceStateViewProps>) {
  const toneClasses = getPublicPresenceStateClasses(tone);

  return (
    <PublicPresenceSurface
      as="section"
      className={publicPresenceClassNames('p-8 text-center sm:p-10', className)}
      variant={surfaceVariant}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden={iconAriaHidden}
          className={publicPresenceClassNames(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-lg border [&>svg]:h-5 [&>svg]:w-5',
            toneClasses.soft,
            toneClasses.border,
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="mt-5 space-y-2">
        <h2 className={publicPresenceClassNames('text-lg font-semibold leading-7', publicPresenceTokens.text.primary)}>
          {title}
        </h2>
        {description ? (
          <div className={publicPresenceClassNames('mx-auto max-w-md text-sm leading-6', publicPresenceTokens.text.secondary)}>
            {description}
          </div>
        ) : null}
        {secondaryText ? (
          <div className={publicPresenceClassNames('mx-auto max-w-md text-xs leading-5', publicPresenceTokens.text.muted)}>
            {secondaryText}
          </div>
        ) : null}
      </div>
      {actions ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
    </PublicPresenceSurface>
  );
}
