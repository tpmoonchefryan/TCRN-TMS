import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AuthenticatedSessionResult,
  LoginFlowResult,
  SsoProviderDiscovery,
} from '@/domains/auth-identity/api/auth.api';
import { LoginForm } from '@/domains/auth-identity/components/LoginForm';
import type {
  OrganizationTalent,
  OrganizationTreeResponse,
} from '@/domains/organization-access/api/organization.api';
import { ApiRequestError } from '@/platform/http/api';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  authenticate: vi.fn(),
  login:
    vi.fn<
      (input: {
        tenantCode: string;
        login: string;
        password: string;
        rememberMe: boolean;
      }) => Promise<LoginFlowResult>
    >(),
  verifyTotp: vi.fn<(sessionToken: string, code: string) => Promise<AuthenticatedSessionResult>>(),
  forceResetPassword:
    vi.fn<
      (
        sessionToken: string,
        newPassword: string,
        newPasswordConfirm: string
      ) => Promise<AuthenticatedSessionResult>
    >(),
  readPostLoginOrganizationTree:
    vi.fn<(accessToken: string) => Promise<OrganizationTreeResponse>>(),
  listSsoProviders: vi.fn<(tenantCode: string) => Promise<SsoProviderDiscovery[]>>(),
  startSsoLogin: vi.fn<
    (input: { tenantCode: string; providerCode: string; next?: string | null }) => Promise<{
      authorizationUrl: string;
      stateExpiresIn: number;
      provider: SsoProviderDiscovery;
    }>
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
    passwordResetDescription:
      'Your account requires a password change before the private workspace can be opened.',
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
  locale: 'en',
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
  useUiLocale: () => localeState,
}));

vi.mock('@/domains/auth-identity/api/auth.api', () => ({
  login: mocks.login,
  verifyTotp: mocks.verifyTotp,
  forceResetPassword: mocks.forceResetPassword,
  readPostLoginOrganizationTree: mocks.readPostLoginOrganizationTree,
  listSsoProviders: mocks.listSsoProviders,
  startSsoLogin: mocks.startSsoLogin,
}));

