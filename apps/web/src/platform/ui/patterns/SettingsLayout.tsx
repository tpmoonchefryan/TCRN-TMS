import React from 'react';

import { tokens } from '../foundations/tokens';

export interface SettingsSection {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SettingsLayoutProps {
  title: string;
  description?: string;
  sections: SettingsSection[];
  activeSectionId: string;
  onSectionChange: (sectionId: string) => void;
  children: React.ReactNode;
  ariaLabel?: string;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  title,
  description,
  sections,
  activeSectionId,
  onSectionChange,
  children,
  ariaLabel,
}) => {
  return (
    <div className="w-full space-y-6">
      <header className="space-y-3">
        <h1 className={`text-3xl font-bold ${tokens.colors.text}`}>{title}</h1>
        {description ? <p className={`max-w-4xl text-sm leading-6 ${tokens.colors.textMuted}`}>{description}</p> : null}
      </header>

      <nav className="-mx-1 overflow-x-auto pb-1" aria-label={ariaLabel}>
        <div className="flex min-w-max gap-2 rounded-[1.75rem] border border-slate-200 bg-white/72 p-2 shadow-sm">
          {sections.map((section) => {
            const isActive = section.id === activeSectionId;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  inline-flex items-center gap-3 rounded-[1.1rem] px-4 py-2.5 text-sm font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  ${isActive
                    ? 'bg-slate-950 text-white shadow-sm'
                    : `text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${tokens.motion.transitionStandard} motion-reduce:transition-none`}
                `}
              >
                {section.icon ? (
                  <span className="flex h-5 w-5 flex-none items-center justify-center" aria-hidden="true">
                    {section.icon}
                  </span>
                ) : null}
                <span className="whitespace-nowrap">{section.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="min-w-0 pb-12">{children}</main>
    </div>
  );
};
