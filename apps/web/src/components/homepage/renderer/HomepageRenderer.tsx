// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { HomepageContent, ThemeConfig } from '@tcrn/shared';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { COMPONENT_REGISTRY } from '../lib/component-registry';
import { migrateComponentTypes } from '../lib/types';

interface HomepageRendererProps {
  content: HomepageContent;
  theme: ThemeConfig;
  className?: string;
}

// Helper to convert hex to HSL for Tailwind variables
function hexToHsl(hex: string): string {
  if (!hex) return '0 0% 100%';
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0,2), 16) / 255;
  const g = parseInt(hex.substring(2,4), 16) / 255;
  const b = parseInt(hex.substring(4,6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

export function HomepageRenderer({ content, theme, className }: HomepageRendererProps) {
  const t = useTranslations('homepageEditor');
  const [currentLocale, setCurrentLocale] = useState('en');

  // Migrate legacy component types to current types
  const migratedContent = migrateComponentTypes(content);
  // Handle both snake_case (from @tcrn/shared) and camelCase (from backend DTO) naming
  const typography = theme?.typography || {};
  const fontFamily = (typography as any).font_family || (typography as any).fontFamily || 'system';
  
  // Inject CSS variables for theme
  const style = {
    '--color-primary': theme?.colors?.primary || '#5599FF',
    '--color-accent': theme?.colors?.accent || '#FF88CC',
    '--color-bg': theme?.colors?.background || '#F5F7FA',
    '--color-text': theme?.colors?.text || '#1A1A1A',
    backgroundColor: theme?.background?.type === 'solid' ? theme.background.value : undefined,
    backgroundImage: theme?.background?.type !== 'solid' ? theme?.background?.value : undefined,
    color: theme?.colors?.text || '#1A1A1A',
    fontFamily: fontFamily === 'system' ? 'system-ui, sans-serif' : fontFamily,
  } as React.CSSProperties;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: theme?.animation?.intensity === 'high' ? 0.1 : 
                         theme?.animation?.intensity === 'medium' ? 0.2 : 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const visualStyle = theme?.visual_style || 'simple';

  return (
    <div 
      className={cn("min-h-screen w-full overflow-y-auto overflow-x-hidden relative", className)} 
      style={style}
    >
      {/* Floating Language Selector */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCurrentLocale('en')}>
              English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrentLocale('zh')}>
              中文
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrentLocale('ja')}>
              日本語
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Background Decorations */}
      {theme?.decorations?.type === 'dots' && (
        <motion.div 
          className="absolute inset-0 pointer-events-none opacity-[0.2]"
          style={{ 
            backgroundImage: `radial-gradient(${theme.decorations.color || '#000000'}20 2px, transparent 2px)`,
            backgroundSize: '20px 20px',
            zIndex: 0
          }}
          animate={{
            backgroundPosition: ["0px 0px", "20px 20px"]
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "linear"
          }}
        />
      )}
      
      {theme?.decorations?.type === 'grid' && (
        <motion.div 
          className="absolute inset-0 pointer-events-none opacity-[0.15]"
          style={{ 
            backgroundImage: `linear-gradient(${theme.decorations.color || '#000000'}15 1px, transparent 1px), linear-gradient(90deg, ${theme.decorations.color || '#000000'}15 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            zIndex: 0
          }}
          animate={{
            backgroundPosition: ["0px 0px", "30px 30px"]
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "linear"
          }}
        />
      )}

      {theme?.decorations?.type === 'text' && theme.decorations.text && (
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            backgroundImage: (() => {
              const d = theme.decorations;
              const color = (d.color || '#000000').replace('#', '%23');
              const opacity = 0.1;
              const fontSize = d.fontSize || 24;
              const fontFamily = d.fontFamily || 'system-ui';
              const fontWeight = d.fontWeight || 'normal';
              const rotation = d.rotation ?? -45;
              const textDecoration = d.textDecoration || 'none';
              const svgWidth = 200;
              const svgHeight = 200;
              
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
              return `url("data:image/svg+xml,${svg}")`;
            })(),
            backgroundSize: '200px 200px',
            zIndex: 0
          }}
          animate={{
            backgroundPosition: ["0px 0px", "200px 200px"] // Slower diagonal pan
          }}
          transition={{
            repeat: Infinity,
            duration: 20, // Slow movement for text
            ease: "linear"
          }}
        />
      )}

      <motion.div 
        className={cn(
          "w-full mx-auto min-h-screen pb-20 pt-8 px-4 relative z-10 box-border",
          // Responsive width: mobile default, wider on desktop
          "max-w-md md:max-w-2xl lg:max-w-4xl"
        )}
        variants={theme?.animation?.enable_entrance ? containerVariants : undefined}
        initial="hidden"
        animate="show"
      >
        {migratedContent?.components && migratedContent.components.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

            {migratedContent.components.map(comp => {
              if (!comp.visible) return null;
              const definition = COMPONENT_REGISTRY[comp.type];
              if (!definition) return null;
              
              const Component = definition.preview;
              const effectiveProps = { ...comp.props, ...(comp.i18n?.[currentLocale] || {}) };
              const colSpan = (comp.props as any).colSpan || 6;
              const colSpanClass = {
                6: 'col-span-1 md:col-span-6',
                3: 'col-span-1 md:col-span-3',
                2: 'col-span-1 md:col-span-2'
              }[colSpan as 2|3|6] || 'col-span-1 md:col-span-6';

              // Visual Style Overrides
              const cardBgHex = theme?.card?.background || '#FFFFFF';
              const cardRadius = theme?.card?.border_radius === 'none' ? '0rem' : 
                                 theme?.card?.border_radius === 'large' ? '1rem' : 
                                 '0.5rem';
              
              const visualVars = {
                 '--radius': cardRadius,
                 '--card': hexToHsl(cardBgHex),
                 '--hp-card-bg': cardBgHex, // For components using direct hex
              } as React.CSSProperties & Record<string, string>;

              let visualClass = "";

              if (visualStyle === 'glass') {
                 visualVars['--card'] = '255 0% 100% / 0.5'; // White glass
                 if (theme?.colors?.background && theme.colors.background.includes('#00')) {
                    // Dark theme glass heuristic
                     visualVars['--card'] = '0 0% 0% / 0.5';
                 }
                 visualClass = "[&_.bg-card]:backdrop-blur-md [&_.bg-card]:bg-white/40 dark:[&_.bg-card]:bg-black/40 [&_.bg-card]:border-white/20";
              } else if (visualStyle === 'neo') {
                 // Neumorphism often requires same color as bg, but let's just make it soft
                 // We rely on component shadow classes, but might need to force shadow
                 visualVars['--card'] = hexToHsl(theme?.colors?.background || '#F5F7FA'); 
                 visualVars['--hp-card-bg'] = theme?.colors?.background || '#F5F7FA';
                 visualClass = "[&_.bg-card]:shadow-[5px_5px_10px_rgba(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.8)] dark:[&_.bg-card]:shadow-[5px_5px_10px_rgba(0,0,0,0.5),-5px_-5px_10px_rgba(255,255,255,0.05)] [&_.bg-card]:border-none";
              } else if (visualStyle === 'flat') {
                 visualVars['--radius'] = '0px';
                 visualClass = "[&_.bg-card]:shadow-none [&_.bg-card]:border-border";
              } else if (visualStyle === 'retro') {
                 visualVars['--radius'] = '0px';
                 visualClass = "[&_.bg-card]:border-4 [&_.bg-card]:border-black [&_.bg-card]:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
              }

              return (
                <motion.div 
                  key={comp.id} 
                  className={cn("relative group/render", colSpanClass, visualClass)}
                  variants={theme?.animation?.enable_entrance ? itemVariants : undefined}
                  whileHover={theme?.animation?.enable_hover ? { scale: 1.02 } : undefined}
                  style={{ ...comp.styleOverrides as any, ...visualVars }}
                >
                  <Component {...effectiveProps} />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm opacity-50">
            {migratedContent ? t('emptyPage') : t('noContentAvailable')}
          </div>
        )}
      </motion.div>
    </div>
  );
}
