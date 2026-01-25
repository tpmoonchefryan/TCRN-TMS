// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: unknown;
  className?: string;
  collapsed?: boolean;
}

export function JsonViewer({ data, className, collapsed = false }: JsonViewerProps) {
  if (data === null || data === undefined) {
    return <span className="text-slate-400 italic">null</span>;
  }

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <pre 
      className={cn(
        "bg-slate-50 dark:bg-slate-950 p-4 rounded-md border text-xs font-mono overflow-auto max-h-[400px]",
        className
      )}
    >
      <code className="text-slate-700 dark:text-slate-300">
        {jsonString}
      </code>
    </pre>
  );
}
