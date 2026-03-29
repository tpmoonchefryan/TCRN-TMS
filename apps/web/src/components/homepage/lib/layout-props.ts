import type { ComponentInstance } from '@tcrn/shared';

export type LayoutHeightMode = 'auto' | 'small' | 'medium' | 'large';

export interface ComponentLayoutProps extends Record<string, unknown> {
  x?: number;
  y?: number;
  colSpan?: number;
  rowSpan?: number;
  w?: number;
  h?: number;
  heightMode?: LayoutHeightMode;
}

type LayoutPropsSource = ComponentInstance['props'] | Record<string, unknown> | undefined;

export function getLayoutProps(props: LayoutPropsSource): ComponentLayoutProps {
  return (props ?? {}) as ComponentLayoutProps;
}

export function hasExplicitGridPosition(
  props: LayoutPropsSource
): props is ComponentLayoutProps & Required<Pick<ComponentLayoutProps, 'x' | 'y'>> {
  const layoutProps = getLayoutProps(props);
  return typeof layoutProps.x === 'number' && typeof layoutProps.y === 'number';
}

export function resolveComponentColSpan(
  props: LayoutPropsSource,
  defaultProps?: LayoutPropsSource,
  fallback = 6
): number {
  const layoutProps = getLayoutProps(props);
  const defaultLayoutProps = getLayoutProps(defaultProps);
  return layoutProps.colSpan ?? layoutProps.w ?? defaultLayoutProps.colSpan ?? defaultLayoutProps.w ?? fallback;
}

export function resolveComponentRowSpan(
  componentType: ComponentInstance['type'],
  props: LayoutPropsSource,
  defaultProps?: LayoutPropsSource
): number {
  const layoutProps = getLayoutProps(props);
  const defaultLayoutProps = getLayoutProps(defaultProps);

  const explicitRowSpan = layoutProps.rowSpan ?? layoutProps.h;
  if (explicitRowSpan) {
    return explicitRowSpan;
  }

  const defaultRowSpan = defaultLayoutProps.rowSpan ?? defaultLayoutProps.h;
  if (defaultRowSpan) {
    return defaultRowSpan;
  }

  const heightMode = layoutProps.heightMode ?? defaultLayoutProps.heightMode ?? 'auto';
  const autoSpan = componentType === 'ProfileCard' ? 6 : 4;

  switch (heightMode) {
    case 'small':
      return 2;
    case 'medium':
      return 4;
    case 'large':
      return 6;
    case 'auto':
    default:
      return autoSpan;
  }
}

export function resolveComponentGridPosition(props: LayoutPropsSource): {
  gridColumnStart: number | 'auto';
  gridRowStart: number | 'auto';
} {
  const layoutProps = getLayoutProps(props);
  return {
    gridColumnStart: layoutProps.x ?? 'auto',
    gridRowStart: layoutProps.y ?? 'auto',
  };
}
