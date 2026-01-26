// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ComponentInstance, ThemeConfig } from '@tcrn/shared';
import { GripVertical, Trash2 } from 'lucide-react';

import { COMPONENT_REGISTRY } from '../lib/component-registry';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SortableComponentProps {
  comp: ComponentInstance;
  isSelected: boolean;
  theme: ThemeConfig;
  editingLocale?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SortableComponent({ comp, isSelected, theme, editingLocale, onSelect, onRemove }: SortableComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: comp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
    position: 'relative' as const
  };

  const definition = COMPONENT_REGISTRY[comp.type];
  const PreviewComponent = definition?.preview;

  // Resolve effective props
  let effectiveProps = comp.props;
  if (editingLocale && editingLocale !== 'default') {
      effectiveProps = { ...comp.props, ...(comp.i18n?.[editingLocale] || {}) };
  }

  // Calculate Column Span
  const colSpan = (comp.props as any).colSpan || 6;
  const colSpanClass = {
    6: 'col-span-1 md:col-span-6',
    3: 'col-span-1 md:col-span-3',
    2: 'col-span-1 md:col-span-2'
  }[colSpan as 2|3|6] || 'col-span-1 md:col-span-6';

  return (
    <div 
      id={comp.id} // Added for width capture
      ref={setNodeRef} 
      style={style}
      className={cn(
        "relative group h-full cursor-pointer border-2 border-transparent rounded-lg", // Removed mb-2, added h-full
        colSpanClass, 
        isSelected && "border-primary ring-2 ring-primary/20",
        isDragging && "opacity-0" // Hide completely when dragging to avoid visual squash
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(comp.id);
      }}
    >
      {/* Editor Overlay Actions - positioned inside component, top-right corner */}
      {isSelected && (
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
      )}

      {/* Render Component Content */}
      <div 
        className={cn(
          "pointer-events-none h-full transition-all duration-500 ease-out", // Added h-full 
          isSelected && "pt-10",
          // Entrance Animation
          theme.animation?.enable_entrance && "animate-in fade-in slide-in-from-bottom-4",
          // Hover Animation (only if not dragging/selected to avoid jitter)
          theme.animation?.enable_hover && !isSelected && !isDragging && "hover:scale-[1.02] hover:-translate-y-1"
        )}
        style={{
           animationDuration: theme.animation?.intensity === 'low' ? '1s' : theme.animation?.intensity === 'high' ? '0.3s' : '0.5s'
        }}
      > 
        {PreviewComponent ? (
          <PreviewComponent {...effectiveProps} />
        ) : (
          <div className="p-4 text-center text-red-500">Unknown Component: {comp.type}</div>
        )}
      </div>
    </div>
  );
}
