// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import React from 'react';

import { ImageGalleryProps } from './schema';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Simple Grid/Masonry implementation
// For real Masonry, consider react-masonry-css but for now CSS columns works okay for simple use cases

export const ImageGallery: React.FC<ImageGalleryProps & { className?: string }> = ({
  images,
  layoutMode,
  columns,
  gap,
  showCaptions,
  className,
}) => {
  if (!images || images.length === 0) return null;

  const gapClasses = {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6',
  };

  const gridColsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  if (layoutMode === 'carousel') {
    return (
      <ScrollArea className={cn("w-full whitespace-nowrap rounded-lg", className)}>
        <div className={cn("flex w-max space-x-4 p-4", gapClasses[gap]?.replace('gap-', 'space-x-'))}>
          {images.map((img, i) => (
            <figure key={i} className="shrink-0">
              <div className="overflow-hidden rounded-md">
                {img.url ? (
                  <img
                    src={img.url}
                    referrerPolicy="no-referrer"
                    alt={img.alt || `Gallery image ${i + 1}`}
                    className="aspect-[3/4] h-[300px] w-auto object-cover transition-all hover:scale-105"
                  />
                ) : (
                  <div className="aspect-[3/4] h-[300px] w-[225px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-muted-foreground text-xs">
                    No Image
                  </div>
                )}
              </div>
              {showCaptions && img.caption && (
                <figcaption className="mt-2 text-xs text-muted-foreground text-center w-[200px] whitespace-normal">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  // Grid / Masonry (Masonry simulated with columns for now)
  const isMasonry = layoutMode === 'masonry';
  
  if (isMasonry) {
     return (
      <div 
        className={cn("p-4", className)}
        style={{ columnCount: columns, columnGap: '1rem' }}
      >
        {images.map((img, i) => (
          <figure key={i} className="mb-4 break-inside-avoid">
             {img.url && (
              <img
                src={img.url}
                referrerPolicy="no-referrer"
                alt={img.alt || `Gallery image ${i + 1}`}
                className="w-full rounded-lg object-cover"
                style={{ display: 'block' }}
              />
             )}
            {showCaptions && img.caption && (
              <figcaption className="mt-2 text-xs text-muted-foreground text-center">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
     );
  }

  return (
    <div className={cn("grid p-4", gridColsClasses[columns as keyof typeof gridColsClasses], gapClasses[gap], className)}>
      {images.map((img, i) => (
        <figure key={i} className="space-y-2">
          <div className="overflow-hidden rounded-md aspect-square">
             {img.url ? (
               <img
                src={img.url}
                referrerPolicy="no-referrer"
                alt={img.alt || `Gallery image ${i + 1}`}
                className="h-full w-full object-cover transition-all hover:scale-105"
              />
             ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-muted-foreground text-xs">
                No Image
              </div>
             )}
          </div>
          {showCaptions && img.caption && (
            <figcaption className="text-xs text-muted-foreground">
              {img.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
};
