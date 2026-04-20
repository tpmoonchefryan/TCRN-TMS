import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AuthenticatedSessionResult,
  LoginFlowResult,
} from '@/domains/auth-identity/api/auth.api';
import { LoginForm } from '@/domains/auth-identity/components/LoginForm';
import { ApiRequestError } from '@/platform/http/api';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  authenticate: vi.fn(),
  login: vi.fn<(input: {
    tenantCode: string;
    login: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<LoginFlowResult>>(),
  verifyTotp: vi.fn<(sessionToken: string, code: string) => Promise<AuthenticatedSessionResult>>(),
  forceResetPassword: vi.fn<
    (sessionToken: string, newPassword: string, newPasswordConfirm: string) => Promise<AuthenticatedSessionResult>
  >(),
  search: {
    current: '',
  },
}));

function buildLoginCopy(overrides: Partial<Record<string, string>> = {}) {
  return {
    appName: 'TCRN TMS',
    boundaryNote: '',
    brandEyebrow: 'Tenant Operations',
    confirmNewPasswordLabel: 'Confirm new password',
    confirmNewPasswordPlaceholder: 'Repeat the new password',
    credentialsDescription: 'Enter your credentials.',
    credentialsTitle: 'Sign in',
    errorFallback: 'Authentication failed.',
    heroDescription: '',
    heroTitle: '',
    newPasswordLabel: 'New password',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Minimum 12 characters',
    passwordResetDescription: 'Your account requires a password change before the private workspace can be opened.',
    passwordResetTitle: 'Set new password',
    rememberMe: 'Keep me signed in on this device',
    setNewPassword: 'Set new password',
    signIn: 'Sign in',
    submitPending: 'Working…',
    surfaceNote: '',
    tenantCodeLabel: 'Tenant code',
    totpDescription: 'Enter the six-digit code from your authenticator app to complete sign-in.',
    totpLabel: 'TOTP code',
    totpPlaceholder: '000000',
    totpTitle: 'Verify TOTP',
    usernameLabel: 'Username or email',
    usernamePlaceholder: 'admin@example.com',
    verifyTotp: 'Verify TOTP',
    ...overrides,
  };
}

const localeState = {
  currentLocale: 'en',
  copy: {
    common: {
      languageSwitcherLabel: 'Change language',
    },
    auth: {
      login: buildLoginCopy(),
    },
  },
  localeOptions: [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '简体中文' },
    { code: 'ja', label: '日本語' },
  ],
  setLocale: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
  useSearchParams: () => new URLSearchParams(mocks.search.current),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    authenticate: mocks.authenticate,
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

vi.mock('@/domains/auth-identity/api/auth.api', () => ({
  login: mocks.login,
  verifyTotp: mocks.verifyTotp,
  forceResetPassword: mocks.forceResetPassword,
}));

function buildAuthenticatedResult(
  overrides: Partial<AuthenticatedSessionResult> = {},
): AuthenticatedSessionResult {
  return {
    accessToken: 'access-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'user-1',
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      preferredLanguage: 'en',
      totpEnabled: false,
      forceReset: false,
      passwordExpiresAt: null,
      tenant: {
        id: 'tenant-1',
        name: 'Moonshot Tenant',
        tier: 'standard',
        schemaName: 'tenant_moonshot',
      },
    },
    ...overrides,
  };
}

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Tenant code'), {
    target: { value: 'moon' },
  });
  fireEvent.change(screen.getByLabelText('Username or email'), {
    target: { value: 'alice@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: '123456789012' },
  });
}

