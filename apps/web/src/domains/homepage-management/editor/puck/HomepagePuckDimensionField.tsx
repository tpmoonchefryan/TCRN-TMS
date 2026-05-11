'use client';

import { type CustomField } from '@puckeditor/core';
import { Minus, Plus } from 'lucide-react';

interface HomepagePuckDimensionFieldOptions {
  helperText?: string;
  max: number;
  min: number;
  step: number;
}

function clampDimension(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function resolveDimensionValue(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function HomepagePuckDimensionField({
  fieldId,
  helperText,
  label,
  max,
  min,
  name,
  onChange,
  readOnly,
  step,
  value,
}: Readonly<{
  fieldId: string;
  helperText?: string;
  label: string;
  max: number;
  min: number;
  name?: string;
  onChange: (value: number | null) => void;
  readOnly?: boolean;
  step: number;
  value: number | null;
}>) {
  const currentValue = resolveDimensionValue(value);
  const isDisabled = readOnly === true;

  function updateValue(nextValue: string) {
    if (!nextValue.trim()) {
      onChange(null);
      return;
    }

    const parsedValue = Number(nextValue);

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    onChange(clampDimension(parsedValue, min, max));
  }

  function shiftValue(delta: number) {
    const baseValue = currentValue ?? min;
    onChange(clampDimension(baseValue + delta, min, max));
  }

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={isDisabled}
          onClick={() => shiftValue(-step)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input
          id={fieldId}
          name={name}
          type="number"
          min={min}
          max={max}
          step={step}
          value={currentValue ?? ''}
          onChange={(event) => updateValue(event.target.value)}
          disabled={isDisabled}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:ring-0"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={isDisabled}
          onClick={() => shiftValue(step)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {helperText || `Enter a value between ${min} and ${max}px.`}
      </p>
    </div>
  );
}

export function createHomepagePuckDimensionField(
  label: string,
  options: HomepagePuckDimensionFieldOptions,
): CustomField<number | null> {
  return {
    type: 'custom',
    label,
    render: ({ id, name, onChange, readOnly, value }) => (
      <HomepagePuckDimensionField
        fieldId={id}
        helperText={options.helperText}
        label={label}
        max={options.max}
        min={options.min}
        name={name}
        onChange={onChange}
        readOnly={readOnly}
        step={options.step}
        value={typeof value === 'number' ? value : null}
      />
    ),
  };
}
