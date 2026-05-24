import { HelpCircle } from 'lucide-react';
import React from 'react';

export interface HelpLinkProps {
  label: string;
  ariaLabel: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export const HelpLink: React.FC<HelpLinkProps> = ({
  label,
  ariaLabel,
  href,
  onClick,
  className = '',
}) => {
  const sharedClassName = `inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`;
  const icon = <HelpCircle className="h-4 w-4" aria-hidden="true" />;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    onClick?.();

    if (!href?.startsWith('#')) {
      return;
    }

    const target = document.getElementById(href.slice(1));
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    target.focus({ preventScroll: true });
  };

  if (href) {
    return (
      <a href={href} className={sharedClassName} aria-label={ariaLabel} onClick={handleClick}>
        {icon}
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button type="button" className={sharedClassName} aria-label={ariaLabel} onClick={handleClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
};
