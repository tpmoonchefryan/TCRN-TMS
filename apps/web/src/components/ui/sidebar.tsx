// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Context for sidebar state
interface SidebarContextValue {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// Provider
interface SidebarProviderProps {
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function SidebarProvider({ children, defaultExpanded = true }: SidebarProviderProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  
  return (
    <SidebarContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Main Sidebar container
interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function Sidebar({ children, className, ...props }: SidebarProps) {
  const { expanded } = useSidebar();
  
  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-background border-r transition-all duration-300',
        expanded ? 'w-64' : 'w-16',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

// Sidebar Header
interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return (
    <div
      className={cn('flex h-14 items-center border-b px-4', className)}
      {...props}
    />
  );
}

// Sidebar Content
interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarContent({ className, ...props }: SidebarContentProps) {
  return (
    <div
      className={cn('flex-1 overflow-auto py-2', className)}
      {...props}
    />
  );
}

// Sidebar Footer
interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return (
    <div
      className={cn('border-t px-4 py-2', className)}
      {...props}
    />
  );
}

// Sidebar Group
interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarGroup({ className, ...props }: SidebarGroupProps) {
  return (
    <div
      className={cn('px-2 py-2', className)}
      {...props}
    />
  );
}

// Sidebar Group Label
interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

function SidebarGroupLabel({ className, ...props }: SidebarGroupLabelProps) {
  return (
    <div
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider',
        className
      )}
      {...props}
    />
  );
}

// Sidebar Menu
interface SidebarMenuProps extends React.HTMLAttributes<HTMLUListElement> {}

function SidebarMenu({ className, ...props }: SidebarMenuProps) {
  return (
    <ul
      className={cn('space-y-1', className)}
      {...props}
    />
  );
}

// Sidebar Menu Item
interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {}

function SidebarMenuItem({ className, ...props }: SidebarMenuItemProps) {
  return (
    <li
      className={cn('', className)}
      {...props}
    />
  );
}

// Sidebar Menu Button
interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  isActive?: boolean;
}

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, asChild = false, isActive = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        ref={ref}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          isActive && 'bg-accent text-accent-foreground',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

// Sidebar Trigger (toggle button)
interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function SidebarTrigger({ className, ...props }: SidebarTriggerProps) {
  const { expanded, setExpanded } = useSidebar();
  
  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="9" x2="9" y1="3" y2="21" />
      </svg>
      <span className="sr-only">Toggle sidebar</span>
    </button>
  );
}

export {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
};
