// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Auth Module Integration Tests

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';

import { AppModule } from '../../src/app.module';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';
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
  let tenantFixture: TenantFixture;
  let testUser: TestUser & { password: string };
  let dbAvailable = false;
  let ipCounter = 10;

  const nextIp = (): string => `198.51.100.${ipCounter++}`;

  const login = (
    overrides: Partial<{
      tenantCode: string;
      login: string;
      password: string;
    }> = {},
    ip = nextIp(),
  ) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({
        tenantCode: overrides.tenantCode ?? tenantFixture.tenant.code,
        login: overrides.login ?? testUser.username,
        password: overrides.password ?? testUser.password,
      });

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
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'auth');

    const user = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `auth_user_${Date.now()}`,
      ['ADMIN'],
    );

    testUser = {
      ...user,
      password: 'TestPassword123!',
    };
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await login().expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(testUser.username);
    });

    it('should fail with incorrect password', async () => {
      const response = await login({ password: 'WrongPassword123!' }).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should fail with non-existent user', async () => {
      const response = await login({
        login: 'non_existent_user',
        password: 'AnyPassword123!',
      }).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const loginResponse = await login();

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
      expect(response.body.error.code).toBe('AUTH_REFRESH_TOKEN_INVALID');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const loginResponse = await login();

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
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await login();

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should return current user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(testUser.username);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Account Lockout', () => {
    let lockoutUser: TestUser & { password: string };

    beforeAll(async () => {
      const user = await createTestUserInTenant(
        prisma,
        tenantFixture,
        `lockout_user_${Date.now()}`,
        ['ADMIN'],
      );
      lockoutUser = {
        ...user,
        password: 'TestPassword123!',
      };
    });

    it('should lock account after multiple failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await login(
          {
            login: lockoutUser.username,
            password: 'WrongPassword!',
          },
          nextIp(),
        );
      }

      const response = await login(
        {
          login: lockoutUser.username,
          password: lockoutUser.password,
        },
        nextIp(),
      ).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_ACCOUNT_LOCKED');
    });
  });
});
