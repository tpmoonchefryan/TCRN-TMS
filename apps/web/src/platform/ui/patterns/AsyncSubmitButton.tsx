import React from 'react';

import { tokens } from '../foundations/tokens';

export interface AsyncSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
  pendingText?: string;
  intent?: 'primary' | 'danger';
}

export const AsyncSubmitButton: React.FC<AsyncSubmitButtonProps> = ({
  isPending = false,
  pendingText = 'Processing...',
  intent = 'primary',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = `inline-grid px-4 py-2 font-medium rounded-lg ${tokens.motion.transitionQuick} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`;

  const intentClasses = intent === 'danger'
    ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
    : 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500';

  const disabledClasses = (disabled || isPending) ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseClasses} ${intentClasses} ${disabledClasses} ${className}`}
      disabled={disabled || isPending}
      aria-busy={isPending}
      {...props}
    >
      <span className="col-start-1 row-start-1 flex items-center justify-center">
        <span className={`${isPending ? 'opacity-0' : 'opacity-100'} ${tokens.motion.transitionQuick} ${tokens.motion.reduced}`}>
          {children}
        </span>
      </span>
      <span className="col-start-1 row-start-1 flex items-center justify-center">
        <span className={`flex items-center gap-2 ${isPending ? 'opacity-100' : 'opacity-0'} ${tokens.motion.transitionQuick} ${tokens.motion.reduced}`}>
          <svg className="animate-spin motion-reduce:animate-none h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {pendingText}
        </span>
      </span>
    </button>
  );
};
