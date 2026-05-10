import { type UiState } from '@puckeditor/core';

export const HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY = 'puck-sidebar-widths';
export const HOMEPAGE_PUCK_SIDEBAR_MIN_WIDTH = 192;
export const HOMEPAGE_PUCK_SIDEBAR_MAX_WIDTH = 360;
export const HOMEPAGE_PUCK_DEFAULT_LEFT_SIDEBAR_WIDTH = 224;
export const HOMEPAGE_PUCK_DEFAULT_RIGHT_SIDEBAR_WIDTH = 280;

const HOMEPAGE_PUCK_SIDEBAR_MAX_VIEWPORT_RATIO = 0.32;

export interface HomepagePuckSidebarWidths {
  left: number;
  right: number;
}

export interface HomepagePuckSidebarUi {
  leftSideBarWidth: number;
  rightSideBarWidth: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getHomepagePuckSidebarWidthCap(viewportWidth?: number | null) {
  if (typeof viewportWidth !== 'number' || !Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return HOMEPAGE_PUCK_SIDEBAR_MAX_WIDTH;
  }

  const viewportAwareCap = Math.floor(viewportWidth * HOMEPAGE_PUCK_SIDEBAR_MAX_VIEWPORT_RATIO);

  return Math.max(
    HOMEPAGE_PUCK_SIDEBAR_MIN_WIDTH,
    Math.min(HOMEPAGE_PUCK_SIDEBAR_MAX_WIDTH, viewportAwareCap),
  );
}

function clampSidebarWidth(
  value: unknown,
  fallback: number,
  viewportWidth?: number | null,
) {
  const cap = getHomepagePuckSidebarWidthCap(viewportWidth);
  const width = asFiniteNumber(value);

  if (typeof width !== 'number') {
    return Math.min(fallback, cap);
  }

  return Math.max(
    HOMEPAGE_PUCK_SIDEBAR_MIN_WIDTH,
    Math.min(cap, Math.round(width)),
  );
}

export function sanitizeHomepagePuckSidebarWidths(
  value: unknown,
  viewportWidth?: number | null,
): HomepagePuckSidebarWidths {
  const record = asRecord(value);

  return {
    left: clampSidebarWidth(
      record.left,
      HOMEPAGE_PUCK_DEFAULT_LEFT_SIDEBAR_WIDTH,
      viewportWidth,
    ),
    right: clampSidebarWidth(
      record.right,
      HOMEPAGE_PUCK_DEFAULT_RIGHT_SIDEBAR_WIDTH,
      viewportWidth,
    ),
  };
}

export function sanitizeHomepagePuckSidebarStorageValue(
  value: string | null,
  viewportWidth?: number | null,
): HomepagePuckSidebarWidths {
  if (!value) {
    return sanitizeHomepagePuckSidebarWidths({}, viewportWidth);
  }

  try {
    return sanitizeHomepagePuckSidebarWidths(JSON.parse(value) as unknown, viewportWidth);
  } catch {
    return sanitizeHomepagePuckSidebarWidths({}, viewportWidth);
  }
}

export function sanitizeHomepagePuckSidebarUi(
  ui: Pick<UiState, 'leftSideBarWidth' | 'rightSideBarWidth'>,
  viewportWidth?: number | null,
): HomepagePuckSidebarUi {
  return {
    leftSideBarWidth: clampSidebarWidth(
      ui.leftSideBarWidth,
      HOMEPAGE_PUCK_DEFAULT_LEFT_SIDEBAR_WIDTH,
      viewportWidth,
    ),
    rightSideBarWidth: clampSidebarWidth(
      ui.rightSideBarWidth,
      HOMEPAGE_PUCK_DEFAULT_RIGHT_SIDEBAR_WIDTH,
      viewportWidth,
    ),
  };
}

export function serializeHomepagePuckSidebarWidths(widths: HomepagePuckSidebarWidths) {
  return JSON.stringify({
    left: widths.left,
    right: widths.right,
  });
}

export const DEFAULT_HOMEPAGE_PUCK_SIDEBAR_UI: HomepagePuckSidebarUi = {
  leftSideBarWidth: HOMEPAGE_PUCK_DEFAULT_LEFT_SIDEBAR_WIDTH,
  rightSideBarWidth: HOMEPAGE_PUCK_DEFAULT_RIGHT_SIDEBAR_WIDTH,
};
