// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ChangeLogDiff } from '@tcrn/shared';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { cn } from '@/lib/utils';

interface DiffViewerProps {
  diff: ChangeLogDiff | null;
  className?: string;
}

/**
 * Format value for display
 * Handles complex objects, arrays, and primitive values
 */
function formatValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-slate-400 italic">null</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-600' : 'text-red-600'}>
        {value ? 'true' : 'false'}
      </span>
    );
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-slate-400 italic">[]</span>;
      }
      return (
        <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded overflow-x-auto max-w-[300px]">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return (
      <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded overflow-x-auto max-w-[300px]">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  // String or number
  const strValue = String(value);
  if (strValue.length > 100) {
    return (
      <span title={strValue}>
        {strValue.slice(0, 100)}...
      </span>
    );
  }

  return strValue;
}

export function DiffViewer({ diff, className }: DiffViewerProps) {
  const t = useTranslations('diffViewer');
  
  if (!diff || Object.keys(diff).length === 0) {
    return <div className="text-sm text-slate-400 italic">{t('noChanges')}</div>;
  }

  return (
    <div className={cn("border rounded-md overflow-hidden text-sm", className)}>
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-slate-500 w-1/4">{t('field')}</th>
            <th className="px-4 py-2 text-left font-medium text-slate-500 w-[37.5%]">{t('oldValue')}</th>
            <th className="px-4 py-2 text-left font-medium text-slate-500 w-[37.5%]">{t('newValue')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {Object.entries(diff).map(([field, { old: oldVal, new: newVal }]) => {
            const isNullNew = newVal === null || newVal === undefined;
            
            return (
              <tr key={field} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 border-r align-top">
                  {field}
                </td>
                <td className="px-4 py-3 bg-red-50/30 dark:bg-red-900/10 text-slate-700 dark:text-slate-300 break-words align-top">
                  {formatValue(oldVal)}
                </td>
                <td className="px-4 py-3 bg-green-50/30 dark:bg-green-900/10 text-slate-700 dark:text-slate-300 break-words align-top">
                  <div className="flex items-start gap-2">
                    {!isNullNew && (
                      <ArrowRight size={12} className="text-green-500 shrink-0 opacity-50 mt-1" />
                    )}
                    <div>{formatValue(newVal)}</div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
