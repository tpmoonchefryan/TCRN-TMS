import React from 'react';

export interface SidebarNavProps {
  items: {
    key: string;
    label: string;
    icon?: React.ReactNode;
    href: string;
    isActive?: boolean;
  }[];
  onNavigate: (href: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  ariaLabel?: string;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ items, onNavigate, header, footer, ariaLabel }) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {header && <div className="flex-none border-b border-slate-200/50 p-4">{header}</div>}
      
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4" aria-label={ariaLabel}>
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            onClick={(e) => {
              if (
                e.button === 0 && 
                !e.ctrlKey && 
                !e.metaKey && 
                !e.shiftKey && 
                !e.altKey
              ) {
                e.preventDefault();
                onNavigate(item.href);
              }
            }}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${item.isActive 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
            `}
            aria-current={item.isActive ? 'page' : undefined}
          >
            {item.icon && <span className="w-5 h-5 flex items-center justify-center flex-none" aria-hidden="true">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
          </a>
        ))}
      </nav>

      {footer && <div className="flex-none border-t border-slate-200/50 bg-white/60 p-4">{footer}</div>}
    </div>
  );
};
