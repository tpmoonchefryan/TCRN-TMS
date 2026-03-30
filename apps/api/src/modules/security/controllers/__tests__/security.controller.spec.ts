import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IpRuleScope } from '../../dto/security.dto';
import { SecurityController } from '../security.controller';

describe('SecurityController', () => {
  let controller: SecurityController;
  const mockFingerprintService = {
    generateVersionedFingerprint: vi.fn(),
    generateShortFingerprint: vi.fn(),
  };
  const mockBlocklistService = {
    findMany: vi.fn(),
    create: vi.fn(),
    test: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    disableInScope: vi.fn(),
    enableInScope: vi.fn(),
  };
  const mockIpAccessService = {
    findMany: vi.fn(),
    addRule: vi.fn(),
    checkAccess: vi.fn(),
    removeRule: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new SecurityController(
      mockFingerprintService as never,
      mockBlocklistService as never,
      mockIpAccessService as never,
    );
  });

  it('forwards the provided scope to ipAccessService.checkAccess', async () => {
    vi.mocked(mockIpAccessService.checkAccess).mockResolvedValue({ allowed: true });

    await controller.checkIpAccess({
      ip: '127.0.0.1',
      scope: IpRuleScope.ADMIN,
    });

    expect(mockIpAccessService.checkAccess).toHaveBeenCalledWith(
      '127.0.0.1',
      IpRuleScope.ADMIN,
    );
  });

  it('defaults omitted scope to global', async () => {
    vi.mocked(mockIpAccessService.checkAccess).mockResolvedValue({ allowed: true });

    await controller.checkIpAccess({
      ip: '127.0.0.1',
    });

    expect(mockIpAccessService.checkAccess).toHaveBeenCalledWith(
      '127.0.0.1',
      IpRuleScope.GLOBAL,
    );
  });
});
