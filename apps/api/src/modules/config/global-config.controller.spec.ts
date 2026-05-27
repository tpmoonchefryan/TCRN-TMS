import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import type { ChangeLogService } from '../log/services';
import { GlobalConfigController } from './global-config.controller';
import type { GlobalConfigService } from './global-config.service';

const acUser = {
  id: 'user-ac',
  tenantId: 'tenant-ac',
  tenantSchema: 'tenant_ac',
  email: 'ac@example.invalid',
  username: 'ac_admin',
} as AuthenticatedUser;

const ordinaryUser = {
  id: 'user-standard',
  tenantId: 'tenant-standard',
  tenantSchema: 'tenant_standard',
  email: 'standard@example.invalid',
  username: 'standard_admin',
} as AuthenticatedUser;

const request = {
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
  headers: {
    'user-agent': 'Vitest',
    'x-request-id': 'req-platform-config-audit',
  },
  requestId: 'req-platform-config-audit',
  traceId: 'req-platform-config-audit',
} as unknown as Request;

function createController() {
  const service = {
    get: vi.fn(),
    getAll: vi.fn(),
    getAuditSnapshot: vi.fn(),
    getMetadata: vi.fn(),
    set: vi.fn(),
  } as unknown as GlobalConfigService & {
    get: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getAuditSnapshot: ReturnType<typeof vi.fn>;
    getMetadata: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };

  const changeLogService = {
    createDirect: vi.fn(),
  } as unknown as ChangeLogService & {
    createDirect: ReturnType<typeof vi.fn>;
  };

  return {
    controller: new GlobalConfigController(service, changeLogService),
    changeLogService,
    service,
  };
}

