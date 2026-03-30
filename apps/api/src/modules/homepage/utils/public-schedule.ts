// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  type HomepageContent,
  SCHEDULE_COMPONENT_TYPE,
} from '../dto/homepage.dto';

const SCHEDULE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const SCHEDULE_EVENT_TYPES = ['game', 'chat', 'singing', 'collab', 'other'] as const;

export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];
export type ScheduleEventType = (typeof SCHEDULE_EVENT_TYPES)[number];

export interface ScheduleEvent {
  day: ScheduleDay;
  time: string;
  title: string;
  type: ScheduleEventType;
}

export interface ScheduleComponentProps {
  weekOf?: string;
  timezone?: string;
  events: ScheduleEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeScheduleDay(value: unknown): ScheduleDay | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase();
  return SCHEDULE_DAYS.includes(normalized as ScheduleDay)
    ? (normalized as ScheduleDay)
    : null;
}

function normalizeScheduleEventType(value: unknown): ScheduleEventType {
  if (typeof value !== 'string') {
    return 'other';
  }

  const normalized = value.toLowerCase();
  return SCHEDULE_EVENT_TYPES.includes(normalized as ScheduleEventType)
    ? (normalized as ScheduleEventType)
    : 'other';
}

function parseScheduleEvent(value: unknown): ScheduleEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const day = normalizeScheduleDay(value.day);
  const time = typeof value.time === 'string' ? value.time : null;
  const title = typeof value.title === 'string' ? value.title : null;

  if (!day || !time || !title) {
    return null;
  }

  return {
    day,
    time,
    title,
    type: normalizeScheduleEventType(value.type),
  };
}

export function parseScheduleComponentProps(value: unknown): ScheduleComponentProps | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawEvents = Array.isArray(value.events) ? value.events : [];

  return {
    weekOf: typeof value.weekOf === 'string' ? value.weekOf : undefined,
    timezone: typeof value.timezone === 'string' ? value.timezone : undefined,
    events: rawEvents
      .map(parseScheduleEvent)
      .filter((event): event is ScheduleEvent => event !== null),
  };
}

export function getVisibleScheduleComponentProps(
  content: HomepageContent,
): ScheduleComponentProps[] {
  if (!Array.isArray(content.components)) {
    return [];
  }

  return content.components
    .filter(
      (component) =>
        component.type === SCHEDULE_COMPONENT_TYPE && component.visible !== false,
    )
    .map((component) => parseScheduleComponentProps(component.props))
    .filter((component): component is ScheduleComponentProps => component !== null);
}

export function getHomepageComponentCount(content: unknown): number | null {
  if (!isRecord(content) || !Array.isArray(content.components)) {
    return null;
  }

  return content.components.length;
}
