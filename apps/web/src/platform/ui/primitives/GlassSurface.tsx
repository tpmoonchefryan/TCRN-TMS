import React from 'react';

import { tokens } from '../foundations/tokens';

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass';
  hoverEffect?: boolean;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({ 
  variant = 'glass', 
  hoverEffect = false, 
  className = '', 
  children, 
  ...props 
}) => {
  const baseClasses = 'rounded-2xl overflow-hidden';
  const variantClasses = variant === 'glass' ? `${tokens.colors.surface} ${tokens.effects.glass}` : 'bg-white shadow-sm';
  const hoverClasses = hoverEffect ? tokens.effects.glassHover : '';

  return (
    <div 
      className={`${baseClasses} ${variantClasses} ${hoverClasses} border ${tokens.colors.border} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