describe('LoginForm', () => {
  beforeEach(() => {
    localeState.currentLocale = 'en';
    localeState.copy.common.languageSwitcherLabel = 'Change language';
    localeState.copy.auth.login = buildLoginCopy();
    localeState.setLocale.mockReset();
    mocks.search.current = '';
    mocks.replace.mockReset();
    mocks.authenticate.mockReset();
    mocks.login.mockReset();
    mocks.verifyTotp.mockReset();
    mocks.forceResetPassword.mockReset();
  });

  it('renders localized login copy from the runtime locale contract', () => {
    localeState.currentLocale = 'zh';
    localeState.copy.auth.login = buildLoginCopy({
      appName: 'TCRN TMS',
      credentialsDescription: '输入登录信息。',
      credentialsTitle: '登录',
      passwordLabel: '密码',
      rememberMe: '在此设备上保持登录状态',
      tenantCodeLabel: '租户代码',
      usernameLabel: '用户名或邮箱',
    });

    render(<LoginForm />);

    expect(screen.getByText('TCRN TMS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByText('输入登录信息。')).toBeInTheDocument();
    expect(screen.getByLabelText('租户代码')).toBeInTheDocument();
    expect(screen.getByLabelText('用户名或邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
  });

  it('authenticates credentials and routes to the default workspace path', async () => {
    const result = buildAuthenticatedResult();
    mocks.login.mockResolvedValueOnce({
      kind: 'authenticated',
      data: result,
    });

    render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({
        tenantCode: 'MOON',
        login: 'alice@example.com',
        password: '123456789012',
        rememberMe: true,
      });
    });

    await waitFor(() => {
      expect(mocks.authenticate).toHaveBeenCalledWith(result, 'MOON');
      expect(mocks.replace).toHaveBeenCalledWith('/tenant/tenant-1');
    });
  });

  it('honors an internal next redirect and rejects an external one', async () => {
    const result = buildAuthenticatedResult();
    mocks.login.mockResolvedValue({
      kind: 'authenticated',
      data: result,
    });

    mocks.search.current = 'next=%2Ftenant%2Ftenant-1%2Fprofile';
    const { rerender } = render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/tenant/tenant-1/profile');
    });

    mocks.search.current = 'next=https%3A%2F%2Fevil.example%2Fsteal';
    mocks.replace.mockReset();
    mocks.authenticate.mockReset();
    mocks.login.mockResolvedValueOnce({
      kind: 'authenticated',
      data: result,
    });

    rerender(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/tenant/tenant-1');
    });
  });

  it('continues through the TOTP branch and completes authentication', async () => {
    const result = buildAuthenticatedResult({
      user: {
        ...buildAuthenticatedResult().user,
        tenant: {
          ...buildAuthenticatedResult().user.tenant,
          tier: 'ac',
          id: 'tenant-ac',
        },
      },
    });

    mocks.login.mockResolvedValueOnce({
      kind: 'totp_required',
      sessionToken: 'totp-session',
      expiresIn: 300,
    });
    mocks.verifyTotp.mockResolvedValueOnce(result);

    render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Verify TOTP' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('TOTP code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify TOTP' }));

    await waitFor(() => {
      expect(mocks.verifyTotp).toHaveBeenCalledWith('totp-session', '123456');
      expect(mocks.authenticate).toHaveBeenCalledWith(result, 'MOON');
      expect(mocks.replace).toHaveBeenCalledWith('/ac/tenant-ac/tenants');
    });
  });

  it('continues through the forced password reset branch and authenticates after reset', async () => {
    const result = buildAuthenticatedResult();

    mocks.login.mockResolvedValueOnce({
      kind: 'password_reset_required',
      sessionToken: 'reset-session',
      expiresIn: 300,
      reason: 'PASSWORD_RESET_REQUIRED',
    });
    mocks.forceResetPassword.mockResolvedValueOnce(result);

    render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Set new password' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-1234' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password-1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }));

    await waitFor(() => {
      expect(mocks.forceResetPassword).toHaveBeenCalledWith(
        'reset-session',
        'new-password-1234',
        'new-password-1234',
      );
      expect(mocks.authenticate).toHaveBeenCalledWith(result, 'MOON');
    });
  });

  it('renders API failures inline for credential submission', async () => {
    mocks.login.mockRejectedValueOnce(new ApiRequestError('Invalid credentials', 'AUTH_INVALID', 401));

    render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
