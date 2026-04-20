export const motionConstants = {
  durationPopoverMs: 100,
  durationQuickMs: 150,
  durationStandardMs: 200,
  durationHeroMs: 300,
};

export const tokens = {
  colors: {
    bgBase: 'bg-slate-100',
    surface: 'bg-white/95',
    border: 'border-slate-200',
    text: 'text-slate-800',
    textMuted: 'text-slate-500',
    danger: 'text-red-600',
    dangerBg: 'bg-red-50',
  },
  effects: {
    glass: 'backdrop-blur-xl shadow-sm',
    glassHover: 'hover:shadow-md hover:bg-white transition-shadow duration-300',
  },
  motion: {
    // Overlays (ActionDrawer, TranslationDrawer)
    drawerEnter: 'animate-in slide-in-from-right fade-in duration-300 ease-out',
    drawerExit: 'animate-out slide-out-to-right fade-out duration-300 ease-in',
    
    // Dialogs (ConfirmActionDialog)
    dialogEnter: 'animate-in zoom-in-95 fade-in duration-200 ease-out',
    dialogExit: 'animate-out zoom-out-95 fade-out duration-[150ms] ease-in',
    
    // Popovers (AccountDropdownMenu, LocaleSwitcher)
    popoverEnter: 'animate-in slide-in-from-top-2 fade-in duration-[150ms] ease-out',
    popoverExit: 'animate-out slide-out-to-top-2 fade-out duration-[100ms] ease-in',
    
    // Banners (EnvironmentBannerSlot)
    bannerEnter: 'animate-in slide-in-from-top fade-in duration-300',
    bannerExit: 'animate-out slide-out-to-top fade-out duration-200',
    
    // Base timing classes for non-plugin transitions
    transitionQuick: 'transition-opacity duration-[150ms]',
    transitionStandard: 'transition-transform transition-opacity duration-200',
    
    // Reduced motion bypass
    reduced: 'motion-reduce:animate-none motion-reduce:transition-none',
  },
};
