import React, { useEffect, useState } from 'react';

import { motionConstants, tokens } from '../foundations/tokens';

export interface EnvironmentBannerSlotProps {
  intent?: 'warning' | 'danger' | 'info';
  message: string;
  action?: React.ReactNode;
  visible?: boolean;
}

export const EnvironmentBannerSlot: React.FC<EnvironmentBannerSlotProps> = ({ 
  intent = 'warning', 
  message, 
  action,
  visible = true 
}) => {
  const [isMounted, setIsMounted] = useState(visible);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (visible && !isMounted) {
      setIsMounted(true);
      setIsExiting(false);
    } else if (!visible && isMounted) {
      setIsExiting(true);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const timeout = reducedMotion ? 0 : motionConstants.durationStandardMs; // bannerExit duration-200
      
      const timer = setTimeout(() => {
        setIsExiting(false);
        setIsMounted(false);
      }, timeout);
      
      return () => clearTimeout(timer);
    }
  }, [visible, isMounted]);

  if (!isMounted && !isExiting) return null;

  const getColors = () => {
    switch (intent) {
      case 'danger': return 'bg-red-500 text-white border-red-600';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-800 text-white border-slate-900';
    }
  };

  const animationClass = isExiting ? tokens.motion.bannerExit : tokens.motion.bannerEnter;

  return (
    <div 
      className={`w-full px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium border-b ${getColors()} ${animationClass} ${tokens.motion.reduced}`}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      {action && <div>{action}</div>}
    </div>
  );
};
