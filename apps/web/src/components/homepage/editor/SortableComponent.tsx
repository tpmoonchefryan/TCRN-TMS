/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ComponentInstance, ThemeConfig } from '@tcrn/shared';
import { GripVertical, Trash2 } from 'lucide-react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { COMPONENT_REGISTRY } from '../lib/component-registry';

interface SortableComponentProps {
  comp: ComponentInstance;
  isSelected: boolean;
  theme: ThemeConfig;
  editingLocale?: string;
  messages: Record<string, any>;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

interface ComponentProps {
  colSpan?: number;
  rowSpan?: number;
  heightMode?: string;
  x?: number;
  y?: number;
  w?: number; // Alias for colSpan
  h?: number; // Alias for rowSpan
}

export function SortableComponent({ comp, isSelected, theme, editingLocale, messages, onSelect, onRemove, onUpdate }: SortableComponentProps & { onUpdate?: (id: string, props: any) => void }) { // Added onUpdate
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({ id: comp.id });

  // Add a ref for the component element to measuring
  const componentRef = React.useRef<HTMLDivElement>(null);

  const style = {
    // For free drag, we use transform directly
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : 'auto', 
  };



  // --- Dimension Logic ---
  const props = comp.props as ComponentProps;
  const definition = COMPONENT_REGISTRY[comp.type]; // Ensure definition is used
  const defaultProps = definition?.defaultProps || {};
  const PreviewComponent = definition?.preview;

  let effectiveProps = comp.props;
  if (editingLocale && editingLocale !== 'default') {
      effectiveProps = { ...comp.props, ...(comp.i18n?.[editingLocale] || {}) };
  }

  // Resolve Col Span (1-6)
  // Priority: props.colSpan > props.w > defaultProps.colSpan > 6
  const colSpan = props.colSpan || props.w || defaultProps.colSpan || 6;
  
  // Resolve Row Span
  let rowSpan = props.rowSpan || props.h;
  if (!rowSpan) {
    // If explicit rowSpan missing, check heightMode or fallback to defaults
    const heightMode = props.heightMode || defaultProps.heightMode || 'auto';
    const isProfile = comp.type === 'ProfileCard';
    const autoSpan = isProfile ? 6 : 4;
    
    // Check if registry has a specific default rowSpan (e.g. spacers might need it)
    if (defaultProps.rowSpan) {
      rowSpan = defaultProps.rowSpan;
    } else {
      rowSpan = {
          'auto': autoSpan,
          'small': 2,
          'medium': 4,
          'large': 6
      }[heightMode as string] || 4;
    }
  }

  // Resolve Position (x, y)
  const gridColumnStart = props.x || 'auto';
  const gridRowStart = props.y || 'auto';

  // --- Resize Handler ---
  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onUpdate) return;
    
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId); // Capture pointer for reliable tracking

    const startX = e.clientX;
    const startY = e.clientY;
    const startColSpan = colSpan;
    const startRowSpan = rowSpan; // Use resolved rowSpan
    
    const element = componentRef.current;
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    // Safety check: if startColSpan is 0 or NaN, default to 6 to avoid divide by zero
    const effectiveStartColSpan = startColSpan || 6;
    const unitWidth = rect.width / effectiveStartColSpan; 
    const unitHeight = 80 + 16; 

    const onPointerMove = (e: Event) => {
        const moveEvent = e as unknown as PointerEvent; // Cast safely
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        const dCol = Math.round(dx / unitWidth);
        const dRow = Math.round(dy / unitHeight);

        const newColSpan = Math.max(1, Math.min(6, effectiveStartColSpan + dCol));
        const newRowSpan = Math.max(1, (startRowSpan || 4) + dRow); // Fallback to 4 safely if somehow undefined

        if (newColSpan !== colSpan || newRowSpan !== rowSpan) {
             onUpdate(comp.id, { ...comp.props, colSpan: newColSpan, rowSpan: newRowSpan, w: newColSpan, h: newRowSpan });
        }
    };

    const onPointerUp = (e: Event) => {
        const upEvent = e as unknown as PointerEvent; 
        target.releasePointerCapture(upEvent.pointerId);
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', onPointerUp);
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
  };


  return (
    <div 
      id={comp.id}
      ref={(node) => {
          setNodeRef(node);
          (componentRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }}
      style={{
          ...style,
          '--desktop-col-start': gridColumnStart,
          '--desktop-row-start': gridRowStart,
          '--desktop-col-span': `${colSpan}`, // Just the number
          '--desktop-row-span': `${rowSpan}`, // Just the number
      } as React.CSSProperties}
      className={cn(
        "relative group cursor-pointer border-2 border-transparent rounded-lg",
        // Mobile: auto width (col-span-1), auto height
        "col-span-1 h-auto",
        // Desktop: Grid Positioning
        // utilizing grid-column: start / span n
        // Tailwind arbitrary: [property:value]
        "md:[grid-column:var(--desktop-col-start)_/_span_var(--desktop-col-span)]", 
        "md:[grid-row:var(--desktop-row-start)_/_span_var(--desktop-row-span)]",
        isSelected && "border-primary ring-2 ring-primary/20",
        isDragging && "z-50 shadow-2xl opacity-80"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(comp.id);
      }}
    >
      {/* Editor Overlay Actions */}
      {isSelected && (
        <>
            <div className="absolute right-2 top-2 flex gap-1 z-50">
            <div {...attributes} {...listeners} className="touch-none">
                <Button 
                size="icon" 
                variant="secondary" 
                className="h-7 w-7 shadow-md cursor-grab active:cursor-grabbing"
                >
                <GripVertical size={14} />
                </Button>
            </div>
            <Button 
                size="icon" 
                variant="destructive" 
                className="h-7 w-7 shadow-md"
                onClick={(e) => {
                e.stopPropagation();
                onRemove(comp.id);
                }}
            >
                <Trash2 size={14} />
            </Button>
            </div>

            {/* RESIZE HANDLE */}
            {/* Removed opacity transition: Always visible when selected */}
             <div 
                className="absolute right-1 bottom-1 w-6 h-6 z-50 cursor-se-resize flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm touch-none"
                onPointerDown={handleResizeStart}
                style={{ touchAction: 'none' }}
             >
                 <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-slate-500">
                     <path d="M10 10L0 10L10 0L10 10Z" fill="currentColor"/>
                 </svg>
            </div>
        </>
      )}

      {/* Render Component Content */}
      <div 
        className={cn(
          "pointer-events-none h-full w-full overflow-hidden transition-all duration-500 ease-out", 
          "relative group transition-all duration-200",
          theme.animation?.enableEntrance && "animate-in fade-in slide-in-from-bottom-4",
          theme.animation?.enableHover && !isSelected && !isDragging && "hover:scale-[1.02] hover:-translate-y-1"
        )}
        style={{
           animationDuration: theme.animation?.intensity === 'low' ? '1s' : theme.animation?.intensity === 'high' ? '0.3s' : '0.5s'
        }}
      > 
        {PreviewComponent ? (
          <NextIntlClientProvider locale={editingLocale || 'en'} messages={messages[editingLocale || 'en'] || messages['default']}>
             <PreviewComponent {...effectiveProps} />
          </NextIntlClientProvider>
        ) : (
          <div className="p-4 text-center text-red-500">Unknown Component: {comp.type}</div>
        )}
      </div>
    </div>
  );
}
