import React, { useEffect, useId, useState } from 'react';

export interface CommandShortcut {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export interface CommandSearchInputProps {
  placeholder: string;
  ariaLabel: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  onSubmit?: (query: string) => void;
  shortcutKey?: string;
  shortcut?: CommandShortcut;
  onShortcut?: () => void;
  disabled?: boolean;
  className?: string;
}

function matchesShortcut(event: KeyboardEvent, shortcut: CommandShortcut) {
  return event.key.toLowerCase() === shortcut.key.toLowerCase()
    && Boolean(event.altKey) === Boolean(shortcut.altKey)
    && Boolean(event.ctrlKey) === Boolean(shortcut.ctrlKey)
    && Boolean(event.metaKey) === Boolean(shortcut.metaKey)
    && Boolean(event.shiftKey) === Boolean(shortcut.shiftKey);
}

export const CommandSearchInput: React.FC<CommandSearchInputProps> = ({
  placeholder,
  ariaLabel,
  value,
  defaultValue = '',
  onValueChange,
  onSearch,
  onSubmit,
  shortcutKey,
  shortcut,
  onShortcut,
  disabled = false,
  className = '',
}) => {
  const inputId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const currentValue = value ?? uncontrolledValue;

  useEffect(() => {
    if (!shortcut || !onShortcut) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!matchesShortcut(event, shortcut)) {
        return;
      }

      event.preventDefault();
      onShortcut();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onShortcut, shortcut]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
    onSearch?.(nextValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSubmit?.(currentValue);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        id={inputId}
        type="search"
        placeholder={placeholder}
        value={currentValue}
        disabled={disabled}
        className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-12 text-sm transition-colors hover:bg-slate-50 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
      />
      {shortcutKey ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <kbd className="inline-flex rounded border border-slate-200 px-2 font-sans text-sm font-medium text-slate-400">
            {shortcutKey}
          </kbd>
        </div>
      ) : null}
    </div>
  );
};
