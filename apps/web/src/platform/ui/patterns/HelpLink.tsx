import React from 'react';

export interface HelpLinkProps {
  label: string;
  ariaLabel: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export const HelpLink: React.FC<HelpLinkProps> = ({ label, ariaLabel, href, onClick, className = '' }) => {
  const sharedClassName = `inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`;
  const icon = (
    <svg className="h-4 w-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9.228a3.75 3.75 0 117.044 1.794c-.72.577-1.272 1.004-1.272 2.228M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  if (href) {
    return (
      <a href={href} className={sharedClassName} aria-label={ariaLabel} onClick={onClick}>
        {icon}
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button type="button" className={sharedClassName} aria-label={ariaLabel} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
};