describe('GlobalConfigController platform exposure boundary', () => {
  it('allows cataloged public runtime config without AC tenant access', async () => {
    const { controller, service } = createController();
    service.get.mockResolvedValueOnce({
      key: 'system.baseDomain',
      value: { domain: 'tcrn.app' },
      description: 'Base domain',
    });

    await expect(controller.get(ordinaryUser, 'system.baseDomain')).resolves.toEqual({
      success: true,
      data: {
        key: 'system.baseDomain',
        value: { domain: 'tcrn.app' },
        description: 'Base domain',
      },
    });
  });

  it('denies ordinary tenant reads for AC-only platform config keys', async () => {
    const { controller, service } = createController();

    await expect(controller.get(ordinaryUser, 'security.session')).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(service.get).not.toHaveBeenCalled();
  });

  it('redacts secret or sensitive config values for AC reads and writes', async () => {
    const { controller, service } = createController();
    service.getMetadata.mockResolvedValueOnce({
      key: 'email.config',
      description: 'Email provider configuration',
    });
    service.set.mockResolvedValueOnce({
      key: 'email.config',
      value: { tencentSes: { secretKey: 'raw-secret' } },
      description: 'Email provider configuration',
    });

    await expect(controller.get(acUser, 'email.config')).resolves.toEqual({
      success: true,
      data: {
        key: 'email.config',
        value: expect.objectContaining({
          exposureClass: 'secret_or_sensitive_config',
          redacted: true,
        }),
        description: 'Email provider configuration',
      },
    });

    await expect(
      controller.set(acUser, 'email.config', {
        value: { tencentSes: { secretKey: 'raw-secret' } },
      }, request)
    ).resolves.toEqual({
      success: true,
      data: {
        key: 'email.config',
        value: expect.objectContaining({
          exposureClass: 'secret_or_sensitive_config',
          redacted: true,
        }),
        description: 'Email provider configuration',
      },
    });
  });

  it('writes a redacted change log for secret platform config updates', async () => {
    const { changeLogService, controller, service } = createController();
    const objectId = '00000000-0000-4000-8000-000000000001';
    service.getAuditSnapshot
      .mockResolvedValueOnce({
        id: objectId,
        key: 'email.config',
        value: {
          provider: 'old-provider',
          secretKey: 'old-secret-must-not-be-logged',
        },
        description: 'Email provider configuration',
      })
      .mockResolvedValueOnce({
        id: objectId,
        key: 'email.config',
        value: {
          provider: 'new-provider',
          secretKey: 'new-secret-must-not-be-logged',
        },
        description: 'Email provider configuration',
      });
    service.set.mockResolvedValueOnce({
      key: 'email.config',
      value: {
        provider: 'new-provider',
        secretKey: 'new-secret-must-not-be-logged',
      },
      description: 'Email provider configuration',
    });

    await controller.set(
      acUser,
      'email.config',
      {
        value: {
          provider: 'new-provider',
          secretKey: 'new-secret-must-not-be-logged',
        },
      },
      request
    );

    expect(changeLogService.createDirect).toHaveBeenCalledTimes(1);
    const [data, context] = changeLogService.createDirect.mock.calls[0];

    expect(data).toMatchObject({
      action: 'update',
      objectType: 'platform_config',
      objectId,
      objectName: 'email.config',
      oldValue: {
        key: 'email.config',
        exposureClass: 'secret_or_sensitive_config',
        valueRedacted: true,
      },
      newValue: {
        key: 'email.config',
        exposureClass: 'secret_or_sensitive_config',
        valueRedacted: true,
        auditDecision: {
          key: 'email.config',
          exposureClass: 'secret_or_sensitive_config',
          valueHandling: 'redacted_summary_and_digest',
          rawValueLogged: false,
          requestId: 'req-platform-config-audit',
        },
      },
    });
    expect(data.oldValue.valueDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(data.newValue.valueDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(data.newValue.valueDigest).not.toBe(data.oldValue.valueDigest);
    expect(JSON.stringify(data)).not.toContain('old-secret-must-not-be-logged');
    expect(JSON.stringify(data)).not.toContain('new-secret-must-not-be-logged');
    expect(context).toMatchObject({
      userId: acUser.id,
      userName: acUser.username,
      tenantId: acUser.tenantId,
      tenantSchema: acUser.tenantSchema,
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      requestId: 'req-platform-config-audit',
      traceId: 'req-platform-config-audit',
    });
  });

  it('denies unknown keys by default before reading storage', async () => {
    const { changeLogService, controller, service } = createController();

    await expect(controller.get(acUser, 'security.unreviewed')).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(
      controller.set(acUser, 'security.unreviewed', {
        value: true,
      }, request)
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.get).not.toHaveBeenCalled();
    expect(service.getAuditSnapshot).not.toHaveBeenCalled();
    expect(service.set).not.toHaveBeenCalled();
    expect(changeLogService.createDirect).not.toHaveBeenCalled();
  });

  it('returns not found for cataloged keys absent from storage without exposing unknown keys', async () => {
    const { controller, service } = createController();
    service.get.mockResolvedValueOnce(null);

    await expect(controller.get(acUser, 'system.version')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('lists only cataloged keys and redacts secret values', async () => {
    const { controller, service } = createController();
    service.getAll.mockResolvedValueOnce([
      {
        key: 'system.baseDomain',
        value: { domain: 'tcrn.app' },
        description: 'Base domain',
      },
      {
        key: 'email.config',
        value: { tencentSes: { secretKey: 'raw-secret' } },
        description: 'Email provider configuration',
      },
      {
        key: 'security.unreviewed',
        value: true,
        description: 'Unreviewed',
      },
    ]);

    await expect(controller.list(acUser)).resolves.toEqual({
      success: true,
      data: [
        {
          key: 'system.baseDomain',
          value: { domain: 'tcrn.app' },
          description: 'Base domain',
        },
        {
          key: 'email.config',
          value: expect.objectContaining({
            exposureClass: 'secret_or_sensitive_config',
            redacted: true,
          }),
          description: 'Email provider configuration',
        },
      ],
    });
  });
});
