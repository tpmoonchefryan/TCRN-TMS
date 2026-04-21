import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  RuntimeLocaleProvider,
  useRuntimeLocale,
} from '@/platform/runtime/locale/locale-provider';

let mockSession:
  | {
      tenantId: string;
      user: {
        id: string;
        preferredLanguage: string;
      };
    }
  | null = null;

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: mockSession,
  }),
}));

function LocaleHarness() {
  const { copy, currentLocale, selectedLocale, setLocale } = useRuntimeLocale();

  return (
    <div>
      <p data-testid="current-locale">{currentLocale}</p>
      <p data-testid="selected-locale">{selectedLocale}</p>
      <p>{copy.auth.login.signIn}</p>
      <p>{copy.customerManagement.title}</p>
      <p>{copy.tenantGovernance.shellLabel}</p>
      <p>{copy.tenantGovernance.titles.subsidiarySettings}</p>
      <p>{copy.publicMarshmallow.badge}</p>
      <button type="button" onClick={() => setLocale('en')}>
        Switch English
      </button>
    </div>
  );
}

describe('RuntimeLocaleProvider', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
    mockSession = {
      tenantId: 'tenant-1',
      user: {
        id: 'user-1',
        preferredLanguage: 'ja',
      },
    };
  });

  it('prefers the authenticated user language over the browser language', () => {
    render(
      <RuntimeLocaleProvider>
        <LocaleHarness />
      </RuntimeLocaleProvider>,
    );

    expect(screen.getByTestId('current-locale')).toHaveTextContent('ja');
    expect(screen.getByTestId('selected-locale')).toHaveTextContent('ja');
    expect(screen.getByText('サインイン')).toBeInTheDocument();
    expect(screen.getByText('顧客管理')).toBeInTheDocument();
    expect(screen.getByText('テナント')).toBeInTheDocument();
    expect(screen.getByText('公開マシュマロ')).toBeInTheDocument();
  });

  it('falls back to the browser language and allows runtime override', () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'zh-CN',
    });
    mockSession = null;

    render(
      <RuntimeLocaleProvider>
        <LocaleHarness />
      </RuntimeLocaleProvider>,
    );

    expect(screen.getByTestId('current-locale')).toHaveTextContent('zh');
    expect(screen.getByTestId('selected-locale')).toHaveTextContent('zh_HANS');
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('客户管理')).toBeInTheDocument();
    expect(screen.getByText('租户')).toBeInTheDocument();
    expect(screen.getByText('分目录设置')).toBeInTheDocument();
    expect(screen.getByText('公开棉花糖')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Switch English' }));

    expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('selected-locale')).toHaveTextContent('en');
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Customer Management')).toBeInTheDocument();
    expect(screen.getByText('Tenant')).toBeInTheDocument();
    expect(screen.getByText('Public Marshmallow')).toBeInTheDocument();
  });

  it('keeps trilingual family fallback while serving exact selected-locale copy', () => {
    mockSession = {
      tenantId: 'tenant-1',
      user: {
        id: 'user-1',
        preferredLanguage: 'zh_HANT',
      },
    };

    render(
      <RuntimeLocaleProvider>
        <LocaleHarness />
      </RuntimeLocaleProvider>,
    );

    expect(screen.getByTestId('current-locale')).toHaveTextContent('zh');
    expect(screen.getByTestId('selected-locale')).toHaveTextContent('zh_HANT');
    expect(screen.getByText('登入')).toBeInTheDocument();
    expect(screen.getByText('租户')).toBeInTheDocument();
    expect(screen.getByText('分目錄設定')).toBeInTheDocument();
  });

  it('serves exact Korean runtime copy while preserving English family fallback for domain-local copies', () => {
    mockSession = {
      tenantId: 'tenant-1',
      user: {
        id: 'user-1',
        preferredLanguage: 'ko',
      },
    };

    render(
      <RuntimeLocaleProvider>
        <LocaleHarness />
      </RuntimeLocaleProvider>,
    );

    expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('selected-locale')).toHaveTextContent('ko');
    expect(screen.getByText('로그인')).toBeInTheDocument();
    expect(screen.getByText('테넌트')).toBeInTheDocument();
  });
});
