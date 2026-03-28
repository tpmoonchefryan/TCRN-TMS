// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export interface SessionBootstrapTaskResult {
  success: boolean;
  error?: string;
}

export interface SessionBootstrapErrors {
  talents?: string;
  permissions?: string;
}

export interface SessionBootstrapResult {
  status: 'ready' | 'degraded';
  tasks: {
    talents: SessionBootstrapTaskResult;
    permissions: SessionBootstrapTaskResult;
  };
  errors: SessionBootstrapErrors | null;
}

const toFailureResult = (error: unknown): SessionBootstrapTaskResult => ({
  success: false,
  error: error instanceof Error ? error.message : 'Unknown bootstrap failure',
});

export const runSessionBootstrap = async (tasks: {
  talents: () => Promise<SessionBootstrapTaskResult>;
  permissions: () => Promise<SessionBootstrapTaskResult>;
}): Promise<SessionBootstrapResult> => {
  const [talents, permissions] = await Promise.all([
    tasks.talents().catch(toFailureResult),
    tasks.permissions().catch(toFailureResult),
  ]);

  const errors: SessionBootstrapErrors = {};

  if (!talents.success) {
    errors.talents = talents.error || 'Failed to load accessible talents';
  }

  if (!permissions.success) {
    errors.permissions = permissions.error || 'Failed to load permission snapshot';
  }

  return {
    status: Object.keys(errors).length === 0 ? 'ready' : 'degraded',
    tasks: {
      talents,
      permissions,
    },
    errors: Object.keys(errors).length > 0 ? errors : null,
  };
};
