// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { addDays, addHours, isValid, parseISO, setHours, setMinutes, startOfWeek } from 'date-fns';
import { Response } from 'express';
import ical, { ICalCalendarMethod } from 'ical-generator';

import { Public } from '../../../common/decorators';
import { UaCheckMode } from '../../security/guards/ua-detection.guard';
import { PublicHomepageService } from '../services/public-homepage.service';
import { getVisibleScheduleComponentProps } from '../utils/public-schedule';

const PUBLIC_HOMEPAGE_NOT_FOUND_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'RES_NOT_FOUND' },
        message: { type: 'string', example: 'Homepage not found or not published' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code: 'RES_NOT_FOUND',
      message: 'Homepage not found or not published',
    },
  },
};

@ApiTags('Public - Homepage')
@Controller('public/homepage')
export class CalendarController {
  constructor(private readonly publicHomepageService: PublicHomepageService) {}

  @Get(':path/calendar.ics')
  @Public()
  @UaCheckMode('skip')
  @ApiOperation({ summary: 'Get homepage schedule as iCalendar' })
  @ApiResponse({
    status: 200,
    description: 'Returns ICS file',
    content: {
      'text/calendar': {
        schema: {
          type: 'string',
          example: 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//TCRN//Homepage Calendar//EN\r\nEND:VCALENDAR',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Homepage not found', schema: PUBLIC_HOMEPAGE_NOT_FOUND_SCHEMA })
  async getCalendar(
    @Param('path') path: string,
    @Query('lang') lang: string = 'zh',
    @Res() res: Response,
  ) {
    const data = await this.publicHomepageService.getPublishedHomepageOrThrow(path);
    const talentName = data.talent.displayName;
    const targetLang = ['zh', 'en', 'ja'].includes(lang) ? lang : 'zh';

    // Localize Calendar Name
    let calendarName = `${talentName}的日程表`;
    if (targetLang === 'en') calendarName = `${talentName}'s Schedule`;
    if (targetLang === 'ja') calendarName = `${talentName}のスケジュール`;

    // Parse content to find Schedule components
    // Content structure is { components: [...] }
    const scheduleComponents = getVisibleScheduleComponentProps(data.content);
    const componentTimezone = scheduleComponents[0]?.timezone ?? null;

    const calendar = ical({
      name: calendarName,
      url: `${process.env.APP_URL || 'https://tcrn.app'}/p/${path}`,
      method: ICalCalendarMethod.PUBLISH,
      timezone: componentTimezone || data.talent.timezone || 'UTC', // Prefer component timezone
    });

    for (const component of scheduleComponents) {
      const weekOfStr = component.weekOf;
      const events = component.events;

      if (events.length === 0) continue;

      // Determine the start of the week
      // If weekOf is present, use it. Otherwise, assume current week.
      let weekStart: Date;
      if (weekOfStr && isValid(parseISO(weekOfStr))) {
        weekStart = parseISO(weekOfStr);
      } else {
        // Fallback to current week monday if no date specified
        weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      }

      const dayMap = {
        mon: 0,
        tue: 1,
        wed: 2,
        thu: 3,
        fri: 4,
        sat: 5,
        sun: 6,
      };

      const getEventTypeLabel = (type: string, locale: string) => {
        const typeMap: Record<string, Record<string, string>> = {
          game: { zh: '游戏', en: 'GAME', ja: 'ゲーム' },
          chat: { zh: '杂谈', en: 'CHAT', ja: '雑談' },
          singing: { zh: '歌回', en: 'SINGING', ja: '歌枠' },
          collab: { zh: '联动', en: 'COLLAB', ja: 'コラボ' },
          other: { zh: '其他', en: 'OTHER', ja: 'その他' },
        };
        return typeMap[type]?.[locale] || typeMap.other[locale];
      };

      const getStreamerLabel = (locale: string) => {
        if (locale === 'en') return 'Streamer';
        if (locale === 'ja') return '配信者';
        return '主播';
      };

      const getTypeLabel = (locale: string) => {
        if (locale === 'en') return 'Type';
        if (locale === 'ja') return 'タイプ';
        return '类型';
      };

      for (const event of events) {
        const dayIndex = dayMap[event.day];
        if (dayIndex === undefined) continue;

        // Calculate event date
        const params = event.time.split(':');
        if (params.length < 2) continue;
        const hours = parseInt(params[0], 10);
        const minutes = parseInt(params[1], 10);

        let eventDate = addDays(weekStart, dayIndex);
        eventDate = setHours(eventDate, hours);
        eventDate = setMinutes(eventDate, minutes);

        const typeLabel = getEventTypeLabel(event.type, targetLang);
        const prefix = `[${typeLabel}]`;

        calendar.createEvent({
          start: eventDate,
          end: addHours(eventDate, 1),
          summary: `${prefix} ${event.title}`,
          description: `${getTypeLabel(targetLang)}: ${typeLabel}\n${getStreamerLabel(targetLang)}: ${talentName}`,
        });
      }
    }

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="calendar.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.send(calendar.toString());
  }
}
