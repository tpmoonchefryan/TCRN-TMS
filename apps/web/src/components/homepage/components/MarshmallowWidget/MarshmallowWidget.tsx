// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { MarshmallowWidgetProps } from './schema';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MarshmallowWidget: React.FC<MarshmallowWidgetProps & { className?: string }> = ({
  homepagePath,
  displayMode,
  showSubmitButton,
  title = 'Marshmallow',
  description = 'Anonymous messages are welcome!',
  buttonText = 'Send Message',
  className,
}) => {
  if (!homepagePath) return null;
  
  // Link to internal marshmallow page
  const marshmallowUrl = `/m/${homepagePath}`;

  if (displayMode === 'button') {
    return (
      <div className={cn("flex justify-center p-4", className)}>
        <Button 
          asChild 
          className="bg-[#E799B0] hover:bg-[#D6889F] text-white rounded-full px-6 gap-2 shadow-sm"
        >
          <Link href={marshmallowUrl}>
            <MessageCircle size={18} />
            {buttonText}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("p-4 max-w-sm mx-auto", className)}>
      <div className="bg-[#FFF5F8] dark:bg-[#3D2C32] rounded-2xl p-6 shadow-sm border border-[#FFE0EB] dark:border-[#5A3E48] text-center flex flex-col gap-4 items-center">
        <div className="bg-white dark:bg-[#2C2024] p-3 rounded-full shadow-inner">
           <MessageCircle size={32} className="text-[#E799B0]" />
        </div>
        
        <div>
          <h3 className="font-bold text-[#E799B0] text-lg">{title}</h3>
          <p className="text-sm text-[var(--hp-text-secondary)] mt-1">
            {description}
          </p>
        </div>

        {showSubmitButton && (
          <Button 
            asChild 
            className="w-full bg-[#E799B0] hover:bg-[#D6889F] text-white rounded-xl shadow-sm"
          >
            <Link href={marshmallowUrl}>
              {buttonText}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
