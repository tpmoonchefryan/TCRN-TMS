// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Auth Module Integration Tests

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describeFn('Auth Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testUser: {
    id: string;
    username: string;
    email: string;
    password: string;
  };
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable) {
      console.log('Database not available, skipping Auth integration tests');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = new PrismaClient();

    // Create test user
    const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$c2VlZHRlc3RzYWx0$S8M7F3rQ3UmC9Y5r6V8x2K4w1L6n3P0q2R4t6U8v0A0';
    
    testUser = {
      id: '',
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@integration.test`,
      password: 'TestPassword123!',
    };

    const user = await prisma.systemUser.create({
      data: {
        username: testUser.username,
        email: testUser.email,
        passwordHash,
        isActive: true,
      },
    });
    testUser.id = user.id;
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    
    // Cleanup
    if (testUser?.id) {
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.id } });
      await prisma.systemUser.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma?.$disconnect();
    await app?.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(testUser.username);
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: testUser.username,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'non_existent_user',
          password: 'AnyPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Login to get refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        });

      refreshToken = loginResponse.headers['set-cookie']?.[0] || '';
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should fail without refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        });

      accessToken = loginResponse.body.data.accessToken;
      refreshToken = loginResponse.headers['set-cookie']?.[0] || '';
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail without access token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should return current user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(testUser.username);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Account Lockout', () => {
    let lockoutUser: { id: string; username: string };

    beforeAll(async () => {
      const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$c2VlZHRlc3RzYWx0$S8M7F3rQ3UmC9Y5r6V8x2K4w1L6n3P0q2R4t6U8v0A0';
      const user = await prisma.systemUser.create({
        data: {
          username: `lockout_user_${Date.now()}`,
          email: `lockout_${Date.now()}@test.com`,
          passwordHash,
          isActive: true,
        },
      });
      lockoutUser = { id: user.id, username: user.username };
    });

    afterAll(async () => {
      await prisma.systemUser.delete({ where: { id: lockoutUser.id } }).catch(() => {});
    });

    it('should lock account after multiple failed attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            username: lockoutUser.username,
            password: 'WrongPassword!',
          });
      }

      // Next attempt should be locked
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: lockoutUser.username,
          password: 'WrongPassword!',
        });

      expect(response.body.code).toBe('AUTH_ACCOUNT_LOCKED');
    });
  });
});
