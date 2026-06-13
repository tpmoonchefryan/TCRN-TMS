// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';

import {
  RUNTIME_FLAG_ADAPTER_CODES,
  RUNTIME_FLAG_DEFINITIONS,
  RUNTIME_FLAG_POLICY,
} from '@tcrn/shared';

import { RuntimeFlagsService } from './runtime-flags.service';

const context = {
  tenantId: '00000000-0000-0000-0000-0000000000ac',
  tenantSchema: 'tenant_ac',
  actorId: '00000000-0000-0000-0000-00000000ac01',
  requestId: 'req-p6',
};

function buildRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'switch-1',
    tenant_id: context.tenantId,
    flag_code: 'runtime_flags.safe_degraded_mode_probe',
    status: 'active',
    affected_behavior: 'Disable degraded mode probe',
    reason: 'Emergency upstream isolation',
    rollback_instruction: 'Restore provider and deactivate',
    source: 'ac_runtime_flags',
    expires_at: new Date('2026-06-01T00:00:00.000Z'),
    activated_by: context.actorId,
    deactivated_by: null,
    deactivated_at: null,
    audit_metadata: { rawProviderRuleLogged: false },
    created_at: new Date('2026-05-28T00:00:00.000Z'),
    updated_at: new Date('2026-05-28T00:00:00.000Z'),
    ...overrides,
  };
}

function buildConnection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'connection-flagsmith',
    tool_code: 'flagsmith',
    environment: 'local',
    deployment_mode: 'external_provided',
    local_dev_mode: 'external_provided',
    endpoint_url: 'https://flagsmith.example.test',
    enabled: true,
    readiness_state: 'healthy',
    sso_readiness_state: 'blocked',
    health_status: 'healthy',
    last_checked_at: new Date('2026-05-28T00:00:00.000Z'),
    updated_at: new Date('2026-05-28T00:00:00.000Z'),
    version: 1,
    ...overrides,
  };
}

function buildService(
  input: {
    connection?: Record<string, unknown> | null;
    sso?: Record<string, unknown> | null;
    activeSwitches?: Array<Record<string, unknown>>;
    insertedSwitch?: Record<string, unknown>;
    activeActor?: boolean;
    auditRejects?: boolean;
    env?: Record<string, string>;
    effectiveCapabilityCodes?: string[];
  } = {}
) {
  const transactionState = {
    committedMutations: 0,
    pendingMutations: 0,
    rolledBackTransactions: 0,
    inTransaction: false,
  };
  const prisma = {
    $executeRawUnsafe: vi.fn(async () => {
      if (input.auditRejects) {
        throw new Error('audit unavailable');
      }

      return 1;
    }),
    $queryRawUnsafe: vi.fn(async (query: string, ...params: unknown[]) => {
      if (query.includes('.system_user')) {
        return input.activeActor === false ? [] : [{ is_active: true }];
      }

      if (query.includes('FROM public.platform_tool_connection')) {
        return input.connection ? [input.connection] : [];
      }

      if (query.includes('FROM public.platform_external_tool_sso_readiness')) {
        return input.sso ? [input.sso] : [];
      }

      if (query.includes('INSERT INTO public.runtime_flag_kill_switch')) {
        if (transactionState.inTransaction) {
          transactionState.pendingMutations += 1;
        } else {
          transactionState.committedMutations += 1;
        }

        return [input.insertedSwitch ?? buildRow({ expires_at: new Date(String(params[5])) })];
      }

      if (query.includes('UPDATE public.runtime_flag_kill_switch')) {
        if (transactionState.inTransaction) {
          transactionState.pendingMutations += 1;
        } else {
          transactionState.committedMutations += 1;
        }

        return [buildRow({ id: params[0], status: 'deactivated', deactivated_at: new Date() })];
      }

      if (query.includes('FROM public.runtime_flag_kill_switch')) {
        const flagCode = params[1];
        return (input.activeSwitches ?? []).filter(
          (row) => !flagCode || row.flag_code === flagCode
        );
      }

      return [];
    }),
    $transaction: vi.fn(async (callback: (client: never) => Promise<unknown>) => {
      transactionState.pendingMutations = 0;
      transactionState.inTransaction = true;

      try {
        const result = await callback(prisma as never);
        transactionState.committedMutations += transactionState.pendingMutations;
        return result;
      } catch (error) {
        transactionState.rolledBackTransactions += 1;
        throw error;
      } finally {
        transactionState.pendingMutations = 0;
        transactionState.inTransaction = false;
      }
    }),
  };
  const databaseService = {
    getPrisma: () => prisma,
  };
  const configService = {
    get: vi.fn((key: string, fallback = '') => input.env?.[key] ?? fallback),
  };
  const moduleCapabilityService = {
    getCurrentTenantEffectiveCapabilities: vi.fn(async () => ({
      tenantId: context.tenantId,
      effective: {
        enabledCapabilityCodes: input.effectiveCapabilityCodes ?? ['platform.ac_management'],
      },
      registryVersion: 'p6-test',
    })),
  };

  return {
    service: new RuntimeFlagsService(
      databaseService as never,
      configService as never,
      moduleCapabilityService as never
    ),
    prisma,
    moduleCapabilityService,
    transactionState,
  };
}

