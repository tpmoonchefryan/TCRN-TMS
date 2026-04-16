// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Marshmallow (Anonymous Q&A) Integration Tests

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@tcrn/database';
import {
  createTestSubsidiaryInTenant,
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import {
  CaptchaMode,
  MessageStatus,
  RejectionReason,
} from '../../src/modules/marshmallow/dto/marshmallow.dto';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

describe('Marshmallow Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;
  let talentId: string;
  let marshmallowPath: string;
  let configVersion: number;
  let approvedMessageId: string;
  let rejectedMessageId: string;

  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  const withAuth = (req: request.Test) =>
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

  const withPublicHeaders = (req: request.Test, ip: string) =>
    req
      .set('User-Agent', userAgent)
      .set('X-Real-IP', ip);

  const publicBasePath = () => `/api/v1/public/marshmallow/${marshmallowPath}`;

  const setTalentLifecycle = async (lifecycleStatus: 'published' | 'disabled') => {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantFixture.schemaName}".talent
        SET lifecycle_status = $2,
            published_at = CASE
              WHEN $2 IN ('published', 'disabled') THEN COALESCE(published_at, NOW())
              ELSE NULL
            END,
            published_by = CASE
              WHEN $2 IN ('published', 'disabled') THEN $3::uuid
              ELSE NULL
            END,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      talentId,
      lifecycleStatus,
      testUser.id,
    );
  };

  const getAdminConfig = () =>
    withAuth(
      request(app.getHttpServer()).get(`/api/v1/talents/${talentId}/marshmallow/config`),
    );

  const updateAdminConfig = (payload: Record<string, unknown>) =>
    withAuth(
      request(app.getHttpServer()).patch(`/api/v1/talents/${talentId}/marshmallow/config`),
    ).send({
      ...payload,
      version: configVersion,
    });

  const submitMessage = ({
    content,
    isAnonymous = true,
    senderName,
    fingerprint = `fp-${crypto.randomUUID()}`,
    ip = '203.0.113.10',
  }: {
    content: string;
    isAnonymous?: boolean;
    senderName?: string;
    fingerprint?: string;
    ip?: string;
  }) =>
    withPublicHeaders(
      request(app.getHttpServer()).post(`${publicBasePath()}/submit`),
      ip,
    ).send({
      content,
      isAnonymous,
      senderName,
      fingerprint,
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'marsh');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `marsh_user_${Date.now()}`,
      ['ADMIN'],
    );

    const subsidiary = await createTestSubsidiaryInTenant(prisma, tenantFixture, {
      code: `SUB_MARSH_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Marshmallow Test Subsidiary',
      createdBy: testUser.id,
    });

    const talent = await createTestTalentInTenant(prisma, tenantFixture, subsidiary.id, {
      code: `TAL_MARSH_${Date.now().toString(36).toUpperCase()}`,
      nameEn: 'Marshmallow Test Talent',
      displayName: 'Marshmallow Test Talent',
      homepagePath: `marsh-home-${Date.now()}`,
      createdBy: testUser.id,
    });

    talentId = talent.id;
    marshmallowPath = talent.code;

    await setTalentLifecycle('published');

    const tokenService = moduleFixture.get(TokenService);
    accessToken = tokenService.generateAccessToken({
      sub: testUser.id,
      tid: testUser.tenantId,
      tsc: testUser.schemaName,
      email: testUser.email,
      username: testUser.username,
    }).token;

    const initialConfig = await getAdminConfig().expect(200);
    configVersion = initialConfig.body.data.version;

    const updatedConfig = await updateAdminConfig({
      isEnabled: true,
      title: 'Ask The Talent',
      welcomeText: 'Drop a thoughtful question.',
      placeholderText: 'Type your question here',
      thankYouText: 'Question received.',
      captchaMode: CaptchaMode.NEVER,
      moderationEnabled: true,
      autoApprove: false,
      profanityFilterEnabled: false,
      externalBlocklistEnabled: false,
      minMessageLength: 5,
      maxMessageLength: 500,
      rateLimitPerIp: 2,
      rateLimitWindowHours: 1,
      reactionsEnabled: true,
      allowedReactions: [],
    }).expect(200);

    configVersion = updatedConfig.body.data.version;
  });

  afterAll(async () => {
    await app?.close();
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
  });

  it('should return public config for the configured marshmallow path', async () => {
    const response = await withPublicHeaders(
      request(app.getHttpServer()).get(`${publicBasePath()}/config`),
      '203.0.113.11',
    ).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Ask The Talent');
    expect(response.body.data.welcomeText).toBe('Drop a thoughtful question.');
    expect(response.body.data.talent.displayName).toBe('Marshmallow Test Talent');
    expect(response.body.data.allowAnonymous).toBe(true);
  });

  it('should return 404 for an unknown marshmallow path', async () => {
    const response = await withPublicHeaders(
      request(app.getHttpServer()).get('/api/v1/public/marshmallow/does-not-exist/config'),
      '203.0.113.12',
    ).expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RES_NOT_FOUND');
  });

  it('should return the admin marshmallow config', async () => {
    const response = await getAdminConfig().expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isEnabled).toBe(true);
    expect(response.body.data.captchaMode).toBe(CaptchaMode.NEVER);
    expect(response.body.data.version).toBe(configVersion);
  });

  it('should reject a message below the configured minimum length', async () => {
    const response = await submitMessage({
      content: 'hey',
      fingerprint: 'short-message-fp',
      ip: '203.0.113.13',
    }).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('should reject a named submission without senderName', async () => {
    const response = await submitMessage({
      content: 'This message should fail validation.',
      isAnonymous: false,
      fingerprint: 'named-message-fp',
      ip: '203.0.113.14',
    }).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('should submit a pending marshmallow message for moderation', async () => {
    const response = await submitMessage({
      content: 'What is the most memorable fan interaction you have had recently?',
      fingerprint: 'pending-message-fp',
      ip: '203.0.113.21',
    }).expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.status).toBe(MessageStatus.PENDING);
    expect(response.body.data.message).toBe('Question received.');

    approvedMessageId = response.body.data.id;
  });

  it('should list pending messages for the talent admin', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).get(`/api/v1/talents/${talentId}/marshmallow/messages`),
    )
      .query({ status: MessageStatus.PENDING })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.items.some((item: { id: string }) => item.id === approvedMessageId)).toBe(true);
    expect(response.body.data.meta.stats.pendingCount).toBeGreaterThanOrEqual(1);
  });

  it('should approve a pending message', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post(
        `/api/v1/talents/${talentId}/marshmallow/messages/${approvedMessageId}/approve`,
      ),
    ).expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(approvedMessageId);
    expect(response.body.data.status).toBe(MessageStatus.APPROVED);
  });

  it('should reply to an approved message', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).post(
        `/api/v1/talents/${talentId}/marshmallow/messages/${approvedMessageId}/reply`,
      ),
    )
      .send({
        content: 'Thank you for the question. We remember genuine conversations the most.',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(approvedMessageId);
    expect(response.body.data.replyContent).toContain('Thank you for the question');
  });

  it('should expose approved messages on the public page', async () => {
    const response = await withPublicHeaders(
      request(app.getHttpServer()).get(`${publicBasePath()}/messages`),
      '203.0.113.22',
    )
      .query({ fingerprint: 'public-reader-fp' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.messages)).toBe(true);
    expect(response.body.data.messages.some((message: { id: string }) => message.id === approvedMessageId)).toBe(true);

    const approvedMessage = response.body.data.messages.find(
      (message: { id: string }) => message.id === approvedMessageId,
    );
    expect(approvedMessage.replyContent).toContain('Thank you for the question');
  });

  it('should toggle reactions on an approved message', async () => {
    const firstResponse = await withPublicHeaders(
      request(app.getHttpServer()).post(`/api/v1/public/marshmallow/messages/${approvedMessageId}/react`),
      '203.0.113.23',
    )
      .send({
        reaction: '👍',
        fingerprint: 'reaction-fp',
      })
      .expect(200);

    expect(firstResponse.body.success).toBe(true);
    expect(firstResponse.body.data.added).toBe(true);
    expect(firstResponse.body.data.counts['👍']).toBe(1);

    const secondResponse = await withPublicHeaders(
      request(app.getHttpServer()).post(`/api/v1/public/marshmallow/messages/${approvedMessageId}/react`),
      '203.0.113.23',
    )
      .send({
        reaction: '👍',
        fingerprint: 'reaction-fp',
      })
      .expect(200);

    expect(secondResponse.body.success).toBe(true);
    expect(secondResponse.body.data.added).toBe(false);
    expect(secondResponse.body.data.counts['👍'] ?? 0).toBe(0);
  });

  it('should toggle the read state of an approved message', async () => {
    const firstResponse = await withPublicHeaders(
      request(app.getHttpServer()).post(
        `${publicBasePath()}/messages/${approvedMessageId}/mark-read`,
      ),
      '203.0.113.24',
    )
      .send({
        fingerprint: 'mark-read-fp',
      })
      .expect(200);

    expect(firstResponse.body.success).toBe(true);
    expect(firstResponse.body.isRead).toBe(true);

    const secondResponse = await withPublicHeaders(
      request(app.getHttpServer()).post(
        `${publicBasePath()}/messages/${approvedMessageId}/mark-read`,
      ),
      '203.0.113.24',
    )
      .send({
        fingerprint: 'mark-read-fp',
      })
      .expect(200);

    expect(secondResponse.body.success).toBe(true);
    expect(secondResponse.body.isRead).toBe(false);
  });

  it('should submit and reject a second pending message', async () => {
    const submitResponse = await submitMessage({
      content: 'This question will be rejected during moderation.',
      isAnonymous: false,
      senderName: 'Viewer',
      fingerprint: 'rejected-message-fp',
      ip: '203.0.113.31',
    }).expect(201);

    rejectedMessageId = submitResponse.body.data.id;
    expect(submitResponse.body.data.status).toBe(MessageStatus.PENDING);

    const rejectResponse = await withAuth(
      request(app.getHttpServer()).post(
        `/api/v1/talents/${talentId}/marshmallow/messages/${rejectedMessageId}/reject`,
      ),
    )
      .send({
        reason: RejectionReason.SPAM,
        note: 'Rejected during integration coverage',
      })
      .expect(201);

    expect(rejectResponse.body.success).toBe(true);
    expect(rejectResponse.body.data.id).toBe(rejectedMessageId);
    expect(rejectResponse.body.data.status).toBe(MessageStatus.REJECTED);
  });

  it('should filter rejected messages for the talent admin', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).get(`/api/v1/talents/${talentId}/marshmallow/messages`),
    )
      .query({ status: MessageStatus.REJECTED })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.items.some((item: { id: string }) => item.id === rejectedMessageId)).toBe(true);
  });

  it('should update marshmallow config with optimistic versioning', async () => {
    const response = await updateAdminConfig({
      welcomeText: 'Questions are reviewed before publishing.',
      minMessageLength: 8,
    }).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.welcomeText).toBe('Questions are reviewed before publishing.');
    expect(response.body.data.minMessageLength).toBe(8);
    expect(response.body.data.version).toBeGreaterThan(configVersion);

    configVersion = response.body.data.version;
  });

  it('should enforce rate limits for repeated submissions from the same IP', async () => {
    const repeatedIp = '198.51.100.55';

    await submitMessage({
      content: 'First rate limit test question is safely above the minimum length.',
      fingerprint: 'rate-limit-fp-1',
      ip: repeatedIp,
    }).expect(201);

    await submitMessage({
      content: 'Second rate limit test question is also safely above the minimum length.',
      fingerprint: 'rate-limit-fp-2',
      ip: repeatedIp,
    }).expect(201);

    const blockedResponse = await submitMessage({
      content: 'Third rate limit test question should be blocked by per-IP limits.',
      fingerprint: 'rate-limit-fp-3',
      ip: repeatedIp,
    }).expect(403);

    expect(blockedResponse.body.success).toBe(false);
    expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should return 404 for public pages after the talent is disabled even when config and messages exist', async () => {
    await setTalentLifecycle('disabled');

    const configResponse = await withPublicHeaders(
      request(app.getHttpServer()).get(`${publicBasePath()}/config`),
      '203.0.113.88',
    ).expect(404);
    const messagesResponse = await withPublicHeaders(
      request(app.getHttpServer()).get(`${publicBasePath()}/messages`),
      '203.0.113.89',
    )
      .query({ fingerprint: 'disabled-public-reader' })
      .expect(404);

    expect(configResponse.body.success).toBe(false);
    expect(configResponse.body.error.code).toBe('RES_NOT_FOUND');
    expect(messagesResponse.body.success).toBe(false);
    expect(messagesResponse.body.error.code).toBe('RES_NOT_FOUND');
  });
});
