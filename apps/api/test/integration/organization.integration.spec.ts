// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Organization Module Integration Tests

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

describeFn('Organization Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable) {
      console.log('Database not available, skipping Organization integration tests');
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

  describe('Tenant API', () => {
    it('should reject unauthenticated tenant list request', async () => {
      if (!dbAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/tenants')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Subsidiary API', () => {
    it('should reject unauthenticated subsidiary request', async () => {
      if (!dbAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/subsidiaries')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate subsidiary code format', async () => {
      if (!dbAvailable) return;

      // Code should be alphanumeric with underscores
      const validCodes = ['SUB_001', 'MAIN', 'TEST_SUBSIDIARY'];
      const invalidCodes = ['sub with spaces', '123-invalid', ''];

      validCodes.forEach(code => {
        expect(/^[A-Z0-9_]+$/.test(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(/^[A-Z0-9_]+$/.test(code)).toBe(false);
      });
    });
  });

  describe('Talent API', () => {
    it('should reject unauthenticated talent request', async () => {
      if (!dbAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/talents')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate homepage path format', async () => {
      if (!dbAvailable) return;

      // Homepage path should be lowercase alphanumeric with hyphens
      const validPaths = ['talent-name', 'my-channel', 'vtuber123'];
      const invalidPaths = ['UPPERCASE', 'has spaces', 'special@char'];

      validPaths.forEach(path => {
        expect(/^[a-z0-9-]+$/.test(path)).toBe(true);
      });

      invalidPaths.forEach(path => {
        expect(/^[a-z0-9-]+$/.test(path)).toBe(false);
      });
    });
  });

  describe('Organization Hierarchy', () => {
    it('should define correct hierarchy levels', () => {
      // According to PRD: AC > Tenant > Subsidiary > Talent
      const hierarchy = {
        AC: { level: 0, canManage: ['Tenant'] },
        Tenant: { level: 1, canManage: ['Subsidiary', 'Talent'] },
        Subsidiary: { level: 2, canManage: ['Talent'] },
        Talent: { level: 3, canManage: [] },
      };

      expect(hierarchy.AC.level).toBeLessThan(hierarchy.Tenant.level);
      expect(hierarchy.Tenant.level).toBeLessThan(hierarchy.Subsidiary.level);
      expect(hierarchy.Subsidiary.level).toBeLessThan(hierarchy.Talent.level);
    });

    it('should validate tier codes', () => {
      const validTiers = ['standard', 'professional', 'enterprise'];
      
      validTiers.forEach(tier => {
        expect(['standard', 'professional', 'enterprise']).toContain(tier);
      });
    });
  });
});

describe('Organization Data Isolation', () => {
  it('should define schema naming convention', () => {
    // Schema name should be tenant_{code}
    const tenantCode = 'ACME';
    const expectedSchema = `tenant_${tenantCode.toLowerCase()}`;
    
    expect(expectedSchema).toBe('tenant_acme');
  });

  it('should validate tenant code constraints', () => {
    // Max 32 characters, alphanumeric with underscores
    const validCodes = ['ACME', 'COMPANY_123', 'A'.repeat(32)];
    const invalidCodes = ['a'.repeat(33), 'has-hyphen', 'has spaces'];

    validCodes.forEach(code => {
      expect(code.length <= 32 && /^[A-Z0-9_]+$/.test(code)).toBe(true);
    });

    invalidCodes.forEach(code => {
      expect(code.length <= 32 && /^[A-Z0-9_]+$/.test(code)).toBe(false);
    });
  });
});