describe('RuntimeFlagsService', () => {
  it('returns the locked Phase 6 adapter catalog and TCRN policy', async () => {
    const { service } = buildService();

    const adapters = await service.listAdapters(context);
    const policy = await service.getPolicy(context);

    expect(adapters.map((entry) => entry.code)).toEqual(RUNTIME_FLAG_ADAPTER_CODES);
    expect(adapters.find((entry) => entry.code === 'flagsmith_provider')).toEqual(
      expect.objectContaining({
        defaultEnabled: false,
        platformToolCode: 'flagsmith',
        ssoRequirement: 'required',
      })
    );
    expect(policy).toEqual(
      expect.objectContaining({
        rawProviderRuleEditingAllowed: false,
        providerMayCreateUnknownFlags: false,
        tenantSettingsFeaturesAllowed: false,
        globalConfigFeatureFlagsAllowed: false,
      })
    );
    expect(policy.productAuthority).toBe(RUNTIME_FLAG_POLICY.productAuthority);
  });

  it('distinguishes local stub and SSO-required provider readiness states', async () => {
    await expect(
      buildService({ env: { RUNTIME_FLAG_PROVIDER_MODE: 'stubbed' } }).service.getProviderReadiness(
        { environment: 'local' },
        context
      )
    ).resolves.toEqual(
      expect.objectContaining({
        profile: expect.objectContaining({
          readinessState: 'local_stub',
          localDevMode: 'stubbed',
        }),
      })
    );

    await expect(
      buildService({
        connection: buildConnection(),
        sso: { tool_code: 'flagsmith', status: 'blocked', fail_closed: true },
      }).service.getProviderReadiness({ environment: 'local' }, context)
    ).resolves.toEqual(
      expect.objectContaining({
        profile: expect.objectContaining({
          readinessState: 'sso_required',
          endpointConfigured: true,
        }),
      })
    );
  });

  it('evaluates registered flags from registry defaults and blocks unknown flags', async () => {
    const { service, moduleCapabilityService } = buildService();

    const result = await service.evaluate(
      {
        flagCode: 'runtime_flags.safe_degraded_mode_probe',
        context: {
          environment: 'local',
          service: 'api',
          actorClass: 'ac_operator',
          requestCategory: 'unit',
          correlationId: 'p6-safe',
        },
      },
      context
    );

    expect(result).toEqual(
      expect.objectContaining({
        value: false,
        source: 'openfeature_bridge',
        defaulted: true,
        entitlementAuthority: 'tcrn_resolved_before_runtime_flag',
        killSwitch: null,
      })
    );
    expect(result.context).toEqual(
      expect.objectContaining({
        tenantId: context.tenantId,
        resolvedCapabilityCodes: ['platform.ac_management'],
      })
    );
    expect(moduleCapabilityService.getCurrentTenantEffectiveCapabilities).toHaveBeenCalledWith(
      context.tenantId
    );

    await expect(
      service.evaluate({ flagCode: 'provider.created.unknown', context: {} }, context)
    ).rejects.toThrow('Runtime flag is not registered by TCRN');
  });

  it('rejects unsafe or PII-like evaluation context keys without logging raw context', async () => {
    const { service } = buildService();

    await expect(
      service.evaluate(
        {
          flagCode: 'runtime_flags.safe_degraded_mode_probe',
          context: {
            environment: 'local',
            email: 'operator@example.test',
            accessToken: 'secret-token',
          },
        },
        context
      )
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        details: expect.objectContaining({
          blockedKeys: ['email', 'accessToken'],
          rawContextLogged: false,
        }),
      }),
    });
  });

  it('rejects spoofed tenant, capability, and sensitive allowed context values', async () => {
    const { service } = buildService();
    const baseEvaluation = {
      flagCode: 'runtime_flags.safe_degraded_mode_probe',
      context: {
        environment: 'local',
        service: 'api',
        actorClass: 'ac_operator',
        requestCategory: 'unit',
        correlationId: 'p6-safe',
      },
    };

    await expect(
      service.evaluate(
        {
          ...baseEvaluation,
          context: {
            ...baseEvaluation.context,
            tenantId: '00000000-0000-0000-0000-000000000bad',
          },
        },
        context
      )
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        details: expect.objectContaining({
          blockedKeys: ['tenantId'],
          rawContextLogged: false,
        }),
      }),
    });

    await expect(
      service.evaluate(
        {
          ...baseEvaluation,
          context: {
            ...baseEvaluation.context,
            resolvedCapabilityCodes: ['platform.ac_management'],
          },
        },
        context
      )
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        details: expect.objectContaining({
          blockedKeys: ['resolvedCapabilityCodes'],
          rawContextLogged: false,
        }),
      }),
    });

    await expect(
      service.evaluate(
        {
          ...baseEvaluation,
          context: {
            ...baseEvaluation.context,
            correlationId: 'operator@example.test',
          },
        },
        context
      )
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        details: expect.objectContaining({
          blockedKeys: ['correlationId'],
          rawContextLogged: false,
        }),
      }),
    });
  });

  it('makes active kill switches take precedence and records audit evidence', async () => {
    const { service, prisma } = buildService({
      activeSwitches: [buildRow()],
    });

    await expect(
      service.evaluate(
        {
          flagCode: 'runtime_flags.safe_degraded_mode_probe',
          context: {
            environment: 'local',
            service: 'api',
            actorClass: 'ac_operator',
            requestCategory: 'unit',
            correlationId: 'p6-switch',
          },
        },
        context
      )
    ).resolves.toEqual(
      expect.objectContaining({
        value: false,
        reason: 'KILL_SWITCH_ACTIVE',
        source: 'runtime_kill_switch_policy',
        killSwitch: expect.objectContaining({
          reason: 'Emergency upstream isolation',
        }),
      })
    );
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('platform_tool_audit_event'),
      context.tenantId,
      'runtime_flag.evaluate.kill_switch',
      context.actorId,
      null,
      expect.stringContaining('"rawContextLogged":false'),
      context.requestId,
      null,
      null
    );
  });

  it('requires explicit confirmation and future expiry before activating kill switches', async () => {
    const { service } = buildService();
    const baseMutation = {
      flagCode: RUNTIME_FLAG_DEFINITIONS[1].code,
      affectedBehavior: 'Disable the probe path',
      reason: 'Incident response',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      rollbackInstruction: 'Deactivate after verification',
    };

    await expect(
      service.activateKillSwitch({ ...baseMutation, explicitConfirmation: false }, context)
    ).rejects.toThrow('Explicit confirmation is required');
    await expect(
      service.activateKillSwitch(
        {
          ...baseMutation,
          explicitConfirmation: true,
          expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        },
        context
      )
    ).rejects.toThrow('Kill switch expiry must be in the future');
    await expect(
      service.activateKillSwitch({ ...baseMutation, explicitConfirmation: true }, context)
    ).resolves.toEqual(
      expect.objectContaining({
        auditState: 'recorded',
        killSwitch: expect.objectContaining({
          flagCode: RUNTIME_FLAG_DEFINITIONS[1].code,
        }),
      })
    );
  });

  it('rejects blank kill-switch fields before mutation', async () => {
    const { service, transactionState } = buildService();
    const baseMutation = {
      flagCode: RUNTIME_FLAG_DEFINITIONS[1].code,
      affectedBehavior: 'Disable the probe path',
      reason: 'Incident response',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      rollbackInstruction: 'Deactivate after verification',
      explicitConfirmation: true,
    };

    await expect(
      service.activateKillSwitch({ ...baseMutation, affectedBehavior: '   ' }, context)
    ).rejects.toThrow('affectedBehavior is required');
    await expect(
      service.activateKillSwitch({ ...baseMutation, reason: '   ' }, context)
    ).rejects.toThrow('reason is required');
    await expect(
      service.activateKillSwitch({ ...baseMutation, rollbackInstruction: '   ' }, context)
    ).rejects.toThrow('rollbackInstruction is required');
    await expect(
      service.deactivateKillSwitch('switch-1', { rollbackInstruction: '   ' }, context)
    ).rejects.toThrow('rollbackInstruction is required');
    expect(transactionState.committedMutations).toBe(0);
  });

  it('rolls back kill-switch activation when audit cannot be recorded', async () => {
    const { service, prisma, transactionState } = buildService({ auditRejects: true });

    await expect(
      service.activateKillSwitch(
        {
          flagCode: RUNTIME_FLAG_DEFINITIONS[1].code,
          affectedBehavior: 'Disable the probe path',
          reason: 'Incident response',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          rollbackInstruction: 'Deactivate after verification',
          explicitConfirmation: true,
        },
        context
      )
    ).rejects.toThrow('Runtime flag audit event could not be recorded');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionState.rolledBackTransactions).toBe(1);
    expect(transactionState.committedMutations).toBe(0);
  });

  it('rolls back kill-switch deactivation when audit cannot be recorded', async () => {
    const { service, prisma, transactionState } = buildService({ auditRejects: true });

    await expect(
      service.deactivateKillSwitch(
        'switch-1',
        {
          rollbackInstruction: 'Deactivate after verification',
        },
        context
      )
    ).rejects.toThrow('Runtime flag audit event could not be recorded');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionState.rolledBackTransactions).toBe(1);
    expect(transactionState.committedMutations).toBe(0);
  });

  it('fails closed when the AC actor is missing or inactive', async () => {
    const { service, prisma } = buildService();

    await expect(service.listDefinitions({ ...context, actorId: undefined })).rejects.toThrow(
      'Runtime flag requests require an active AC operator'
    );

    prisma.$queryRawUnsafe.mockImplementationOnce(async (query: string) => {
      if (query.includes('.system_user')) {
        return [];
      }

      return [];
    });

    await expect(service.listDefinitions(context)).rejects.toThrow('Account is disabled');
  });
});
