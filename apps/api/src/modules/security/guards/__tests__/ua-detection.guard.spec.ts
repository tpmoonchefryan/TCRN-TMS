import { type ExecutionContext,ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UaDetectionService } from '../../services/ua-detection.service';
import { UaDetectionGuard } from '../ua-detection.guard';

interface UaDetectionRequest extends Request {
  isSuspiciousUa?: boolean;
  uaCheckReason?: string;
}

describe('UaDetectionGuard', () => {
  let guard: UaDetectionGuard;
  let mockReflector: Pick<Reflector, 'get'>;
  let mockUaDetectionService: Pick<UaDetectionService, 'check' | 'checkStrict'>;

  beforeEach(() => {
    mockReflector = {
      get: vi.fn().mockReturnValue('normal'),
    };
    mockUaDetectionService = {
      check: vi.fn(),
      checkStrict: vi.fn(),
    };

    guard = new UaDetectionGuard(
      mockReflector as Reflector,
      mockUaDetectionService as UaDetectionService,
    );
  });

  function createContext(request: UaDetectionRequest): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => class TestClass {},
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  it('marks suspicious requests without using loose request casts', () => {
    const request = {
      headers: {
        'user-agent': 'suspicious-agent',
      },
    } as UaDetectionRequest;

    vi.mocked(mockUaDetectionService.check).mockReturnValue({
      allowed: true,
      isBot: false,
      isSuspicious: true,
      reason: 'test-reason',
    });

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request.isSuspiciousUa).toBe(true);
    expect(request.uaCheckReason).toBe('test-reason');
  });

  it('uses strict mode when requested and blocks denied UAs', () => {
    vi.mocked(mockReflector.get).mockReturnValueOnce('strict');
    vi.mocked(mockUaDetectionService.checkStrict).mockReturnValue({
      allowed: false,
      isBot: false,
      isSuspicious: true,
      reason: 'blocked',
    });

    const request = {
      headers: {
        'user-agent': 'blocked-agent',
      },
    } as UaDetectionRequest;

    expect(() => guard.canActivate(createContext(request))).toThrow(
      ForbiddenException,
    );
    expect(mockUaDetectionService.checkStrict).toHaveBeenCalledWith('blocked-agent');
  });

  it('skips detection when metadata says skip', () => {
    vi.mocked(mockReflector.get).mockReturnValueOnce('skip');

    const request = {
      headers: {
        'user-agent': 'ignored-agent',
      },
    } as UaDetectionRequest;

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(mockUaDetectionService.check).not.toHaveBeenCalled();
    expect(mockUaDetectionService.checkStrict).not.toHaveBeenCalled();
  });
});
