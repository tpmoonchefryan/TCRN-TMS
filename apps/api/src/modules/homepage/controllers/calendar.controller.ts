// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { addDays, addHours, isValid, parseISO, setHours, setMinutes, startOfWeek } from 'date-fns';
import { Response } from 'express';
import ical, { ICalCalendarMethod } from 'ical-generator';

import { Public } from '../../../common/decorators';
import { PublicHomepageService } from '../services/public-homepage.service';

@ApiTags('Public - Homepage')
@Controller('public/homepage')
export class CalendarController {
  constructor(private readonly publicHomepageService: PublicHomepageService) {}

  @Get(':path/calendar.ics')
  @Public()
  @ApiOperation({ summary: 'Get homepage schedule as iCalendar' })
  @ApiResponse({ status: 200, description: 'Returns ICS file' })
  @ApiResponse({ status: 404, description: 'Homepage not found' })
  async getCalendar(
    @Param('path') path: string,
    @Res() res: Response,
  ) {
    const data = await this.publicHomepageService.getPublishedHomepageOrThrow(path);
    const talentName = data.talent.displayName;
    const homepageTitle = data.seo?.title || `${talentName}'s Schedule`;

    const calendar = ical({
      name: `${talentName} Schedule`,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tcrn.app'}/p/${path}`,
      method: ICalCalendarMethod.PUBLISH,
      timezone: data.talent.timezone || 'UTC', // Use talent's timezone
    });

    // Parse content to find Schedule components
    // Content structure is { components: [...] }
    const content = data.content as any;
    if (content?.components && Array.isArray(content.components)) {
      const scheduleComponents = content.components.filter(
        (c: any) => c.type === 'Schedule' && c.visible !== false
      );

      for (const comp of scheduleComponents) {
        const props = comp.props || {};
        const weekOfStr = props.weekOf; // "YYYY-MM-DD"
        const events = props.events || [];

        if (!Array.isArray(events) || events.length === 0) continue;

        // Determine the start of the week
        // If weekOf is present, use it. Otherwise, assume current week.
        let weekStart: Date;
        if (weekOfStr && isValid(parseISO(weekOfStr))) {
          weekStart = parseISO(weekOfStr);
        } else {
            // Fallback to current week monday if no date specified
           weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        }

        const dayMap: Record<string, number> = {
            mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6
        };

        for (const event of events) {
            if (!event.day || !event.time || !event.title) continue;
            
            const dayIndex = dayMap[event.day.toLowerCase()];
            if (dayIndex === undefined) continue;

            // Calculate event date
            const params = event.time.split(':');
            if (params.length < 2) continue;
            const hours = parseInt(params[0], 10);
            const minutes = parseInt(params[1], 10);

            let eventDate = addDays(weekStart, dayIndex);
            eventDate = setHours(eventDate, hours);
            eventDate = setMinutes(eventDate, minutes);

            calendar.createEvent({
                start: eventDate,
                end: addHours(eventDate, 1),
                summary: `[${event.type?.toUpperCase() || 'STREAM'}] ${event.title}`,
                description: `Type: ${event.type}\nStreamer: ${talentName}`,
            });
        }
      }
    }

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${path}-schedule.ics"`,
    });
    res.send(calendar.toString());
  }
}
