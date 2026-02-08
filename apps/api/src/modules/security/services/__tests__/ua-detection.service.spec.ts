// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach,describe, expect, it } from 'vitest';

import { UaDetectionService } from '../ua-detection.service';

describe('UaDetectionService', () => {
  let service: UaDetectionService;

  beforeEach(() => {
    service = new UaDetectionService();
  });

  describe('check', () => {
    describe('empty or short user agents', () => {
      it('should reject empty user agent', () => {
        const result = service.check('');

        expect(result.allowed).toBe(false);
        expect(result.isSuspicious).toBe(true);
      });

      it('should reject undefined user agent', () => {
        const result = service.check(undefined);

        expect(result.allowed).toBe(false);
        expect(result.isSuspicious).toBe(true);
      });

      it('should reject too short user agent', () => {
        const result = service.check('ab');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('too short');
      });
    });

    describe('allowed legitimate bots', () => {
      it('should allow Googlebot', () => {
        const result = service.check('Googlebot/2.1 (+http://www.google.com/bot.html)');

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(true);
        expect(result.isSuspicious).toBe(false);
      });

      it('should allow Bingbot', () => {
        const result = service.check('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)');

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(true);
      });

      it('should allow Facebook crawler', () => {
        const result = service.check('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(true);
      });

      it('should allow Twitterbot', () => {
        const result = service.check('Twitterbot/1.0');

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(true);
      });

      it('should allow Discord bot', () => {
        const result = service.check('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)');

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(true);
      });
    });

    describe('blocked malicious user agents', () => {
      it('should block python-requests', () => {
        const result = service.check('python-requests/2.28.0');

        expect(result.allowed).toBe(false);
        expect(result.isBot).toBe(true);
        expect(result.isSuspicious).toBe(true);
      });

      it('should block Scrapy', () => {
        const result = service.check('Scrapy/2.5.0 (+https://scrapy.org)');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Scrapy');
      });

      it('should block HTTrack', () => {
        const result = service.check('HTTrack/3.0x');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('HTTrack');
      });

      it('should block AhrefsBot', () => {
        const result = service.check('AhrefsBot/7.0');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Ahrefs');
      });

      it('should block zgrab scanner', () => {
        const result = service.check('zgrab/0.x');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('ZGrab');
      });

      it('should block nmap scanner', () => {
        const result = service.check('Nmap Scripting Engine');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Nmap');
      });
    });

    describe('suspicious user agents (allowed but flagged)', () => {
      it('should allow but flag curl', () => {
        const result = service.check('curl/7.64.1');

        expect(result.allowed).toBe(true);
        expect(result.isSuspicious).toBe(true);
        expect(result.reason).toContain('curl');
      });

      it('should allow but flag wget', () => {
        const result = service.check('Wget/1.21');

        expect(result.allowed).toBe(true);
        expect(result.isSuspicious).toBe(true);
        expect(result.reason).toContain('wget');
      });

      it('should allow but flag Go HTTP client', () => {
        const result = service.check('Go-http-client/1.1');

        expect(result.allowed).toBe(true);
        expect(result.isSuspicious).toBe(true);
        expect(result.reason).toContain('Go');
      });

      it('should allow but flag Java client', () => {
        const result = service.check('Java/11.0.11');

        expect(result.allowed).toBe(true);
        expect(result.isSuspicious).toBe(true);
        expect(result.reason).toContain('Java');
      });
    });

    describe('legitimate browsers', () => {
      it('should allow Chrome browser', () => {
        const result = service.check(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(false);
        expect(result.isSuspicious).toBe(false);
      });

      it('should allow Firefox browser', () => {
        const result = service.check(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        );

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(false);
        expect(result.isSuspicious).toBe(false);
      });

      it('should allow Safari browser', () => {
        const result = service.check(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        );

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(false);
        expect(result.isSuspicious).toBe(false);
      });

      it('should allow mobile Chrome', () => {
        const result = service.check(
          'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        );

        expect(result.allowed).toBe(true);
        expect(result.isBot).toBe(false);
        expect(result.isSuspicious).toBe(false);
      });
    });
  });

  describe('checkStrict', () => {
    it('should block suspicious user agents in strict mode', () => {
      const result = service.checkStrict('curl/7.64.1');

      expect(result.allowed).toBe(false);
      expect(result.isSuspicious).toBe(true);
    });

    it('should still allow legitimate browsers in strict mode', () => {
      const result = service.checkStrict(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      );

      expect(result.allowed).toBe(true);
    });

    it('should still allow legitimate bots in strict mode', () => {
      const result = service.checkStrict('Googlebot/2.1');

      expect(result.allowed).toBe(true);
      expect(result.isBot).toBe(true);
    });

    it('should still block malicious user agents in strict mode', () => {
      const result = service.checkStrict('python-requests/2.28.0');

      expect(result.allowed).toBe(false);
    });
  });
});
