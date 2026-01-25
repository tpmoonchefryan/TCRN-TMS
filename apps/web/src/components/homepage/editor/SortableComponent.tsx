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
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SortableComponent({ comp, isSelected, theme, onSelect, onRemove }: SortableComponentProps) {
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

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "relative group mb-2 cursor-pointer transition-all border-2 border-transparent rounded-lg",
        isSelected && "border-primary ring-2 ring-primary/20",
        isDragging && "shadow-xl bg-white dark:bg-slate-800"
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
      <div className={cn("pointer-events-none", isSelected && "pt-10")}> 
        {PreviewComponent ? (
          <PreviewComponent {...comp.props} />
        ) : (
          <div className="p-4 text-center text-red-500">Unknown Component: {comp.type}</div>
        )}
      </div>
    </div>
  );
}
