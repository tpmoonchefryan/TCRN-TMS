import { type CustomField } from '@puckeditor/core';
import { type LucideIcon } from 'lucide-react';

interface HomepagePuckChoiceOption<T extends string> {
  icon?: LucideIcon;
  label: string;
  shortLabel?: string;
  value: T;
}

function HomepagePuckChoiceField<T extends string>({
  label,
  onChange,
  options,
  readOnly = false,
  value,
}: Readonly<{
  label: string;
  onChange: (value: T) => void;
  options: readonly HomepagePuckChoiceOption<T>[];
  readOnly?: boolean;
  value: T;
}>) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={isActive}
              disabled={readOnly}
              onClick={() => {
                onChange(option.value);
              }}
              className={`inline-flex min-w-[2.25rem] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium leading-none transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              } ${readOnly ? 'cursor-default opacity-70' : ''}`}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              <span>{option.shortLabel || option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function createHomepagePuckChoiceField<T extends string>(
  label: string,
  options: readonly HomepagePuckChoiceOption<T>[],
): CustomField<T> {
  return {
    type: 'custom',
    label,
    render: ({ onChange, readOnly, value }) => {
      const fallbackValue = options[0]?.value;
      const nextValue = typeof value === 'string' ? (value as T) : fallbackValue;

      return (
        <HomepagePuckChoiceField
          label={label}
          options={options}
          readOnly={readOnly}
          value={nextValue as T}
          onChange={(nextChoice) => {
            onChange(nextChoice);
          }}
        />
      );
    },
  };
}
