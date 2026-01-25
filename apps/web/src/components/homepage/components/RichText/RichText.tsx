// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import React from 'react';

import { defaultProps, RichTextProps } from './schema';

import { cn } from '@/lib/utils';

interface RichTextRendererProps extends Partial<RichTextProps> {
  className?: string;
  // Legacy props from 'about' component type
  content?: string;
  text?: string;
}

export const RichText: React.FC<RichTextRendererProps> = (props) => {
  const contentHtml = props.contentHtml ?? props.content ?? props.text ?? defaultProps.contentHtml;
  const textAlign = props.textAlign ?? defaultProps.textAlign;
  const className = props.className;

  return (
    <div 
      className={cn("prose prose-sm md:prose-base dark:prose-invert max-w-none p-4", className)}
      style={{ textAlign: textAlign }}
      dangerouslySetInnerHTML={{ __html: contentHtml }} 
    />
  );
};
