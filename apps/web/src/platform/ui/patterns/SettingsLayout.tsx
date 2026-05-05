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
  help?: React.ReactNode;
  sectionNavId?: string;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  title,
  description,
  sections,
  activeSectionId,
  onSectionChange,
  children,
  ariaLabel,
  help,
  sectionNavId,
}) => {
  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const focusableSectionId = sections.some((section) => section.id === activeSectionId)
    ? activeSectionId
    : sections[0]?.id;

  const moveToSection = (sectionId: string) => {
    onSectionChange(sectionId);
    buttonRefs.current[sectionId]?.focus();
  };

  const handleSectionNavKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (sections.length === 0) {
      return;
    }

    const activeIndex = Math.max(
      sections.findIndex((section) => section.id === focusableSectionId),
      0,
    );
    const lastIndex = sections.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = activeIndex >= lastIndex ? 0 : activeIndex + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = activeIndex <= 0 ? lastIndex : activeIndex - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    moveToSection(sections[nextIndex].id);
  };

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <h1 className={`text-3xl font-bold ${tokens.colors.text}`}>{title}</h1>
          {description ? <p className={`max-w-4xl text-sm leading-6 ${tokens.colors.textMuted}`}>{description}</p> : null}
        </div>
        {help ? <div className="flex flex-none justify-start lg:justify-end">{help}</div> : null}
      </header>

      <nav id={sectionNavId} className="-mx-1 overflow-x-auto pb-1" aria-label={ariaLabel}>
        <div
          className="flex min-w-max gap-2 rounded-[1.75rem] border border-slate-200 bg-white/72 p-2 shadow-sm"
          onKeyDown={handleSectionNavKeyDown}
        >
          {sections.map((section) => {
            const isActive = section.id === activeSectionId;

            return (
              <button
                key={section.id}
                ref={(node) => {
                  buttonRefs.current[section.id] = node;
                }}
                type="button"
                onClick={() => onSectionChange(section.id)}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={section.id === focusableSectionId ? 0 : -1}
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
