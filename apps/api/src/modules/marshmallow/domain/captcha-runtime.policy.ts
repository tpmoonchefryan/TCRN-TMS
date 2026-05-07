export type CaptchaRuntimeEnvironment = 'development' | 'test' | 'staging' | 'production';

export interface CaptchaRuntimeStatus {
  environment: CaptchaRuntimeEnvironment;
  siteKeyConfigured: boolean;
  secretKeyConfigured: boolean;
  providerReady: boolean;
  runtimeBypass: boolean;
  ready: boolean;
}

export interface CaptchaRuntimeStatusInput {
  nodeEnv?: string | null;
  siteKey: string | null | undefined;
  secretKey: string | null | undefined;
}

export function normalizeCaptchaRuntimeEnvironment(
  value: string | null | undefined,
): CaptchaRuntimeEnvironment {
  if (value === 'production' || value === 'staging' || value === 'test') {
    return value;
  }

  return 'development';
}

export function buildCaptchaRuntimeStatus(input: CaptchaRuntimeStatusInput): CaptchaRuntimeStatus {
  const environment = normalizeCaptchaRuntimeEnvironment(input.nodeEnv ?? process.env.NODE_ENV);
  const siteKeyConfigured = Boolean(input.siteKey?.trim());
  const secretKeyConfigured = Boolean(input.secretKey?.trim());
  const providerReady = siteKeyConfigured && secretKeyConfigured;
  const runtimeBypass = environment === 'development' || environment === 'test';

  return {
    environment,
    siteKeyConfigured,
    secretKeyConfigured,
    providerReady,
    runtimeBypass,
    ready: runtimeBypass || providerReady,
  };
}
