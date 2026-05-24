import React from 'react';

import { tokens } from '../foundations/tokens';

export type StateViewStatus = 'empty' | 'error' | 'denied' | 'unavailable';

export interface StateViewProps {
  status: StateViewStatus;
  title: string;
  description?: string;
  secondaryText?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export const StateView: React.FC<StateViewProps> = ({
  status,
  title,
  description,
  secondaryText,
  action,
  actions,
  icon,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'error':
        return 'text-red-500 bg-red-50';
      case 'denied':
        return 'text-amber-500 bg-amber-50';
      case 'unavailable':
        return 'text-slate-400 bg-slate-50';
      case 'empty':
      default:
        return 'text-indigo-500 bg-indigo-50';
    }
  };

  const DefaultIcon = () => (
    <svg
      className="h-8 w-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      {status === 'error' && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      )}
      {status === 'denied' && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      )}
      {status === 'unavailable' && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      )}
      {status === 'empty' && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      )}
    </svg>
  );

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border p-12 text-center ${tokens.colors.border} ${tokens.colors.surface} ${tokens.effects.glass} animate-in fade-in duration-300 ${tokens.motion.reduced}`}
    >
      <div
        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${getStatusColor()}`}
      >
        {icon || <DefaultIcon />}
      </div>
      <h3 className={`mb-2 text-lg font-bold ${tokens.colors.text}`}>{title}</h3>
      {description && (
        <p className={`max-w-sm text-sm ${tokens.colors.textMuted}`}>{description}</p>
      )}
      {secondaryText && (
        <p className={`mt-2 max-w-sm text-xs leading-5 ${tokens.colors.textMuted}`}>
          {secondaryText}
        </p>
      )}
      {actions || action ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions || action}
        </div>
      ) : null}
    </div>
  );
};
