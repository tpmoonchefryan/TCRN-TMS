// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';


import { Calendar as CalendarIcon, Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


import { cn } from '@/lib/utils';


export interface ScheduleEvent {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  time: string;
  title: string;
  type: 'game' | 'chat' | 'singing' | 'collab' | 'other';
}

export interface ScheduleProps {
  title?: string;
  events?: ScheduleEvent[];
  weekOf?: string;
  homepagePath?: string;
}

export const defaultProps: ScheduleProps = {
  title: 'Weekly Schedule',
  weekOf: '2026-01-26',
  events: [
    { day: 'mon', time: '20:00', title: 'Chatting Stream', type: 'chat' },
    { day: 'wed', time: '21:00', title: 'Minecraft', type: 'game' },
    { day: 'fri', time: '20:00', title: 'Karaoke', type: 'singing' },
    { day: 'sat', time: '14:00', title: 'Collab w/ Friends', type: 'collab' },
  ],
};

const TYPE_COLORS = {
  game: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  chat: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  singing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  collab: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function Schedule({ title = 'Weekly Schedule', events = [], weekOf, homepagePath }: ScheduleProps) {
  const t = useTranslations('homepageComponentEditor');
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  
  const [copied, setCopied] = useState(false);
  const displayTitle = (title && title !== 'Weekly Schedule') ? title : t('defaultScheduleTitle');

  const handleCopyLink = () => {
    if (!homepagePath) return;
    const url = `${window.location.origin}/api/v1/public/homepage/${homepagePath}/calendar.ics`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full bg-card rounded-xl border shadow-sm p-4">
      <div className="mb-4 relative flex items-start justify-center min-h-[3rem]">
        <div className="text-center w-full px-8">
          <h3 className="text-xl font-bold">{displayTitle}</h3>
          {weekOf && <p className="text-xs text-muted-foreground">{t('weekOf')} {weekOf}</p>}
        </div>
        
        {homepagePath && (
          <div className="absolute right-0 top-0">
             <Popover>
               <PopoverTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                   <CalendarIcon className="h-4 w-4" />
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-80" align="end">
                 <div className="space-y-4">
                   <h4 className="font-medium leading-none">{t('subscribeCalendar')}</h4>
                   <p className="text-sm text-muted-foreground">{t('subscribeInstructions')}</p>
                   <div className="flex items-center gap-2">
                     <code className="flex-1 text-[10px] bg-muted p-2 rounded break-all select-all leading-tight">
                       {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/public/homepage/${homepagePath}/calendar.ics`}
                     </code>
                     <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleCopyLink}>
                       {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                     </Button>
                   </div>
                 </div>
               </PopoverContent>
             </Popover>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {days.map((day) => {
          const dayEvents = events.filter((e) => e.day === day);
          return (
            <div key={day} className="flex gap-2 text-sm border-b last:border-0 pb-2 last:pb-0 border-border/50">
              <div className="w-12 font-bold uppercase shrink-0 py-1">{t(day)}</div>
              <div className="flex-1 space-y-1">
                {dayEvents.length > 0 ? (
                  dayEvents.map((event, i) => (
                    <div key={i} className={cn("rounded-md px-2 py-1 flex justify-between items-center", TYPE_COLORS[event.type])}>
                      <span>{event.title}</span>
                      <span className="font-mono text-xs opacity-75">{event.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-1 text-muted-foreground italic text-xs">{t('off')}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
