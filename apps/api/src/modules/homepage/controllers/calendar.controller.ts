// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { addDays, addHours, isValid, parseISO, setHours, setMinutes, startOfWeek } from 'date-fns';
import { Response } from 'express';
import ical, { ICalCalendarMethod } from 'ical-generator';

import { normalizeSupportedUiLocale, pickLocalizedText, type LocalizedText } from '@tcrn/shared';

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
          example:
            'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//TCRN//Homepage Calendar//EN\r\nEND:VCALENDAR',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Homepage not found',
    schema: PUBLIC_HOMEPAGE_NOT_FOUND_SCHEMA,
  })
  async getCalendar(
    @Param('path') path: string,
    @Query('lang') lang: string = 'zh_HANS',
    @Res() res: Response
  ) {
    const data = await this.publicHomepageService.getPublishedHomepageOrThrow(path);
    const talentName = data.talent.displayName;
    const targetLocale = normalizeSupportedUiLocale(lang) ?? 'zh_HANS';

    const calendarName = pickLocalizedText(
      {
        en: `${talentName}'s Schedule`,
        zh_HANS: `${talentName}的日程表`,
        zh_HANT: `${talentName}的行程表`,
        ja: `${talentName}のスケジュール`,
        ko: `${talentName} schedule`,
        fr: `Programme de ${talentName}`,
      },
      targetLocale
    );

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

      const getEventTypeLabel = (type: string) => {
        const typeMap: Record<string, LocalizedText> = {
          game: {
            en: 'GAME',
            zh_HANS: '游戏',
            zh_HANT: '遊戲',
            ja: 'ゲーム',
            ko: 'GAME',
            fr: 'JEU',
          },
          chat: {
            en: 'CHAT',
            zh_HANS: '杂谈',
            zh_HANT: '雜談',
            ja: '雑談',
            ko: 'CHAT',
            fr: 'DISCUSSION',
          },
          singing: {
            en: 'SINGING',
            zh_HANS: '歌回',
            zh_HANT: '歌回',
            ja: '歌枠',
            ko: 'SINGING',
            fr: 'CHANT',
          },
          collab: {
            en: 'COLLAB',
            zh_HANS: '联动',
            zh_HANT: '聯動',
            ja: 'コラボ',
            ko: 'COLLAB',
            fr: 'COLLAB',
          },
          other: {
            en: 'OTHER',
            zh_HANS: '其他',
            zh_HANT: '其他',
            ja: 'その他',
            ko: 'OTHER',
            fr: 'AUTRE',
          },
        };
        return pickLocalizedText(typeMap[type] ?? typeMap.other, targetLocale);
      };

      const getStreamerLabel = () =>
        pickLocalizedText(
          {
            en: 'Streamer',
            zh_HANS: '主播',
            zh_HANT: '主播',
            ja: '配信者',
            ko: 'Streamer',
            fr: 'Streamer',
          },
          targetLocale
        );

      const getTypeLabel = () =>
        pickLocalizedText(
          {
            en: 'Type',
            zh_HANS: '类型',
            zh_HANT: '類型',
            ja: 'タイプ',
            ko: 'Type',
            fr: 'Type',
          },
          targetLocale
        );

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

        const typeLabel = getEventTypeLabel(event.type);
        const prefix = `[${typeLabel}]`;

        calendar.createEvent({
          start: eventDate,
          end: addHours(eventDate, 1),
          summary: `${prefix} ${event.title}`,
          description: `${getTypeLabel()}: ${typeLabel}\n${getStreamerLabel()}: ${talentName}`,
        });
      }
    }

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="calendar.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.send(calendar.toString());
  }
}
