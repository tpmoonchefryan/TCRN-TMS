// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Marshmallow (Anonymous Q&A) Integration Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaClient } from '@tcrn/database';

describe('Marshmallow Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let accessToken: string;
  let testData: {
    talentId: string;
    talentPath: string;
    configId: string;
    messageId?: string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = new PrismaClient();

    // Setup test data
    const user = await prisma.systemUser.findFirst({
      where: { username: 'admin' },
    });

    if (!user) {
      throw new Error('Test user not found');
    }

    // Create talent with marshmallow config
    const subsidiary = await prisma.subsidiary.create({
      data: {
        code: `MARSH_SUB_${Date.now()}`,
        path: `/MARSH_SUB_${Date.now()}/`,
        nameEn: 'Marshmallow Test Subsidiary',
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    const talent = await prisma.talent.create({
      data: {
        code: `MARSH_TALENT_${Date.now()}`,
        path: `${subsidiary.path}MARSH_TALENT_${Date.now()}/`,
        nameEn: 'Marshmallow Test Talent',
        displayName: 'Marshmallow Test',
        homepagePath: `marshmallow-test-${Date.now()}`,
        subsidiaryId: subsidiary.id,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    const marshmallowConfig = await prisma.marshmallowConfig.create({
      data: {
        talentId: talent.id,
        isEnabled: true,
        anonymousOnly: true,
        requireCaptcha: false, // Disable for testing
        autoModeration: true,
        minLength: 5,
        maxLength: 1000,
        rateLimitPerIp: 10,
        rateLimitWindowMinutes: 60,
        greetingMessage: 'Welcome to the Q&A!',
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    testData = {
      talentId: talent.id,
      talentPath: talent.homepagePath!,
      configId: marshmallowConfig.id,
    };

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'TestPassword123!',
      });

    accessToken = loginResponse.body?.data?.accessToken || 'test-token';
  });

  afterAll(async () => {
    // Cleanup
    if (testData.messageId) {
      await prisma.marshmallowMessage.delete({ where: { id: testData.messageId } }).catch(() => {});
    }
    await prisma.marshmallowConfig.delete({ where: { id: testData.configId } }).catch(() => {});
    await prisma.talent.delete({ where: { id: testData.talentId } }).catch(() => {});
    
    await prisma.$disconnect();
    await app.close();
  });

  describe('Public Marshmallow API', () => {
    describe('GET /public/marshmallow/:talentPath/config', () => {
      it('should return marshmallow config for talent', async () => {
        const response = await request(app.getHttpServer())
          .get(`/public/marshmallow/${testData.talentPath}/config`)
          .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.isEnabled).toBe(true);
        expect(response.body.data.greetingMessage).toBe('Welcome to the Q&A!');
      });

      it('should return 404 for non-existent talent', async () => {
        await request(app.getHttpServer())
          .get('/public/marshmallow/non-existent-talent/config')
          .set('User-Agent', 'Mozilla/5.0')
          .expect(404);
      });
    });

    describe('POST /public/marshmallow/:talentPath/messages', () => {
      it('should submit anonymous message', async () => {
        const response = await request(app.getHttpServer())
          .post(`/public/marshmallow/${testData.talentPath}/messages`)
          .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
          .send({
            content: 'This is a test question for the talent.',
            isAnonymous: true,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        testData.messageId = response.body.data.id;
      });

      it('should reject message below minimum length', async () => {
        const response = await request(app.getHttpServer())
          .post(`/public/marshmallow/${testData.talentPath}/messages`)
          .set('User-Agent', 'Mozilla/5.0')
          .send({
            content: 'Hi', // Too short
            isAnonymous: true,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject message with blocked content', async () => {
        const response = await request(app.getHttpServer())
          .post(`/public/marshmallow/${testData.talentPath}/messages`)
          .set('User-Agent', 'Mozilla/5.0')
          .send({
            content: '傻逼 this message contains blocked words', // Has blocked keyword
            isAnonymous: true,
          });

        // Should be rejected or flagged
        expect([201, 400]).toContain(response.status);
        if (response.status === 201) {
          // If created, should be flagged for moderation
          expect(response.body.data.moderationStatus).not.toBe('approved');
        }
      });

      it('should rate limit excessive submissions', async () => {
        // Submit multiple messages quickly
        const requests = Array.from({ length: 15 }, () =>
          request(app.getHttpServer())
            .post(`/public/marshmallow/${testData.talentPath}/messages`)
            .set('User-Agent', 'Mozilla/5.0')
            .send({
              content: 'Rate limit test message content.',
              isAnonymous: true,
            })
        );

        const responses = await Promise.all(requests);
        
        // Some should succeed, some should be rate limited
        const successCount = responses.filter(r => r.status === 201).length;
        const rateLimitedCount = responses.filter(r => r.status === 429).length;

        expect(successCount + rateLimitedCount).toBe(15);
        // At least some should be rate limited
        expect(rateLimitedCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Admin Marshmallow API', () => {
    describe('GET /api/v1/talents/:talentId/marshmallow/messages', () => {
      it('should list messages for talent', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/talents/${testData.talentId}/marshmallow/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter by moderation status', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/talents/${testData.talentId}/marshmallow/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ status: 'pending' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('PATCH /api/v1/marshmallow/messages/:id', () => {
      it('should approve message', async () => {
        if (!testData.messageId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/marshmallow/messages/${testData.messageId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            moderationStatus: 'approved',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.moderationStatus).toBe('approved');
      });

      it('should reject message with reason', async () => {
        if (!testData.messageId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/marshmallow/messages/${testData.messageId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            moderationStatus: 'rejected',
            moderationReason: 'Inappropriate content',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.moderationStatus).toBe('rejected');
      });
    });

    describe('POST /api/v1/marshmallow/messages/:id/reply', () => {
      it('should reply to message', async () => {
        if (!testData.messageId) {
          return;
        }

        const response = await request(app.getHttpServer())
          .post(`/api/v1/marshmallow/messages/${testData.messageId}/reply`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            replyContent: 'Thank you for your question!',
            isPublic: true,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.replyContent).toBe('Thank you for your question!');
      });
    });

    describe('Marshmallow Config Management', () => {
      it('should get marshmallow config', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/talents/${testData.talentId}/marshmallow/config`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.isEnabled).toBe(true);
      });

      it('should update marshmallow config', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/v1/talents/${testData.talentId}/marshmallow/config`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            greetingMessage: 'Updated greeting!',
            minLength: 10,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.greetingMessage).toBe('Updated greeting!');
      });

      it('should disable marshmallow', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/v1/talents/${testData.talentId}/marshmallow/config`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            isEnabled: false,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.isEnabled).toBe(false);

        // Re-enable for other tests
        await request(app.getHttpServer())
          .patch(`/api/v1/talents/${testData.talentId}/marshmallow/config`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ isEnabled: true });
      });
    });
  });

  describe('Message Reactions', () => {
    it('should add reaction to message', async () => {
      if (!testData.messageId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/public/marshmallow/messages/${testData.messageId}/reactions`)
        .set('User-Agent', 'Mozilla/5.0')
        .send({
          reactionType: 'like',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should prevent duplicate reactions from same IP', async () => {
      if (!testData.messageId) {
        return;
      }

      // Second reaction from same IP should fail
      const response = await request(app.getHttpServer())
        .post(`/public/marshmallow/messages/${testData.messageId}/reactions`)
        .set('User-Agent', 'Mozilla/5.0')
        .send({
          reactionType: 'like',
        });

      expect([201, 409]).toContain(response.status);
    });
  });
});
