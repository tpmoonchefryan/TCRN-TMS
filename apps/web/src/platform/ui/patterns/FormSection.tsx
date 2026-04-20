import React from 'react';

import { tokens } from '../foundations/tokens';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, description, children, actions }) => {
  return (
    <section className="border-b border-slate-200/50 py-6 last:border-0">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h3 className={`text-lg font-bold ${tokens.colors.text}`}>{title}</h3>
          {description ? <p className={`text-sm leading-6 ${tokens.colors.textMuted}`}>{description}</p> : null}
        </div>
        <div className="space-y-6">
          {children}
        </div>
        {actions ? (
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
};
