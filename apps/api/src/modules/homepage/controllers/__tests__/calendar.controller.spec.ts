import { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicHomepageService } from '../../services/public-homepage.service';
import { CalendarController } from '../calendar.controller';

describe('CalendarController', () => {
  let controller: CalendarController;
  let mockPublicHomepageService: Partial<PublicHomepageService>;

  beforeEach(async () => {
    mockPublicHomepageService = {
      getPublishedHomepageOrThrow: vi.fn(),
    };

    // Manual instantiation to avoid DI issues in unit test environment
    controller = new CalendarController(mockPublicHomepageService as PublicHomepageService);
    
    // Check if we still want to use the module for other things later
    /*
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        {
          provide: PublicHomepageService,
          useValue: mockPublicHomepageService,
        },
      ],
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
    */
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCalendar', () => {
    it('should generate ICS file content', async () => {
      const mockHomepageData = {
        talent: {
          displayName: 'Test Talent',
          timezone: 'Asia/Tokyo',
        },
        content: {
          components: [
            {
              id: 'schedule-1',
              type: 'Schedule',
              data: {
                events: [],
              },
              props: {
                 events: [
                  {
                    title: 'Stream 1',
                    start: '2024-01-01T20:00:00.000Z', 
                    duration: 60,
                    day: 'mon',
                    time: '20:00',
                  },
                 ]
              }
            },
          ],
        },
        homepage: { version: {} }, // Legacy/Unused in controller but kept if needed
      };

      mockPublicHomepageService.getPublishedHomepageOrThrow = vi.fn().mockResolvedValue(mockHomepageData);

      const mockRes = {
        setHeader: vi.fn(),
        set: vi.fn(),
        send: vi.fn(),
      } as unknown as Response;

      await controller.getCalendar('test-path', 'zh', mockRes);

      expect(mockPublicHomepageService.getPublishedHomepageOrThrow).toHaveBeenCalledWith('test-path');
      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'Content-Disposition': 'inline; filename="calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }));
      // Verify timezone was set (mock data needs to be updated if we want to test specific timezone)
      expect(mockRes.send).toHaveBeenCalled();
      
      // Verify content contains event title
      const sendCall = (mockRes.send as any).mock.calls[0][0];
      expect(sendCall).toContain('SUMMARY:[其他] Stream 1');
    });
  });
});
