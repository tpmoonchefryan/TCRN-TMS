/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    closestCenter,
    defaultDropAnimationSideEffects,
    DndContext,
    DragOverlay,
    DropAnimation,
    KeyboardSensor,
    MeasuringStrategy // Added
    ,





    MouseSensor, // Added
    TouchSensor, // Added
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import React, { useState } from 'react';

import { COMPONENT_REGISTRY } from '../lib/component-registry';

import { SortableComponent } from './SortableComponent';

import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/homepage/editor-store';

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

export function Canvas() {
  const { content, theme, selectedComponentId, previewDevice, selectComponent, removeComponent, moveComponent } = useEditorStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [dragHeight, setDragHeight] = useState<number | null>(null); // Added height state
  const containerRef = React.useRef<HTMLDivElement>(null);

  const width = previewDevice === 'mobile' ? '375px' : '100%';
  const height = previewDevice === 'mobile' ? '667px' : '100%';

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
     setActiveId(event.active.id);
     
     // Robust Width & Height Calculation
     const node = document.getElementById(event.active.id);
     if (node) {
        setDragWidth(node.offsetWidth);
        setDragHeight(node.offsetHeight); // Capture Height
     } else {
        // Fallback Width
        const component = content.components.find(c => c.id === event.active.id);
        if (component && containerRef.current) {
           const containerWidth = containerRef.current.offsetWidth;
           const availableWidth = containerWidth - 32; 
           const colSpan = (component.props as any).colSpan || 6;
           const approxWidth = (availableWidth / 6) * colSpan; 
           setDragWidth(approxWidth);
        }
     }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDragWidth(null);
    setDragHeight(null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    setDragWidth(null);
    setDragHeight(null);

    if (active && over && active.id !== over.id) {
      const oldIndex = content.components.findIndex((c) => c.id === active.id);
      const newIndex = content.components.findIndex((c) => c.id === over.id);
      moveComponent(oldIndex, newIndex);
    }
  };

  // Find active component for Overlay
  const activeComponent = content.components.find(c => c.id === activeId);

  // Scroll Strategy:
  // Desktop: The "Page" grows, and we scroll the "Canvas" (gray area).
  // Mobile: The "Device" is fixed height, and we scroll the "Screen" (inner content).
  const isDesktop = previewDevice === 'desktop';

  return (
    <div 
      className={cn(
        "flex-1 min-h-0 w-full h-full bg-slate-100 dark:bg-slate-900 relative transition-all duration-300 touch-pan-y", // Added h-full
        // Desktop: Scroll the canvas itself
        isDesktop ? "overflow-y-auto custom-scrollbar p-8 block" : "overflow-hidden flex items-center justify-center p-8"
      )}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bg-move {
          0% { background-position: 0 0; }
          100% { background-position: 20px 20px; }
        }
        .animate-bg-move {
          animation: bg-move 3s linear infinite;
        }
      `}} />
      <div 
        className={cn(
          "bg-white dark:bg-black shadow-2xl relative transition-all duration-300 flex flex-col mx-auto",
          previewDevice === 'mobile' ? "rounded-[3rem] border-8 border-slate-800 overflow-hidden" : 
          previewDevice === 'tablet' ? "rounded-[2rem] border-8 border-slate-800 overflow-hidden" :
          "rounded-md" // Desktop: No overflow-hidden here, allow grow
        )}
        style={{ 
          width: width, 
          height: isDesktop ? 'auto' : height, // Desktop auto height
          minHeight: isDesktop ? '100%' : undefined
        }}
        onClick={() => selectComponent(null)}
      >
        <div 
          ref={containerRef}
          className={cn(
             "w-full relative animate-bg-move",
             // Mobile: Scroll inside the device screen. Desktop: No internal scroll (handled by parent)
             !isDesktop ? "flex-1 overflow-y-auto custom-scrollbar touch-pan-y" : "min-h-full"
          )} 
          style={{
            '--color-primary': theme.colors.primary,
            '--color-bg': theme.colors.background,
            '--color-text': theme.colors.text,
            backgroundColor: theme.background.value,
            color: theme.colors.text,
            backgroundImage: theme.decorations?.type === 'dots' 
              ? `radial-gradient(${theme.decorations?.color || '#000000'}20 1px, transparent 1px)`
              : theme.decorations?.type === 'grid' 
                ? `linear-gradient(${theme.decorations?.color || '#000000'}10 1px, transparent 1px), linear-gradient(90deg, ${theme.decorations?.color || '#000000'}10 1px, transparent 1px)`
                : undefined,
            backgroundSize: theme.decorations?.type === 'dots' ? '20px 20px' : theme.decorations?.type === 'grid' ? '40px 40px' : undefined
          } as React.CSSProperties}
        >
          <div className="min-h-full pb-20 pt-8 px-4">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} 
              autoScroll={{ layoutShiftCompensation: false }} // Added autoScroll
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext 
                items={content.components.map(c => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pb-10"> 
                  {content.components.map((comp) => (
                    <SortableComponent 
                      key={comp.id}
                      comp={comp}
                      isSelected={selectedComponentId === comp.id}
                      theme={theme}
                      editingLocale={useEditorStore.getState().editingLocale}
                      onSelect={selectComponent}
                      onRemove={removeComponent}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={dropAnimation}>
                {activeComponent ? (
                  <div 
                    className="cursor-grabbing pointer-events-none" 
                    style={{
                      width: dragWidth ? `${dragWidth}px` : 'auto',
                      height: dragHeight ? `${dragHeight}px` : 'auto', 
                    }}
                  >
                    {(() => {
                      const Definition = COMPONENT_REGISTRY[activeComponent.type];
                      if (!Definition) return null;
                      const Preview = Definition.preview;
                      const effectiveProps = { 
                        ...activeComponent.props, 
                        ...(activeComponent.i18n?.[useEditorStore.getState().editingLocale] || {}) 
                      };
                      return <div className="w-full h-full overflow-hidden"><Preview {...effectiveProps} /></div>;
                    })()}
                  </div>
                ) : null}
              </DragOverlay>
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
