import { BadRequestException, type ExecutionContext,ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../modules/database';
import { PublishedTalentAccessGuard } from './published-talent-access.guard';

describe('PublishedTalentAccessGuard', () => {
  let guard: PublishedTalentAccessGuard;
  let mockReflector: Pick<Reflector, 'getAllAndOverride'>;
  let mockDatabaseService: Pick<DatabaseService, 'getPrisma'>;
  let mockPrisma: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
  };

  const publishedTalentId = '550e8400-e29b-41d4-a716-446655440000';
  const otherTalentId = '550e8400-e29b-41d4-a716-446655440001';

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => 'handler',
      getClass: () => class TestController {},
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    mockPrisma = {
      $queryRawUnsafe: vi.fn(),
    };

    mockReflector = {
      getAllAndOverride: vi.fn(),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    guard = new PublishedTalentAccessGuard(
      mockReflector as Reflector,
      mockDatabaseService as DatabaseService,
    );
  });

  it('allows undecorated handlers without querying lifecycle', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(undefined);

    await expect(
      guard.canActivate(createContext({ user: { tenantSchema: 'tenant_test' } })),
    ).resolves.toBe(true);

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('rejects mismatched direct talent carriers', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue({});

    const request = {
      user: { tenantSchema: 'tenant_test' },
      params: { talentId: publishedTalentId },
      headers: { 'x-talent-id': otherTalentId },
      body: {},
      query: {},
    };

    try {
      await guard.canActivate(createContext(request));
      throw new Error('Expected guard to reject mismatched talent carriers');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Talent scope carriers must resolve to the same talent.',
      });
    }
  });

  it('rejects draft talents with TALENT_NOT_PUBLISHED', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue({});
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { lifecycleStatus: 'draft' },
    ]);

    const request = {
      user: { tenantSchema: 'tenant_test' },
      params: {},
      headers: {},
      body: {},
      query: { talentId: publishedTalentId },
    };

    try {
      await guard.canActivate(createContext(request));
      throw new Error('Expected guard to reject draft talents');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: ErrorCodes.TALENT_NOT_PUBLISHED,
      });
    }
  });

  it('resolves the owner talent from jobId and verifies carrier consistency', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue({ jobOwnerSource: 'report' });
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ talentId: publishedTalentId }])
      .mockResolvedValueOnce([{ lifecycleStatus: 'published' }]);

    const request = {
      user: { tenantSchema: 'tenant_test' },
      params: { jobId: '550e8400-e29b-41d4-a716-446655440099' },
      headers: {},
      body: {},
      query: { talent_id: publishedTalentId },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM "tenant_test"."report_job"'),
      '550e8400-e29b-41d4-a716-446655440099',
    );
  });
});
