/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { DEFAULT_THEME, generateCssVariables,HomepageContent, ThemeConfig } from '@tcrn/shared';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import enMessages from '@/i18n/messages/en.json';
import jaMessages from '@/i18n/messages/ja.json';
import zhMessages from '@/i18n/messages/zh.json';
import { cn } from '@/lib/utils';

import { COMPONENT_REGISTRY } from '../lib/component-registry';
import { migrateComponentTypes } from '../lib/types';


interface HomepageRendererProps {
  content: HomepageContent;
  theme: ThemeConfig;
  className?: string;
  homepagePath?: string;
}

const MESSAGES: Record<string, any> = {
  en: enMessages,
  zh: zhMessages,
  ja: jaMessages
};

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

export function HomepageRenderer({ content, theme, className, homepagePath }: HomepageRendererProps) {
  const t = useTranslations('homepageEditor');
  const [currentLocale, setCurrentLocale] = useState('en');

  // Migrate legacy component types to current types
  const migratedContent = migrateComponentTypes(content);
  // Resolve visual style
  const visualStyle = theme?.visualStyle || 'simple';
  
  // Inject CSS variables for theme
  const style = {
    ...generateCssVariables(theme || DEFAULT_THEME),
    
    // Background handling
    ...(theme?.background?.type === 'image' ? {
      '--bg-image': `url(${theme.background.value})`,
      '--bg-blur': `${theme.background.blur || 0}px`,
      backgroundImage: 'var(--bg-image)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    } : {
      background: 'var(--bg-value)',
    }),
    
    // Visual Style specific vars
    '--glass-opacity': visualStyle === 'glass' ? '0.7' : '1',
    '--glass-border': visualStyle === 'glass' ? '1px solid rgba(255,255,255,0.2)' : 'none',
  } as React.CSSProperties & Record<string, any>;

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

      <NextIntlClientProvider locale={currentLocale} messages={MESSAGES[currentLocale]}>
      {/* Background Decorations */}
      {theme?.decorations?.type === 'dots' && (
        <motion.div 
          className="absolute inset-0 pointer-events-none opacity-[0.2]"
          style={{ 
            backgroundImage: `radial-gradient(${theme.decorations.color || '#000000'}20 2px, transparent 2px)`,
            backgroundSize: (() => {
               const density = theme.decorations.density || 'medium';
               const size = density === 'low' ? '40px' : density === 'high' ? '10px' : '20px';
               return `${size} ${size}`;
            })(),
            zIndex: 0
          }}
          animate={{
            backgroundPosition: (() => {
               const density = theme.decorations.density || 'medium';
               const sizeVal = density === 'low' ? 40 : density === 'high' ? 10 : 20;
               const angle = theme.decorations.scrollAngle ?? 135;
               const rad = (angle * Math.PI) / 180;
               const dx = Math.round(Math.sin(rad)) * sizeVal;
               const dy = Math.round(Math.cos(rad) * -1) * sizeVal; // 0deg is Up (negative Y)
               return ["0px 0px", `${dx}px ${dy}px`];
            })()
          }}
          transition={{
            repeat: Infinity,
            repeatType: theme.decorations.scrollMode === 'alternate' ? 'reverse' : 'loop',
            duration: (() => {
               const speed = theme.decorations.speed || 'normal';
               return speed === 'slow' ? 10 : speed === 'fast' ? 1 : 3;
            })(),
            ease: "linear"
          }}
        />
      )}
      
      {theme?.decorations?.type === 'grid' && (
        <motion.div 
          className="absolute inset-0 pointer-events-none opacity-[0.15]"
          style={{ 
            backgroundImage: `linear-gradient(${theme.decorations.color || '#000000'}15 1px, transparent 1px), linear-gradient(90deg, ${theme.decorations.color || '#000000'}15 1px, transparent 1px)`,
            backgroundSize: (() => {
               const density = theme.decorations.density || 'medium';
               const size = density === 'low' ? '60px' : density === 'high' ? '15px' : '30px';
               return `${size} ${size}`;
            })(),
            zIndex: 0
          }}
          animate={{
            backgroundPosition: (() => {
               const density = theme.decorations.density || 'medium';
               const sizeVal = density === 'low' ? 60 : density === 'high' ? 15 : 30;
               const angle = theme.decorations.scrollAngle ?? 135;
               const rad = (angle * Math.PI) / 180;
               const dx = Math.round(Math.sin(rad)) * sizeVal;
               const dy = Math.round(Math.cos(rad) * -1) * sizeVal;
               return ["0px 0px", `${dx}px ${dy}px`];
            })()
          }}
          transition={{
            repeat: Infinity,
            repeatType: theme.decorations.scrollMode === 'alternate' ? 'reverse' : 'loop',
            duration: (() => {
               const speed = theme.decorations.speed || 'normal';
               return speed === 'slow' ? 10 : speed === 'fast' ? 1 : 3;
            })(),
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
              
              const density = d.density || 'medium';
              // Increased base padding values to ensure distinct spacing differences
              const basePadding = density === 'low' ? 400 : density === 'high' ? 100 : 250;
              
              // Adaptive Sizing: Tile size = Text Width + Padding
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
            })(),
            backgroundSize: (() => {
               const d = theme.decorations;
               const density = d.density || 'medium';
               const basePadding = density === 'low' ? 400 : density === 'high' ? 100 : 250;
               const fontSize = d.fontSize || 24;
               const textLen = d.text?.length || 1;
               const estTextWidth = textLen * (fontSize as number);
               const size = estTextWidth + basePadding;
               
               return `${size}px ${size}px`;
            })(),
            zIndex: 0
          }}
          animate={{
            backgroundPosition: (() => {
               const d = theme.decorations;
               const density = d.density || 'medium';
               const basePadding = density === 'low' ? 400 : density === 'high' ? 100 : 250;
               const fontSize = d.fontSize || 24;
               const textLen = d.text?.length || 1;
               const estTextWidth = textLen * (fontSize as number);
               const sizeVal = estTextWidth + basePadding;

               const angle = d.scrollAngle ?? 135;
               const isAlternate = d.scrollMode === 'alternate';
               
               const loopSize = sizeVal;
               const rad = (angle * Math.PI) / 180;
               
               // Standard delta
               const dx = Math.round(Math.sin(rad)) * loopSize;
               const dy = Math.round(Math.cos(rad) * -1) * loopSize;
               
               if (isAlternate) {
                 const half = sizeVal / 2;
                 // Layer 1: 0 0 -> dx dy
                 // Layer 2: half half -> half+dx half+dy
                 return [
                   `0px 0px, ${half}px ${half}px`, 
                   `${dx}px ${dy}px, ${half + dx}px ${half + dy}px`
                 ];
               }
               
               return ["0px 0px", `${dx}px ${dy}px`];
            })()
          }}
          transition={{
            repeat: Infinity,
            repeatType: 'loop', 
            duration: (() => {
               const speed = theme.decorations.speed || 'normal';
               return speed === 'slow' ? 40 : speed === 'fast' ? 5 : 20;
            })(),
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
        variants={theme?.animation?.enableEntrance ? containerVariants : undefined}
        initial="hidden"
        animate="show"
      >
        {migratedContent?.components && migratedContent.components.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-6 md:auto-rows-[5rem] md:grid-flow-row-dense gap-4">

            {migratedContent.components.map(comp => {
              if (!comp.visible) return null;
              // Resolve Dimensions and Defaults
              const definition = COMPONENT_REGISTRY[comp.type];
              if (!definition) return null;
              
              const defaultProps = definition.defaultProps || {};
              const Component = definition.preview;
              
              let effectiveProps = { ...defaultProps, ...comp.props, homepagePath }; // Apply defaults first
              if (currentLocale && currentLocale !== 'en' && comp.i18n?.[currentLocale]) {
                   effectiveProps = { ...effectiveProps, ...comp.i18n[currentLocale] };
              }
              
              const props = effectiveProps as any;

              // Resolve Col Span (1-6)
              // Priority: props.colSpan > props.w > defaultProps.colSpan > 6
              const colSpan = props.colSpan || props.w || defaultProps.colSpan || 6;
 
              // Resolve Row Span
              // We prioritize explicit rowSpan if available
              let rowSpan = props.rowSpan || props.h;
              if (!rowSpan) {
                 const heightMode = props.heightMode || defaultProps.heightMode || 'auto';
                 const isProfile = comp.type === 'ProfileCard';
                 const autoSpan = isProfile ? 6 : 4;
                 
                  // Check if registry has a specific default rowSpan
                 if (defaultProps.rowSpan) {
                   rowSpan = defaultProps.rowSpan;
                 } else {
                   rowSpan = {
                       'auto': autoSpan,
                       'small': 2,
                       'medium': 4,
                       'large': 6
                   }[heightMode as string] || 4;
                 }
              }

              // Position
              const gridColumnStart = props.x || 'auto';
              const gridRowStart = props.y || 'auto';

              // Visual Style Overrides
              const cardBgHex = theme?.card?.background || '#FFFFFF';
              const cardRadius = theme?.card?.borderRadius === 'none' ? '0rem' : 
                                 theme?.card?.borderRadius === 'large' ? '1rem' : 
                                 theme?.card?.borderRadius === 'full' ? '9999px' : '0.5rem';
              
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
                  className={cn(
                    "relative group/render", 
                    "col-span-1", // Mobile default
                    // Desktop Grid Positioning (Matching SortableComponent)
                    "md:[grid-column:var(--desktop-col-start)_/_span_var(--desktop-col-span)]", 
                    "md:[grid-row:var(--desktop-row-start)_/_span_var(--desktop-row-span)]",
                    visualClass
                  )}
                  variants={theme?.animation?.enableEntrance ? itemVariants : undefined}
                  whileHover={theme?.animation?.enableHover ? { scale: 1.02 } : undefined}
                  style={{ 
                      ...comp.styleOverrides as any, 
                      ...visualVars,
                      '--desktop-col-start': gridColumnStart,
                      '--desktop-row-start': gridRowStart,
                      '--desktop-col-span': `${colSpan}`, // Raw number
                      '--desktop-row-span': `${rowSpan}`, // Raw number
                  } as React.CSSProperties}
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
      </NextIntlClientProvider>
    </div>
  );
}
