// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import React from 'react';

import { SortableComponent } from './SortableComponent';

import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/homepage/editor-store';

export function Canvas() {
  const { content, theme, selectedComponentId, previewDevice, selectComponent, removeComponent, moveComponent } = useEditorStore();

  const width = previewDevice === 'mobile' ? '375px' : '100%';
  const height = previewDevice === 'mobile' ? '667px' : '100%';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = content.components.findIndex((c) => c.id === active.id);
      const newIndex = content.components.findIndex((c) => c.id === over.id);
      moveComponent(oldIndex, newIndex);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-8 overflow-hidden relative">
      <div 
        className={cn(
          "bg-white dark:bg-black shadow-2xl overflow-hidden relative transition-all duration-300",
          previewDevice === 'mobile' ? "rounded-[3rem] border-8 border-slate-800" : "w-full h-full rounded-md"
        )}
        style={{ width, height }}
        onClick={() => selectComponent(null)}
      >
        <div 
          className="h-full w-full overflow-y-auto custom-scrollbar"
          style={{
            '--color-primary': theme.colors.primary,
            '--color-bg': theme.colors.background,
            '--color-text': theme.colors.text,
            backgroundColor: theme.background.value,
            color: theme.colors.text
          } as React.CSSProperties}
        >
          <div className="min-h-full pb-20 pt-8 px-4">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={content.components.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {content.components.map((comp) => (
                  <SortableComponent 
                    key={comp.id}
                    comp={comp}
                    isSelected={selectedComponentId === comp.id}
                    theme={theme}
                    onSelect={selectComponent}
                    onRemove={removeComponent}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            {content.components.length === 0 && (
              <div className="border-2 border-dashed border-slate-300 rounded-lg h-32 flex items-center justify-center text-slate-400">
                Drag components here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
