import {
  createElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import {
  getPublicPresenceMotionClasses,
  publicPresenceClassNames,
  type PublicPresenceMotionMode,
  publicPresenceTokens,
} from '@/domains/public-presence/public-presence-theme';

export type PublicPresenceHeroHeadingLevel = 1 | 2 | 3;
export type PublicPresenceHeroMediaPlacement = 'right' | 'left';
export type PublicPresenceHeroResponsiveMode = 'auto' | 'desktop' | 'mobile';

export interface PublicPresenceHeroProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  actions?: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  headingLevel?: PublicPresenceHeroHeadingLevel;
  media?: ReactNode;
  mediaPlacement?: PublicPresenceHeroMediaPlacement;
  meta?: ReactNode;
  motion?: PublicPresenceMotionMode;
  responsiveMode?: PublicPresenceHeroResponsiveMode;
  title: ReactNode;
  titleId?: string;
  titleStyle?: CSSProperties;
}

export function PublicPresenceHero({
  actions,
  badge,
  className,
  description,
  headingLevel = 1,
  media,
  mediaPlacement = 'right',
  meta,
  motion = 'standard',
  responsiveMode = 'auto',
  title,
  titleId,
  titleStyle,
  ...props
}: Readonly<PublicPresenceHeroProps>) {
  const headingTag = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  const hasMedia = Boolean(media);
  const useMobileLayout = responsiveMode === 'mobile';

  return (
    <section
      aria-labelledby={titleId}
      className={publicPresenceClassNames(
        hasMedia
          ? useMobileLayout
            ? 'grid gap-6'
            : 'grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.72fr)] lg:items-center'
          : 'max-w-3xl',
        getPublicPresenceMotionClasses(motion),
        className,
      )}
      {...props}
    >
      <div
        className={publicPresenceClassNames(
          'space-y-5',
          hasMedia && mediaPlacement === 'left' && !useMobileLayout && 'lg:order-2',
        )}
      >
        {badge ? <div className="flex flex-wrap items-center gap-2">{badge}</div> : null}
        <div className="space-y-4">
          {createElement(
            headingTag,
            {
              id: titleId,
              style: titleStyle,
              className: publicPresenceClassNames(
                useMobileLayout
                  ? 'text-4xl font-semibold leading-tight'
                  : 'text-4xl font-semibold leading-tight sm:text-5xl',
                publicPresenceTokens.text.primary,
              ),
            },
            title,
          )}
          {description ? (
            <div className={publicPresenceClassNames('max-w-3xl text-base leading-8', publicPresenceTokens.text.secondary)}>
              {description}
            </div>
          ) : null}
        </div>
        {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {hasMedia ? (
        <div
          className={publicPresenceClassNames(
            useMobileLayout ? 'flex justify-start' : 'flex justify-start lg:justify-end',
            mediaPlacement === 'left' && !useMobileLayout && 'lg:order-1 lg:justify-start',
          )}
        >
          <div className="relative aspect-square w-full max-w-72 overflow-hidden rounded-lg border border-white/80 bg-white/60 shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
            {media}
          </div>
        </div>
      ) : null}
    </section>
  );
}
