import { ComponentInstance } from './types';

// Grid Constants
export const GRID_COLS = 6;

/**
 * Interface for a component with layout coordinates
 */
export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Calculate the auto-layout for a list of components.
 * This effectively runs a "Dense" packing algorithm to assign x/y coordinates
 * to components that don't have them yet.
 */
export function layoutComponents(components: ComponentInstance[]): ComponentInstance[] {
  const layout: LayoutItem[] = [];
  const grid: string[][] = []; // grid[row][col] = componentId

  // Helper to check if a spot is occupied
  const isOccupied = (row: number, col: number, w: number, h: number) => {
    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            if (grid[row + i]?.[col + j]) return true;
        }
    }
    return false;
  };

  // Helper to mark a spot as occupied
  const markOccupied = (row: number, col: number, w: number, h: number, id: string) => {
    for (let i = 0; i < h; i++) {
        if (!grid[row + i]) grid[row + i] = [];
        for (let j = 0; j < w; j++) {
            grid[row + i][col + j] = id;
        }
    }
  };

  return components.map(comp => {
      // 1. Resolve dimensions
      const props = comp.props || {};
      const colSpan = props.colSpan || props.w || 6;
      let rowSpan = props.rowSpan || props.h;
      
      if (!rowSpan) {
          // Fallback legacy logic
          const heightMode = props.heightMode || 'auto';
          const isProfile = comp.type === 'ProfileCard';
          const autoSpan = isProfile ? 6 : 4;
          rowSpan = {
            'auto': autoSpan,
            'small': 2,
            'medium': 4,
            'large': 6
          }[heightMode as string] || 4;
      }
      
      const w = Math.min(colSpan, GRID_COLS);
      const h = rowSpan;

      // 2. If x and y already exist, respect them (and mark grid)
      // Check if valid first
      if (typeof props.x === 'number' && typeof props.y === 'number') {
          // TODO: Check for overlap? For now, if explicit x/y exists, we assume user put it there.
          // But we should mark the grid so subsequent auto-items flow around it.
          // Adjust 1-based to 0-based for calculation
          const row = props.y - 1;
          const col = props.x - 1;
          
          if (row >= 0 && col >= 0) {
              markOccupied(row, col, w, h, comp.id);
              return comp; // No change needed
          }
      }

      // 3. Find first available spot (Dense Flow)
      let row = 0;
      let col = 0;
      let placed = false;

      // Safety break
      while (!placed && row < 1000) {
          // Check if fits in current pos
          // Boundary check
          if (col + w <= GRID_COLS) {
               if (!isOccupied(row, col, w, h)) {
                   markOccupied(row, col, w, h, comp.id);
                   placed = true;
                   
                   // Assign props
                   return {
                       ...comp,
                       props: {
                           ...comp.props,
                           x: col + 1, // 1-based
                           y: row + 1, // 1-based
                           colSpan: w,
                           rowSpan: h
                       }
                   };
               }
          }

          // Move to next cell
          col++;
          if (col >= GRID_COLS) {
              col = 0;
              row++;
          }
      }

      // Should not happen, but return comp as is
      return comp;
  });
}
