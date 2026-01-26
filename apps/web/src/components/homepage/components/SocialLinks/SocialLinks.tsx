// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Facebook, Github, Instagram, Link as LinkIcon, Mail, Twitter, Youtube } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { defaultProps, SocialLinksProps } from './schema';

import { cn } from '@/lib/utils';

// Simple mapping for now - ideally this comes from a shared icon registry or system dictionary
const PLATFORM_ICONS: Record<string, any> = {
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
  github: Github,
  instagram: Instagram,
  facebook: Facebook,
  email: Mail,
  default: LinkIcon
};

interface SocialLinksRendererProps extends Partial<SocialLinksProps> {
  className?: string;
}

export const SocialLinks: React.FC<SocialLinksRendererProps> = (props) => {
  const platforms = props.platforms ?? defaultProps.platforms;
  const style = props.style ?? defaultProps.style;
  const layout = props.layout ?? defaultProps.layout;
  const iconSize = props.iconSize ?? defaultProps.iconSize;
  const className = props.className;

  if (!platforms || platforms.length === 0) return null;

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  const containerLayoutClasses = {
    horizontal: 'flex flex-row flex-wrap justify-center gap-4',
    vertical: 'flex flex-col items-center gap-4 w-full max-w-xs mx-auto',
    grid: 'grid grid-cols-2 gap-4 w-full max-w-sm mx-auto',
  };

  const buttonStyleClasses = {
    icon: 'p-2 rounded-full hover:bg-[var(--hp-text)]/10 text-[var(--hp-primary)] transition-colors',
    button: 'flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[var(--hp-primary)] text-white hover:opacity-90 transition-opacity w-full',
    pill: 'flex items-center justify-center gap-2 px-6 py-2 rounded-full border border-[var(--hp-primary)] text-[var(--hp-primary)] hover:bg-[var(--hp-primary)] hover:text-white transition-colors w-full',
  };

  return (
    <div className={cn("p-4", containerLayoutClasses[layout], className)}>
      {platforms.map((platform, idx) => {
        // Normalize platform code to lowercase for icon lookup
        const code = platform.platformCode?.toLowerCase() || 'default';
        const Icon = PLATFORM_ICONS[code] || PLATFORM_ICONS.default;
        
        // Label logic
        const showLabel = style !== 'icon' || !Icon;
        const label = platform.label || platform.platformCode;

        return (
          <Link 
            key={idx} 
            href={platform.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={cn(buttonStyleClasses[style], style === 'icon' ? '' : 'shadow-sm')}
            title={label}
          >
            <Icon className={cn(sizeClasses[iconSize])} />
            {showLabel && <span className="font-medium">{label}</span>}
          </Link>
        );
      })}
    </div>
  );
};
