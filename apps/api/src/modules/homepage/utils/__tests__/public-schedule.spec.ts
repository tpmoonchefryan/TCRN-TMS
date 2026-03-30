import { describe, expect, it } from 'vitest';

import {
  getHomepageComponentCount,
  getVisibleScheduleComponentProps,
  parseScheduleComponentProps,
} from '../public-schedule';

describe('public-schedule helpers', () => {
  it('parses supported schedule component props and normalizes day/type', () => {
    expect(
      parseScheduleComponentProps({
        weekOf: '2026-01-26',
        timezone: 'Asia/Tokyo',
        events: [
          { day: 'MON', time: '20:00', title: 'Chatting', type: 'CHAT' },
          { day: 'fri', time: '21:00', title: 'Karaoke' },
          { day: 'bad', time: '18:00', title: 'Ignored' },
          { day: 'sat', time: '19:00' },
        ],
      }),
    ).toEqual({
      weekOf: '2026-01-26',
      timezone: 'Asia/Tokyo',
      events: [
        { day: 'mon', time: '20:00', title: 'Chatting', type: 'chat' },
        { day: 'fri', time: '21:00', title: 'Karaoke', type: 'other' },
      ],
    });
  });

  it('collects only visible schedule components from homepage content', () => {
    expect(
      getVisibleScheduleComponentProps({
        version: '1.0',
        components: [
          {
            id: 'schedule-visible',
            type: 'Schedule',
            props: {
              timezone: 'UTC',
              events: [{ day: 'mon', time: '20:00', title: 'Live', type: 'game' }],
            },
            order: 1,
            visible: true,
          },
          {
            id: 'schedule-hidden',
            type: 'Schedule',
            props: {
              events: [{ day: 'tue', time: '18:00', title: 'Hidden', type: 'chat' }],
            },
            order: 2,
            visible: false,
          },
          {
            id: 'not-schedule',
            type: 'RichText',
            props: {},
            order: 3,
            visible: true,
          },
        ],
      }),
    ).toEqual([
      {
        timezone: 'UTC',
        weekOf: undefined,
        events: [{ day: 'mon', time: '20:00', title: 'Live', type: 'game' }],
      },
    ]);
  });

  it('reports homepage component count only when a components array exists', () => {
    expect(getHomepageComponentCount({ components: [1, 2, 3] })).toBe(3);
    expect(getHomepageComponentCount({ components: 'bad-shape' })).toBeNull();
    expect(getHomepageComponentCount(null)).toBeNull();
  });
});
