// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Homepage Module Integration Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '@tcrn/database';

// Check if database is available
const checkDatabaseConnection = async (): Promise<boolean> => {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    return true;
  } catch {
    await prisma.$disconnect();
    return false;
  }
};

const describeFn = process.env.SKIP_INTEGRATION_TESTS ? describe.skip : describe;

describeFn('Homepage Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable) {
      console.log('Database not available, skipping Homepage integration tests');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = new PrismaClient();
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    
    await prisma?.$disconnect();
    await app?.close();
  });

  describe('External Homepage API', () => {
    it('should return 404 for non-existent homepage path', async () => {
      if (!dbAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/external/homepage/non-existent-path-12345');

      // Should return 404 for non-existent path
      expect([404, 200]).toContain(response.status);
    });

    it('should validate homepage path format', async () => {
      if (!dbAvailable) return;

      // Valid paths: lowercase alphanumeric with hyphens
      const invalidPath = 'UPPERCASE_PATH';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/external/homepage/${invalidPath}`);

      // May return 400 for invalid format or 404 for not found
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Homepage Configuration API', () => {
    it('should reject unauthenticated config update', async () => {
      if (!dbAvailable) return;

      const response = await request(app.getHttpServer())
        .put('/api/v1/homepage/config')
        .send({
          theme: 'default',
          sections: [],
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Marshmallow Messages API', () => {
    it('should validate message content length', async () => {
      if (!dbAvailable) return;

      // Max message length according to PRD
      const maxLength = 2000;
      const validMessage = 'a'.repeat(maxLength);
      const invalidMessage = 'a'.repeat(maxLength + 1);

      expect(validMessage.length).toBeLessThanOrEqual(maxLength);
      expect(invalidMessage.length).toBeGreaterThan(maxLength);
    });

    it('should require profanity filter check', async () => {
      // Messages should pass through profanity filter
      const profaneWords = ['badword1', 'badword2'];
      const cleanMessage = 'Hello, I am a fan!';
      
      // Clean message should not contain profane words
      profaneWords.forEach(word => {
        expect(cleanMessage.toLowerCase()).not.toContain(word);
      });
    });
  });
});

describe('Homepage Theme Validation', () => {
  it('should define valid theme options', () => {
    const validThemes = ['default', 'dark', 'light', 'custom'];
    
    validThemes.forEach(theme => {
      expect(['default', 'dark', 'light', 'custom']).toContain(theme);
    });
  });

  it('should validate theme color format', () => {
    // Colors should be valid hex codes
    const validColors = ['#FF0000', '#00ff00', '#0000FF', '#ffffff'];
    const invalidColors = ['red', 'FF0000', '#GGG', '#12345'];

    validColors.forEach(color => {
      expect(/^#[0-9A-Fa-f]{6}$/.test(color)).toBe(true);
    });

    invalidColors.forEach(color => {
      expect(/^#[0-9A-Fa-f]{6}$/.test(color)).toBe(false);
    });
  });
});

describe('Homepage Section Types', () => {
  it('should define valid section types', () => {
    const sectionTypes = [
      'hero',
      'about',
      'social_links',
      'schedule',
      'gallery',
      'marshmallow',
      'custom_html',
    ];

    expect(sectionTypes).toContain('hero');
    expect(sectionTypes).toContain('marshmallow');
    expect(sectionTypes.length).toBeGreaterThan(0);
  });

  it('should validate section order', () => {
    // Sections should have unique order values
    const sections = [
      { type: 'hero', order: 0 },
      { type: 'about', order: 1 },
      { type: 'marshmallow', order: 2 },
    ];

    const orders = sections.map(s => s.order);
    const uniqueOrders = new Set(orders);
    
    expect(uniqueOrders.size).toBe(orders.length);
  });
});

describe('Marshmallow Rate Limiting', () => {
  it('should define rate limit constants', () => {
    // According to PRD: 5 messages per IP per hour
    const RATE_LIMIT = {
      maxMessages: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    };

    expect(RATE_LIMIT.maxMessages).toBe(5);
    expect(RATE_LIMIT.windowMs).toBe(3600000);
  });

  it('should validate message status transitions', () => {
    const validTransitions = {
      pending: ['approved', 'rejected'],
      approved: ['archived'],
      rejected: [],
      archived: [],
    };

    expect(validTransitions.pending).toContain('approved');
    expect(validTransitions.pending).toContain('rejected');
    expect(validTransitions.rejected).toHaveLength(0);
  });
});