function buildAuthenticatedResult(
  overrides: Partial<AuthenticatedSessionResult> = {}
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

function buildTalent(overrides: Partial<OrganizationTalent> = {}): OrganizationTalent {
  return {
    id: 'talent-1',
    code: 'TALENT_ONE',
    name: 'Talent One',
    displayName: 'Talent One',
    avatarUrl: null,
    subsidiaryId: null,
    subsidiaryName: null,
    path: '/TALENT_ONE/',
    homepagePath: 'talent-one',
    lifecycleStatus: 'published',
    publishedAt: '2026-05-06T00:00:00.000Z',
    isActive: true,
    lifecycleMaintenance: {
      canManage: true,
    },
    ...overrides,
  };
}

function buildOrganizationTree(talents: OrganizationTalent[] = []): OrganizationTreeResponse {
  return {
    tenantId: 'tenant-1',
    subsidiaries: [],
    directTalents: talents,
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
    localeState.locale = 'en';
    localeState.locale = 'en';
    localeState.copy.common.languageSwitcherLabel = 'Change language';
    localeState.copy.auth.login = buildLoginCopy();
    localeState.setLocale.mockReset();
    mocks.search.current = '';
    mocks.replace.mockReset();
    mocks.authenticate.mockReset();
    mocks.login.mockReset();
    mocks.verifyTotp.mockReset();
    mocks.forceResetPassword.mockReset();
    mocks.readPostLoginOrganizationTree.mockReset();
    mocks.listSsoProviders.mockReset();
    mocks.startSsoLogin.mockReset();
    mocks.readPostLoginOrganizationTree.mockResolvedValue(buildOrganizationTree());
    mocks.listSsoProviders.mockResolvedValue([]);
  });

  it('renders localized login copy from the runtime locale contract', () => {
    localeState.locale = 'zh_HANS';
    localeState.locale = 'zh_HANS';
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

  it('exposes a main landmark and skip link for keyboard entry', () => {
    render(<LoginForm />);

    expect(screen.getByRole('main')).toHaveAttribute('id', 'login-main');
    expect(screen.getByRole('link', { name: 'Skip to sign-in form' })).toHaveAttribute(
      'href',
      '#login-main'
    );
  });

  it('renders the login hero description with a hydration-stable typewriter effect', () => {
    const heroDescription = 'Record every drop of sweat behind the spotlight.';
    localeState.copy.auth.login = buildLoginCopy({
      heroDescription,
      heroTitle: 'Welcome to TCRN TMS',
    });

    const { container } = render(<LoginForm />);

    expect(screen.getByText('Welcome to TCRN TMS')).toBeInTheDocument();

    const visualDescription = container.querySelector('.login-hero-description');
    expect(visualDescription).toHaveAttribute('aria-hidden', 'true');
    expect(visualDescription).toHaveTextContent(heroDescription);
    expect(visualDescription).toHaveClass('login-hero-typewriter');
    expect(container.querySelectorAll('.login-hero-typewriter-character')).toHaveLength(
      Array.from(heroDescription).length
    );
    expect(container.querySelector('.login-hero-typewriter-caret')).toBeInTheDocument();

    const screenReaderDescription = screen
      .getAllByText(heroDescription)
      .find((element) => element.classList.contains('sr-only'));
    expect(screenReaderDescription).toBeDefined();
    const typewriterCss = container.querySelector('style')?.textContent ?? '';
    expect(typewriterCss).toContain('loginHeroCharacterReveal');
    expect(typewriterCss).toContain('prefers-reduced-motion: reduce');
  });

  it('uses stable form semantics for login, TOTP, and password-reset fields', async () => {
    mocks.login.mockResolvedValueOnce({
      kind: 'totp_required',
      sessionToken: 'totp-session',
      expiresIn: 300,
    });
    mocks.login.mockResolvedValueOnce({
      kind: 'password_reset_required',
      sessionToken: 'reset-session',
      expiresIn: 300,
      reason: 'PASSWORD_RESET_REQUIRED',
    });

    const firstView = render(<LoginForm />);

    expect(screen.getByLabelText('Tenant code')).toHaveAttribute('name', 'tenantCode');
    expect(screen.getByLabelText('Tenant code')).toHaveAttribute('autocomplete', 'off');
    expect(screen.getByLabelText('Username or email')).toHaveAttribute('name', 'login');
    expect(screen.getByLabelText('Username or email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('name', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');

    const form = screen.getByLabelText('Password').closest('form');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', '/login');
    const fallbackAction = new URL(
      form?.getAttribute('action') ?? '',
      'https://app.example.test'
    );
    expect(fallbackAction.search).toBe('');

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const totpInput = await screen.findByLabelText('TOTP code');
    expect(totpInput).toHaveAttribute('name', 'totpCode');
    expect(totpInput).toHaveAttribute('autocomplete', 'one-time-code');

    firstView.unmount();
    render(<LoginForm />);
    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const newPasswordInput = await screen.findByLabelText('New password');
    const confirmInput = screen.getByLabelText('Confirm new password');
    expect(newPasswordInput).toHaveAttribute('name', 'newPassword');
    expect(newPasswordInput).toHaveAttribute('autocomplete', 'new-password');
    expect(confirmInput).toHaveAttribute('name', 'newPasswordConfirm');
    expect(confirmInput).toHaveAttribute('autocomplete', 'new-password');
  });

  it('keeps credential fields out of the native fallback URL and away from the auth API', () => {
    window.history.pushState({}, '', '/login?next=%2Ftenant%2Ftenant-1%2Fprofile');
    const { container } = render(<LoginForm />);
    const form = container.querySelector('form');
    const testPassword = 'native-fallback-password-123';

    expect(form).toBeInstanceOf(HTMLFormElement);
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', '/login');

    fireEvent.change(screen.getByLabelText('Tenant code'), {
      target: { value: 'moon' },
    });
    fireEvent.change(screen.getByLabelText('Username or email'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: testPassword },
    });

    expect(window.location.href).not.toContain(testPassword);
    expect(window.location.href).not.toContain('alice%40example.com');
    expect(window.location.href).not.toContain('tenantCode');
    expect(window.location.href).not.toContain('password');

    const fallbackAction = new URL((form as HTMLFormElement).action);
    expect(fallbackAction.pathname).toBe('/login');
    expect(fallbackAction.search).toBe('');
    expect(fallbackAction.pathname).not.toBe('/api/v1/auth/login');
    expect(fallbackAction.href).not.toContain(testPassword);
    expect(fallbackAction.href).not.toContain('alice%40example.com');
    expect(fallbackAction.href).not.toContain('tenantCode');
    expect(fallbackAction.href).not.toContain('password');
  });

  it('moves focus to the first active field for each login step', async () => {
    mocks.login.mockResolvedValueOnce({
      kind: 'totp_required',
      sessionToken: 'totp-session',
      expiresIn: 300,
    });
    mocks.login.mockResolvedValueOnce({
      kind: 'password_reset_required',
      sessionToken: 'reset-session',
      expiresIn: 300,
      reason: 'PASSWORD_RESET_REQUIRED',
    });

    const firstView = render(<LoginForm />);

    expect(screen.getByLabelText('Tenant code')).toHaveFocus();

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByLabelText('TOTP code')).toHaveFocus();

    firstView.unmount();
    render(<LoginForm />);
    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByLabelText('New password')).toHaveFocus();
  });

  it('authenticates credentials and routes to a single published talent workspace', async () => {
    const result = buildAuthenticatedResult();
    mocks.readPostLoginOrganizationTree.mockResolvedValueOnce(
      buildOrganizationTree([
        buildTalent({
          id: 'talent-solo',
          code: 'SOLO',
          displayName: 'Solo Talent',
        }),
      ])
    );
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
      expect(mocks.readPostLoginOrganizationTree).toHaveBeenCalledWith('access-token');
      expect(mocks.replace).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-solo');
    });
  });

  it('shows a post-login selector when multiple published talents are available', async () => {
    const result = buildAuthenticatedResult();
    mocks.readPostLoginOrganizationTree.mockResolvedValueOnce(
      buildOrganizationTree([
        buildTalent({
          id: 'talent-aurora',
          code: 'AURORA',
          displayName: 'Aurora',
        }),
        buildTalent({
          id: 'talent-luna',
          code: 'LUNA',
          displayName: 'Luna',
          subsidiaryId: 'sub-1',
          subsidiaryName: 'Tokyo Branch',
        }),
        buildTalent({
          id: 'talent-draft',
          code: 'DRAFT',
          displayName: 'Draft Talent',
          lifecycleStatus: 'draft',
          publishedAt: null,
        }),
      ])
    );
    mocks.login.mockResolvedValueOnce({
      kind: 'authenticated',
      data: result,
    });

    render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('dialog', { name: 'Choose a talent workspace' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Aurora workspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Luna workspace' })).toBeInTheDocument();
    expect(screen.queryByText('Draft Talent')).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open Luna workspace' }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-luna');
    });
  });

  it('closes the post-login selector on Escape and returns focus to the login form', async () => {
    const result = buildAuthenticatedResult();
    mocks.readPostLoginOrganizationTree.mockResolvedValueOnce(
      buildOrganizationTree([
        buildTalent({
          id: 'talent-aurora',
          code: 'AURORA',
          displayName: 'Aurora',
        }),
        buildTalent({
          id: 'talent-luna',
          code: 'LUNA',
          displayName: 'Luna',
        }),
      ])
    );
    mocks.login.mockResolvedValueOnce({
      kind: 'authenticated',
      data: result,
    });

    render(<LoginForm />);
    fillCredentials();

    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(signInButton);

    expect(
      await screen.findByRole('dialog', { name: 'Choose a talent workspace' })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open Aurora workspace' })).toHaveFocus();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Choose a talent workspace' })
      ).not.toBeInTheDocument();
    });
    expect([screen.getByLabelText('Tenant code'), signInButton]).toContain(document.activeElement);
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('falls back to organization structure when no published talent is selectable', async () => {
    const result = buildAuthenticatedResult();
    mocks.readPostLoginOrganizationTree.mockResolvedValueOnce(
      buildOrganizationTree([
        buildTalent({
          id: 'talent-draft',
          code: 'DRAFT',
          displayName: 'Draft Talent',
          lifecycleStatus: 'draft',
          publishedAt: null,
        }),
        buildTalent({
          id: 'talent-disabled',
          code: 'DISABLED',
          displayName: 'Disabled Talent',
          lifecycleStatus: 'disabled',
          isActive: false,
        }),
      ])
    );
    mocks.login.mockResolvedValueOnce({
      kind: 'authenticated',
      data: result,
    });

    render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/tenant/tenant-1/organization-structure');
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
    expect(mocks.readPostLoginOrganizationTree).not.toHaveBeenCalled();

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
      expect(mocks.readPostLoginOrganizationTree).toHaveBeenCalledWith('access-token');
      expect(mocks.replace).toHaveBeenCalledWith('/tenant/tenant-1/organization-structure');
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
      expect(mocks.readPostLoginOrganizationTree).not.toHaveBeenCalled();
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
        'new-password-1234'
      );
      expect(mocks.authenticate).toHaveBeenCalledWith(result, 'MOON');
    });
  });

  it('renders API failures inline for credential submission', async () => {
    mocks.login.mockRejectedValueOnce(
      new ApiRequestError('Invalid credentials', 'AUTH_INVALID', 401)
    );

    render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const errorBanner = await screen.findByRole('status');
    expect(errorBanner).toHaveTextContent('Invalid credentials');
    expect(errorBanner).toHaveAttribute('aria-live', 'polite');
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
