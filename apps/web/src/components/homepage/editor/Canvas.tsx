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
import { NextIntlClientProvider } from 'next-intl';
import React, { useState } from 'react';

import { COMPONENT_REGISTRY } from '../lib/component-registry';
import { layoutComponents } from '../lib/layout-utils';

import { SortableComponent } from './SortableComponent';

import enMessages from '@/i18n/messages/en.json';
import jaMessages from '@/i18n/messages/ja.json';
import zhMessages from '@/i18n/messages/zh.json';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/homepage/editor-store';

const MESSAGES: Record<string, any> = {
  default: enMessages,
  en: enMessages,
  zh: zhMessages,
  ja: jaMessages
};

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

  // Scroll Strategy:
  // Desktop: The "Page" grows, and we scroll the "Canvas" (gray area).
  // Mobile: The "Device" is fixed height, and we scroll the "Screen" (inner content).
  const isDesktop = previewDevice === 'desktop';

  // Find active component for Overlay
  const activeComponent = content.components.find(c => c.id === activeId);



  // Layout Migration Effect
  React.useEffect(() => {
     if (isDesktop && content.components.some(c => !c.props.x || !c.props.y)) {
         const newComponents = layoutComponents(content.components);
         // Bulk update if any changed (simple id check)
         // Since we don't have a bulk update in store, we update one by one or we should add a bulk update action.
         // For now, let's just update the ones missing props to avoid infinite loop if store ref causes rerender.
         newComponents.forEach((nc: any) => {
             const oc = content.components.find(c => c.id === nc.id);
             if (oc && (oc.props.x !== nc.props.x || oc.props.y !== nc.props.y)) {
                 useEditorStore.getState().updateComponent(nc.id, nc.props);
             }
         });
     }
  }, [content.components.length, isDesktop, content.components]); // Add content.components dependency check deep comparison ideally or just length? Warning: infinite loop risk if not careful. Added content.components for now but we guard with props check.

  const handleDragEnd = (event: any) => {
    const { active, over, delta } = event; // delta contains the x/y movement
    setActiveId(null);
    setDragWidth(null);
    setDragHeight(null);

    // If no movement, treat as click/nothing
    if (Math.abs(delta.x) < 5 && Math.abs(delta.y) < 5) return;

    if (!isDesktop) {
        // Mobile: Sortable List Logic (Reorder)
        if (active && over && active.id !== over.id) {
            const oldIndex = content.components.findIndex((c) => c.id === active.id);
            const newIndex = content.components.findIndex((c) => c.id === over.id);
            moveComponent(oldIndex, newIndex);
        }
        return;
    }

    // Desktop: 2D Grid Logic
    const component = content.components.find(c => c.id === active.id);
    if (!component) return;

    // Calculate Grid Delta
    // We need unit sizes.
    // Width: (containerWidth - 32 padding - 16*5 gaps) / 6
    // But easier: dragWidth / colSpan
    if (!containerRef.current) return;
    
    // Measure Grid Cell Size
    const containerWidth = containerRef.current.offsetWidth - 32; // - padding
    // Gap = 16px (1rem)
    const gap = 16;
    const colWidth = (containerWidth - (gap * 5)) / 6;
    const rowHeight = 80 + gap; // 5rem + gap

    // Start Position
    const currentX = (component.props as any).x || 1;
    const currentY = (component.props as any).y || 1;

    // Delta Steps
    const dCol = Math.round(delta.x / (colWidth + gap));
    const dRow = Math.round(delta.y / rowHeight);

    let newX = currentX + dCol;
    let newY = currentY + dRow;

    // Boundary Checks
    const colSpan = (component.props as any).colSpan || (component.props as any).w || 6;
    newX = Math.max(1, Math.min(7 - colSpan, newX)); // Ensure fits in 6 cols
    newY = Math.max(1, newY); // Min row 1

    if (newX !== currentX || newY !== currentY) {
        useEditorStore.getState().updateComponent(active.id, {
            ...component.props,
            x: newX,
            y: newY
        });
    }
  };

  const getBgImage = () => {
    const d = theme.decorations;
    if (d?.type === 'dots') return `radial-gradient(${d.color || '#000000'}20 1px, transparent 1px)`;
    if (d?.type === 'grid') return `linear-gradient(${d.color || '#000000'}10 1px, transparent 1px), linear-gradient(90deg, ${d.color || '#000000'}10 1px, transparent 1px)`;
    if (d?.type === 'text' && d.text) {
         const color = (d.color || '#000000').replace('#', '%23');
         const density = d.density || 'medium';
         // Increased base padding values
         const basePadding = density === 'low' ? 400 : density === 'high' ? 100 : 250;
         
         const fontFamily = d.fontFamily || 'system-ui';
         const fontSize = d.fontSize || 24;
         const fontWeight = d.fontWeight || 'normal';
         const rotation = d.rotation ?? -45;
         const textDecoration = d.textDecoration || 'none';
         const opacity = 0.1;

         // Adaptive Sizing using Padding
         const textLen = d.text?.length || 1;
         const estTextWidth = textLen * (fontSize as number); 
         const size = estTextWidth + basePadding;

         const svgWidth = size;
         const svgHeight = size;

         const svg = `
            <svg xmlns='http://www.w3.org/2000/svg' width='${svgWidth}' height='${svgHeight}'>
             <text 
               x='50%' 
               y='50%' 
               font-family='${fontFamily}' 
               font-size='${fontSize}' 
               font-weight='${fontWeight}' 
               text-decoration='${textDecoration}'
               fill='${color}' 
               fill-opacity='${opacity}' 
               text-anchor='middle' 
               dominant-baseline='middle' 
               transform='rotate(${rotation}, ${svgWidth/2}, ${svgHeight/2})'
             >
               ${d.text}
             </text>
            </svg>
         `.trim().replace(/\s+/g, ' ');

         const url = `url("data:image/svg+xml,${svg}")`;
         return d.scrollMode === 'alternate' ? `${url}, ${url}` : url;
    }
    return undefined;
  };

  return (
    <div 
      className={cn(
        "flex-1 min-h-0 w-full h-full bg-slate-100 dark:bg-slate-900 relative transition-all duration-300 touch-pan-y", 
        isDesktop ? "overflow-y-auto custom-scrollbar p-8 block" : "overflow-hidden flex items-center justify-center p-8"
      )}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bg-move-parallel {
          0% { background-position: 0 0; }
          100% { background-position: var(--bg-end-x) var(--bg-end-y); }
        }
        @keyframes bg-move-alternate {
          0% { background-position: 0 0, var(--bg-alt-start-x) var(--bg-alt-start-y); }
          100% { background-position: var(--bg-end-x) var(--bg-end-y), var(--bg-alt-end-x) var(--bg-alt-end-y); }
        }
        .animate-bg-move-parallel {
          animation: bg-move-parallel linear infinite;
        }
        .animate-bg-move-alternate {
          animation: bg-move-alternate linear infinite;
        }
      `}} />
      <div 
        className={cn(
          "bg-white dark:bg-black shadow-2xl relative transition-all duration-300 flex flex-col mx-auto",
          previewDevice === 'mobile' ? "rounded-[3rem] border-8 border-slate-800 overflow-hidden" : 
          previewDevice === 'tablet' ? "rounded-[2rem] border-8 border-slate-800 overflow-hidden" :
          "rounded-md" 
        )}
        style={{ 
          width: width, 
          height: isDesktop ? 'auto' : height, 
          minHeight: isDesktop ? '100%' : undefined
        }}
        onClick={() => selectComponent(null)}
      >
        <div 
          ref={containerRef}
          className={cn(
             "w-full relative",
             theme.decorations?.scrollMode === 'alternate' ? "animate-bg-move-alternate" : "animate-bg-move-parallel",
             !isDesktop ? "flex-1 overflow-y-auto custom-scrollbar touch-pan-y" : "min-h-full"
          )} 
          style={{
            '--color-primary': theme.colors.primary,
            '--color-bg': theme.colors.background,
            '--color-text': theme.colors.text,
            backgroundColor: theme.background.value,
            color: theme.colors.text,
            backgroundImage: getBgImage(),
            ...(() => {
               const d = theme.decorations;
               let size = '20px';
               if (d?.type === 'dots') {
                  const density = d.density || 'medium';
                  const sizeVal = density === 'low' ? 40 : density === 'high' ? 10 : 20;
                  size = `${sizeVal}px`;
               } else if (d?.type === 'grid') {
                  const density = d.density || 'medium';
                  const sizeVal = density === 'low' ? 60 : density === 'high' ? 15 : 30;
                  size = `${sizeVal}px`;
               } else if (d?.type === 'text') {
                  const density = d.density || 'medium';
                  const sizeVal = density === 'low' ? 400 : density === 'high' ? 100 : 200;
                  size = `${sizeVal}px`;
               }
               
               if (d?.type === 'none') {
                 return {};
               }


                // Calculate scroll end position based on angle and size
                
                // d is already defined in the closure
                const density = d.density || 'medium';
                const basePadding = density === 'low' ? 400 : density === 'high' ? 100 : 250;
                
                const fontSize = d.fontSize || 24;
                const textLen = d.text?.length || 1;
                const estTextWidth = textLen * (fontSize as number);
                const sizeVal = estTextWidth + basePadding;
                
                const isAlternate = d.scrollMode === 'alternate';
                const loopSize = sizeVal; // Standard loop size
                
                const angle = d.scrollAngle ?? 135;
                const rad = (angle * Math.PI) / 180;
                
                const dx = Math.round(Math.sin(rad)) * loopSize;
                const dy = Math.round(Math.cos(rad) * -1) * loopSize;
                
                // Adjust duration based on loop distance if alternate
                const durationVal = d.speed === 'slow' ? 40 : d.speed === 'fast' ? 5 : 20;
                const durationStr = `${durationVal}s`;

                // Calculate bgSize string
                const bgSizeStr = `${sizeVal}px ${sizeVal}px`;
                
                const variables: any = {
                    '--bg-size': size,
                    '--bg-end-x': `${dx}px`,
                    '--bg-end-y': `${dy}px`,
                };
                
                if (isAlternate) {
                  const half = sizeVal / 2;
                  variables['--bg-alt-start-x'] = `${half}px`;
                  variables['--bg-alt-start-y'] = `${half}px`;
                  variables['--bg-alt-end-x'] = `${half + dx}px`;
                  variables['--bg-alt-end-y'] = `${half + dy}px`;
                }

                return {
                  backgroundSize: bgSizeStr,
                  animationDuration: durationStr,
                  animationDirection: 'normal',
                  ...variables
                } as any as React.CSSProperties;
            })()
          } as any as React.CSSProperties}
        >
          <div className="min-h-full pb-20 pt-8 px-4">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} 
              autoScroll={{ layoutShiftCompensation: false }} 
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              {isDesktop ? (
                  // Grid Layout for Desktop
                  <div className="grid grid-cols-6 auto-rows-[5rem] gap-4 pb-10 relative"> 
                    {content.components.map((comp) => (
                      <SortableComponent 
                        key={comp.id}
                        comp={comp}
                        isSelected={selectedComponentId === comp.id}
                        theme={theme}
                        editingLocale={useEditorStore.getState().editingLocale}
                        messages={MESSAGES}
                        onSelect={selectComponent}
                        onRemove={removeComponent}
                        onUpdate={useEditorStore.getState().updateComponent}
                      />
                    ))}
                  </div>
              ) : (
                  // Sortable List Layout for Mobile
                  <SortableContext 
                    items={content.components.map(c => c.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-1 gap-4 pb-10"> 
                      {content.components.map((comp) => (
                        <SortableComponent 
                          key={comp.id}
                          comp={comp}
                          isSelected={selectedComponentId === comp.id}
                          theme={theme}
                          editingLocale={useEditorStore.getState().editingLocale}
                          messages={MESSAGES}
                          onSelect={selectComponent}
                          onRemove={removeComponent}
                          onUpdate={useEditorStore.getState().updateComponent}
                        />
                      ))}
                    </div>
                  </SortableContext>
              )}

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
                      return (
                        <div className="w-full h-full overflow-hidden">
                             <NextIntlClientProvider locale={useEditorStore.getState().editingLocale || 'en'} messages={MESSAGES[useEditorStore.getState().editingLocale] || MESSAGES['default']}>
                                <Preview {...effectiveProps} />
                             </NextIntlClientProvider>
                        </div>
                      );
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
