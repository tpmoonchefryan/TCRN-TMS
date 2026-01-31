/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Plus, Trash2 } from 'lucide-react';

import { ScheduleEvent, ScheduleProps } from './Preview';

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface ScheduleEditorProps {
  props: ScheduleProps;
  onChange: (props: ScheduleProps) => void;
}

import { useTranslations } from 'next-intl';

export function ScheduleEditor({ props, onChange }: ScheduleEditorProps) {
  const t = useTranslations('homepageComponentEditor');

  const handleAddEvent = () => {
    const newEvent: ScheduleEvent = {
      day: 'mon',
      time: '20:00',
      title: 'New Event',
      type: 'game',
    };
    onChange({ ...props, events: [...(props.events || []), newEvent] });
  };

  const handleUpdateEvent = (index: number, updates: Partial<ScheduleEvent>) => {
    const newEvents = [...(props.events || [])];
    newEvents[index] = { ...newEvents[index], ...updates };
    onChange({ ...props, events: newEvents });
  };

  const handleRemoveEvent = (index: number) => {
    const newEvents = [...(props.events || [])];
    newEvents.splice(index, 1);
    onChange({ ...props, events: newEvents });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('scheduleTitle')}</Label>
        <Input 
          value={props.title} 
          onChange={(e) => onChange({ ...props, title: e.target.value })} 
        />
      </div>
      <div className="space-y-2">
        <Label>{t('weekOf')}</Label>
        <Input 
          type="date"
          value={props.weekOf} 
          onChange={(e) => onChange({ ...props, weekOf: e.target.value })} 
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>{t('events')}</Label>
          <Button size="sm" variant="outline" onClick={handleAddEvent}>
            <Plus size={14} className="mr-1" /> {t('addEvent')}
          </Button>
        </div>
        
        <div className="space-y-2">
          {props.events?.map((event, index) => (
            <div key={index} className="border rounded-md p-2 space-y-2 text-xs bg-slate-50 dark:bg-slate-900">
              <div className="flex gap-2">
                <Select 
                  value={event.day} 
                  onValueChange={(v: any) => handleUpdateEvent(index, { day: v })}
                >
                  <SelectTrigger className="h-7 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => (
                      <SelectItem key={d} value={d}>{t(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  className="h-7 flex-1" 
                  value={event.time} 
                  onChange={(e) => handleUpdateEvent(index, { time: e.target.value })}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveEvent(index)}>
                  <Trash2 size={14} />
                </Button>
              </div>
              <Input 
                className="h-7" 
                placeholder={t('streamTitle')} 
                value={event.title} 
                onChange={(e) => handleUpdateEvent(index, { title: e.target.value })}
              />
              <Select 
                value={event.type} 
                onValueChange={(v: any) => handleUpdateEvent(index, { type: v })}
              >
                <SelectTrigger className="h-7 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="game">{t('game')}</SelectItem>
                  <SelectItem value="chat">{t('chat')}</SelectItem>
                  <SelectItem value="singing">{t('singing')}</SelectItem>
                  <SelectItem value="collab">{t('collab')}</SelectItem>
                  <SelectItem value="other">{t('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
