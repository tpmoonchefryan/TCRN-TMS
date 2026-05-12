import { type CSSProperties } from 'react';

export type PublicPresenceAccentTone = 'rose' | 'amber' | 'sky' | 'emerald' | 'violet' | 'slate';
export type PublicPresenceDecorationDensity = 'none' | 'calm' | 'standard' | 'festive';
export type PublicPresenceMotionMode = 'standard' | 'quiet' | 'none';
export type PublicPresenceShellWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type PublicPresenceSurfaceVariant = 'panel' | 'note' | 'ticket' | 'inset';
export type PublicPresenceStateTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'unavailable';

export interface PublicPresenceAccentClassSet {
  solid: string;
  soft: string;
  ring: string;
  border: string;
}

export interface PublicPresenceAccentStyleInput {
  primary?: string | null;
  secondary?: string | null;
  text?: string | null;
}

export type PublicPresenceAccentStyle = CSSProperties & {
  '--public-presence-accent-primary'?: string;
  '--public-presence-accent-secondary'?: string;
  '--public-presence-accent-text'?: string;
};

export function publicPresenceClassNames(
  ...values: Array<string | false | null | undefined>
) {
  return values.filter(Boolean).join(' ');
}

export const publicPresenceTokens = {
  surface: {
    canvas: 'bg-[linear-gradient(180deg,#fff7ed_0%,#fdf2f8_48%,#eff6ff_100%)]',
    panel: 'border border-white/80 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl',
    note: 'border border-rose-100 bg-[#fffdf8] shadow-[0_14px_30px_rgba(190,18,60,0.08)]',
    ticket: 'border border-dashed border-sky-200 bg-white/90 shadow-[0_14px_30px_rgba(2,132,199,0.08)]',
    inset: 'border border-slate-200/80 bg-white/70 shadow-inner',
  },
  accent: {
    primary: 'bg-rose-500 text-white',
    secondary: 'bg-sky-100 text-sky-900',
    soft: 'bg-rose-50 text-rose-700',
    ring: 'ring-2 ring-rose-200/70',
  },
  text: {
    primary: 'text-slate-950',
    secondary: 'text-slate-700',
    muted: 'text-slate-500',
    inverse: 'text-white',
  },
  border: {
    soft: 'border-white/80',
    note: 'border-rose-100',
    ticket: 'border-sky-200',
    strong: 'border-slate-300',
  },
  shadow: {
    float: 'shadow-[0_18px_40px_rgba(15,23,42,0.10)]',
    lift: 'shadow-[0_24px_50px_rgba(15,23,42,0.13)]',
    note: 'shadow-[0_14px_30px_rgba(190,18,60,0.08)]',
    none: 'shadow-none',
  },
  radius: {
    card: 'rounded-lg',
    control: 'rounded-md',
    badge: 'rounded-full',
  },
  motion: {
    pop: 'transition duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none',
    float: 'animate-in fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none',
    quiet: 'transition-colors duration-150 ease-out motion-reduce:transition-none',
    none: 'motion-reduce:animate-none motion-reduce:transition-none',
  },
} as const;

const accentToneClasses: Record<PublicPresenceAccentTone, PublicPresenceAccentClassSet> = {
  rose: {
    solid: 'bg-rose-500 text-white',
    soft: 'bg-rose-50 text-rose-700',
    ring: 'ring-2 ring-rose-200/70',
    border: 'border-rose-200',
  },
  amber: {
    solid: 'bg-amber-400 text-slate-950',
    soft: 'bg-amber-50 text-amber-800',
    ring: 'ring-2 ring-amber-200/70',
    border: 'border-amber-200',
  },
  sky: {
    solid: 'bg-sky-500 text-white',
    soft: 'bg-sky-50 text-sky-800',
    ring: 'ring-2 ring-sky-200/70',
    border: 'border-sky-200',
  },
  emerald: {
    solid: 'bg-emerald-500 text-white',
    soft: 'bg-emerald-50 text-emerald-800',
    ring: 'ring-2 ring-emerald-200/70',
    border: 'border-emerald-200',
  },
  violet: {
    solid: 'bg-violet-500 text-white',
    soft: 'bg-violet-50 text-violet-800',
    ring: 'ring-2 ring-violet-200/70',
    border: 'border-violet-200',
  },
  slate: {
    solid: 'bg-slate-900 text-white',
    soft: 'bg-slate-100 text-slate-700',
    ring: 'ring-2 ring-slate-200/80',
    border: 'border-slate-200',
  },
};

const stateToneClasses: Record<PublicPresenceStateTone, PublicPresenceAccentClassSet> = {
  neutral: accentToneClasses.slate,
  info: accentToneClasses.sky,
  success: accentToneClasses.emerald,
  warning: accentToneClasses.amber,
  error: {
    solid: 'bg-rose-600 text-white',
    soft: 'bg-rose-50 text-rose-800',
    ring: 'ring-2 ring-rose-200/80',
    border: 'border-rose-200',
  },
  unavailable: {
    solid: 'bg-slate-500 text-white',
    soft: 'bg-slate-100 text-slate-600',
    ring: 'ring-2 ring-slate-200/80',
    border: 'border-slate-200',
  },
};

const surfaceVariantClasses: Record<PublicPresenceSurfaceVariant, string> = {
  panel: publicPresenceTokens.surface.panel,
  note: publicPresenceTokens.surface.note,
  ticket: publicPresenceTokens.surface.ticket,
  inset: publicPresenceTokens.surface.inset,
};

const shellWidthClasses: Record<PublicPresenceShellWidth, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

const decorationDensityClasses: Record<PublicPresenceDecorationDensity, string> = {
  none: 'hidden',
  calm: 'opacity-40',
  standard: 'opacity-60',
  festive: 'opacity-75',
};

export function getPublicPresenceAccentClasses(tone: PublicPresenceAccentTone = 'rose') {
  return accentToneClasses[tone];
}

export function getPublicPresenceStateClasses(tone: PublicPresenceStateTone = 'neutral') {
  return stateToneClasses[tone];
}

export function getPublicPresenceSurfaceClasses(variant: PublicPresenceSurfaceVariant = 'panel') {
  return surfaceVariantClasses[variant];
}

export function getPublicPresenceShellWidthClasses(width: PublicPresenceShellWidth = 'lg') {
  return shellWidthClasses[width];
}

export function getPublicPresenceDecorationDensityClasses(
  density: PublicPresenceDecorationDensity = 'standard',
) {
  return decorationDensityClasses[density];
}

export function getPublicPresenceMotionClasses(mode: PublicPresenceMotionMode = 'standard') {
  if (mode === 'none') {
    return publicPresenceTokens.motion.none;
  }

  if (mode === 'quiet') {
    return publicPresenceTokens.motion.quiet;
  }

  return publicPresenceTokens.motion.pop;
}

function normalizeCssColor(value: string | null | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

export function createPublicPresenceAccentStyle(
  input: PublicPresenceAccentStyleInput = {},
): PublicPresenceAccentStyle {
  const primary = normalizeCssColor(input.primary);
  const secondary = normalizeCssColor(input.secondary);
  const text = normalizeCssColor(input.text);
  const style: PublicPresenceAccentStyle = {};

  if (primary) {
    style['--public-presence-accent-primary'] = primary;
  }

  if (secondary) {
    style['--public-presence-accent-secondary'] = secondary;
  }

  if (text) {
    style['--public-presence-accent-text'] = text;
  }

  return style;
}
