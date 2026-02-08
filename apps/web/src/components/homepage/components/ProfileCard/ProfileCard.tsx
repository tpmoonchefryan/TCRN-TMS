/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import { defaultProps, ProfileCardProps } from './schema';

interface ProfileCardRendererProps extends Partial<ProfileCardProps> {
  className?: string;
  theme?: any; // Pass theme if needed for specific overrides not handled by CSS vars
}

export const ProfileCard: React.FC<ProfileCardRendererProps> = (props) => {
  const avatarUrl = props.avatarUrl ?? defaultProps.avatarUrl;
  const displayName = props.displayName ?? defaultProps.displayName;
  const bio = props.bio ?? defaultProps.bio;
  const avatarShape = props.avatarShape ?? defaultProps.avatarShape;
  const nameFontSize = props.nameFontSize ?? defaultProps.nameFontSize;
  const bioMaxLines = props.bioMaxLines ?? defaultProps.bioMaxLines;
  const className = props.className;
  const avatarClass = {
    circle: 'rounded-full',
    rounded: 'rounded-xl',
    square: 'rounded-none',
  }[avatarShape];

  const nameSizeClass = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
  }[nameFontSize];

  return (
    <div className={cn("flex flex-col items-center text-center p-6 gap-4", className)}>
      <Avatar className={cn("w-24 h-24 border-4 border-[var(--hp-card-bg)] shadow-md", avatarClass)}>
        <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
        <AvatarFallback className="text-2xl uppercase bg-[var(--hp-primary)] text-white">
          {displayName.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col gap-2">
        <h1 className={cn("font-bold text-[var(--hp-text)]", nameSizeClass)}>
          {displayName}
        </h1>
        
        {bio && (
          <p 
            className="text-[var(--hp-text-secondary)] max-w-md whitespace-pre-wrap"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: bioMaxLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {bio}
          </p>
        )}
      </div>
    </div>
  );
};
