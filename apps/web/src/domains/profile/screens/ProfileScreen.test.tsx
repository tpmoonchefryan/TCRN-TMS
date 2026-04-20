import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileScreen } from '@/domains/profile/screens/ProfileScreen';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const mockUpdateSessionUser = vi.fn();
let currentSession: {
  tenantName: string;
  user?: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    preferredLanguage: string;
    totpEnabled: boolean;
    forceReset: boolean;
    passwordExpiresAt: string | null;
  };
} = {
  tenantName: 'Moonshot Tenant',
};

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    updateSessionUser: mockUpdateSessionUser,
    session: currentSession,
  }),
}));

vi.mock('@/domains/profile/screens/profile.copy', () => ({
  useProfileCopy: () => ({
    currentLocale: 'en',
    copy: {
      header: {
        chipPrefix: 'Current Scope',
        title: 'Profile',
        description: 'Profile description',
        securityTitle: 'Account Security',
        securityDescription: 'Security description',
        summaryUserLabel: 'User',
        summaryUserHint: 'Current authenticated profile.',
        summaryEmailLabel: 'Email',
        summaryEmailHint: 'Primary account email.',
        summaryTotpLabel: 'TOTP',
        summaryTotpEnabled: 'Enabled',
        summaryTotpDisabled: 'Disabled',
        summaryTotpHint: 'Second-factor status.',
        summarySessionsLabel: 'Sessions',
        summarySessionsHint: 'Active sign-in sessions for {workspace}.',
      },
      state: {
        loading: 'Loading profile…',
        unavailableTitle: 'Profile unavailable',
        loadError: 'Failed to load profile.',
        actionFailed: 'Profile action failed.',
        currentTenantFallback: 'Current Tenant',
      },
      details: {
        title: 'Profile Details',
        description: 'Update display, contact, and language preferences.',
        reset: 'Reset',
        save: 'Save profile',
        savePending: 'Saving…',
        displayNameLabel: 'Display name',
        phoneLabel: 'Phone',
        preferredLanguageLabel: 'Preferred language',
        lastLoginLabel: 'Last Login',
        lastLoginHint: 'Latest authenticated activity.',
        passwordExpiresLabel: 'Password Expires',
        passwordExpiresHint: 'Current password-policy horizon.',
        never: 'Never',
        notScheduled: 'Not scheduled',
        saved: 'Profile details saved.',
        saveError: 'Failed to save profile details.',
      },
      password: {
        title: 'Password',
        description: 'Change the current password.',
        action: 'Change password',
        pending: 'Changing…',
        currentLabel: 'Current password',
        newLabel: 'New password',
        confirmLabel: 'Confirm new password',
        error: 'Failed to change password.',
      },
      totp: {
        title: 'TOTP & Recovery Codes',
        description: 'Prepare, enable, disable, and rotate second-factor material from the same workspace.',
        disabledTitle: 'TOTP is currently disabled',
        disabledDescription: 'Generate a setup secret first, then verify one authenticator code to enable it.',
        prepareAction: 'Prepare TOTP setup',
        preparePending: 'Preparing…',
        prepared: 'TOTP setup prepared. Enter the code from your authenticator app to enable it.',
        prepareError: 'Failed to prepare TOTP setup.',
        setupMaterialTitle: 'Setup material',
        accountLabel: 'Account',
        secretLabel: 'Secret',
        otpAuthUrlLabel: 'OTPAuth URL',
        enableTitle: 'Enable TOTP',
        enableDescription: 'Enter the current code from your authenticator app to complete enablement and issue recovery codes.',
        codeLabel: 'TOTP verification code',
        codePlaceholder: '123456',
        enableAction: 'Enable TOTP',
        enablePending: 'Enabling…',
        enabled: 'TOTP enabled. Save the new recovery codes now.',
        enableError: 'Failed to enable TOTP.',
        disableTitle: 'Disable TOTP',
        disableDescription: 'Enter the current password to turn off the second factor and invalidate recovery codes.',
        disablePasswordLabel: 'Disable TOTP password',
        disableAction: 'Disable TOTP',
        disablePending: 'Disabling…',
        disabled: 'TOTP disabled.',
        disableError: 'Failed to disable TOTP.',
        regenerateTitle: 'Regenerate recovery codes',
        regenerateDescription: 'Use the current password to invalidate the old set and mint a new recovery pack.',
        regeneratePasswordLabel: 'Recovery codes password',
        regenerateAction: 'Regenerate recovery codes',
        regeneratePending: 'Regenerating…',
        regenerated: 'Recovery codes regenerated. Save the new set now.',
        regenerateError: 'Failed to regenerate recovery codes.',
        recoveryCodesTitle: 'Recovery codes',
      },
      avatarEmail: {
        title: 'Avatar & Email',
        description: 'Manage avatar assets and email-change workflow.',
        avatarTitle: 'Avatar',
        avatarDescription: 'Upload a new avatar asset or remove the current one.',
        currentAvatarAlt: 'Current avatar',
        noAvatar: 'No avatar',
        avatarFileLabel: 'Avatar file',
        uploadAction: 'Upload avatar',
        uploadPending: 'Uploading…',
        uploadSuccess: 'Avatar uploaded successfully.',
        uploadError: 'Failed to upload avatar.',
        deleteAction: 'Delete avatar',
        deletePending: 'Deleting…',
        deleteSuccess: 'Avatar deleted successfully.',
        deleteError: 'Failed to delete avatar.',
        emailTitle: 'Email change',
        emailDescription: 'Request a verification email to a new address, then confirm it with the returned token.',
        newEmailLabel: 'New email',
        newEmailPlaceholder: 'new-email@example.com',
        requestAction: 'Request email change',
        requestPending: 'Requesting…',
        requestError: 'Failed to request email change.',
        confirmTokenLabel: 'Email confirmation token',
        confirmTokenPlaceholder: 'verification-token',
        confirmAction: 'Confirm email change',
        confirmPending: 'Confirming…',
        confirmError: 'Failed to confirm email change.',
      },
      sessions: {
        title: 'Active Sessions',
        description: 'List and revoke current sign-in sessions.',
        columns: ['Device', 'IP', 'Current', 'Created', 'Last Active', 'Actions'],
        emptyTitle: 'No active sessions',
        emptyDescription: 'The current user does not have any active sign-in sessions.',
        unknownDevice: 'Unknown device',
        unavailable: 'Unavailable',
        currentSession: 'Current session',
        revocable: 'Revocable',
        revokeAction: 'Revoke',
        revokeDialogTitle: (device: string) => `Revoke session ${device}?`,
        revokeDialogDescription: 'This invalidates the selected refresh token immediately.',
        revokeDialogConfirm: 'Revoke session',
        revokeSuccess: 'Session revoked successfully.',
      },
      cards: {
        identityTitle: 'Identity',
        identityDescription: 'Identity description',
        securityTitle: 'Security controls',
        securityDescription: 'Security description',
        emailTitle: 'Email lifecycle',
        emailDescription: 'Email description',
      },
      dialog: {
        confirmAction: 'Confirm',
      },
    },
  }),
  formatProfileDateTime: (value: string | null | undefined, _locale: string, fallback: string) => value ?? fallback,
}));

function buildProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
    phone: '+81-90-1111-2222',
    displayName: 'Alice',
    avatarUrl: null,
    preferredLanguage: 'en',
    totpEnabled: false,
    forceReset: false,
    lastLoginAt: '2026-04-17T10:00:00.000Z',
    passwordChangedAt: '2026-04-16T10:00:00.000Z',
    passwordExpiresAt: '2026-07-16T10:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderProfileScreen(props: ComponentProps<typeof ProfileScreen>) {
  return render(
    <RuntimeLocaleProvider>
      <ProfileScreen {...props} />
    </RuntimeLocaleProvider>,
  );
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockUpdateSessionUser.mockReset();
    currentSession = {
      tenantName: 'Moonshot Tenant',
    };
  });

  it('renders the profile workspace and saves updated profile details', async () => {
    let currentProfile = buildProfile();
    let readProfileCount = 0;

    currentSession = {
      tenantName: 'Moonshot Tenant',
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        avatarUrl: null,
        preferredLanguage: 'en',
        totpEnabled: false,
        forceReset: false,
        passwordExpiresAt: '2026-07-16T10:00:00.000Z',
      },
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/users/me' && (!init || init.method === undefined)) {
        readProfileCount += 1;
        return currentProfile;
      }

      if (path === '/api/v1/users/me/sessions') {
        return [];
      }

      if (path === '/api/v1/users/me' && init?.method === 'PATCH') {
        currentProfile = buildProfile({
          displayName: 'Operator Alice',
          preferredLanguage: 'ja',
        });

        return currentProfile;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderProfileScreen({ tenantId: 'tenant-1' });

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(document.getElementById('security-controls')).not.toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Operator Alice' },
    });
    fireEvent.change(screen.getByLabelText('Preferred language'), {
      target: { value: 'ja' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/users/me',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    expect(await screen.findByText('Profile details saved.')).toBeInTheDocument();
    expect(await screen.findByText('Operator Alice')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockUpdateSessionUser).toHaveBeenLastCalledWith(
        expect.objectContaining({
          displayName: 'Operator Alice',
          preferredLanguage: 'ja',
        }),
      );
    });
    await waitFor(() => {
      expect(readProfileCount).toBe(1);
    });
  });

  it('renders account security in the dedicated security mode', async () => {
    currentSession = {
      tenantName: 'Moonshot Tenant',
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        avatarUrl: null,
        preferredLanguage: 'en',
        totpEnabled: false,
        forceReset: false,
        passwordExpiresAt: '2026-07-16T10:00:00.000Z',
      },
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/users/me' && (!init || init.method === undefined)) {
        return buildProfile();
      }

      if (path === '/api/v1/users/me/sessions') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderProfileScreen({ tenantId: 'tenant-1', mode: 'security' });

    expect(await screen.findByRole('heading', { name: 'Account Security' })).toBeInTheDocument();
    expect(document.getElementById('security-controls')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.queryByText('Avatar & Email')).not.toBeInTheDocument();
  });

  it('paginates security sessions at 20 rows by default and lets the user advance pages', async () => {
    const sessions = Array.from({ length: 25 }, (_, index) => ({
      id: `sess-${index + 1}`,
      deviceInfo: `Device ${index + 1}`,
      ipAddress: `203.0.113.${index + 1}`,
      createdAt: `2026-04-${String((index % 9) + 10).padStart(2, '0')}T09:00:00.000Z`,
      lastActiveAt: `2026-04-${String((index % 9) + 10).padStart(2, '0')}T10:00:00.000Z`,
      isCurrent: index === 0,
    }));

    currentSession = {
      tenantName: 'Moonshot Tenant',
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        avatarUrl: null,
        preferredLanguage: 'en',
        totpEnabled: true,
        forceReset: false,
        passwordExpiresAt: '2026-07-16T10:00:00.000Z',
      },
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/users/me' && (!init || init.method === undefined)) {
        return buildProfile({ totpEnabled: true });
      }

      if (path === '/api/v1/users/me/sessions') {
        return sessions;
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderProfileScreen({ tenantId: 'tenant-1', mode: 'security' });

    expect(await screen.findByText('Device 1')).toBeInTheDocument();
    expect(screen.queryByText('Device 21')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-20 of 25')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Device 21')).toBeInTheDocument();
    expect(screen.queryByText('Device 1')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 21-25 of 25')).toBeInTheDocument();
  });

  it('does not rewrite the global session on initial load when profile data already matches', async () => {
    currentSession = {
      tenantName: 'Moonshot Tenant',
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        avatarUrl: null,
        preferredLanguage: 'en',
        totpEnabled: false,
        forceReset: false,
        passwordExpiresAt: '2026-07-16T10:00:00.000Z',
      },
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/users/me' && (!init || init.method === undefined)) {
        return buildProfile();
      }

      if (path === '/api/v1/users/me/sessions') {
        return [];
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderProfileScreen({ tenantId: 'tenant-1' });

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockUpdateSessionUser).not.toHaveBeenCalled();
    });
  });

  it('revokes a non-current session through the shared confirm dialog', async () => {
    let sessions = [
      {
        id: 'sess-current',
        deviceInfo: 'MacBook Safari',
        ipAddress: '127.0.0.1',
        createdAt: '2026-04-17T09:00:00.000Z',
        lastActiveAt: '2026-04-17T10:00:00.000Z',
        isCurrent: true,
      },
      {
        id: 'sess-old',
        deviceInfo: 'iPhone Safari',
        ipAddress: '203.0.113.10',
        createdAt: '2026-04-16T09:00:00.000Z',
        lastActiveAt: '2026-04-16T09:30:00.000Z',
        isCurrent: false,
      },
    ];

    currentSession = {
      tenantName: 'Moonshot Tenant',
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        avatarUrl: null,
        preferredLanguage: 'en',
        totpEnabled: false,
        forceReset: false,
        passwordExpiresAt: '2026-07-16T10:00:00.000Z',
      },
    };

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/users/me' && (!init || init.method === undefined)) {
        return buildProfile();
      }

      if (path === '/api/v1/users/me/sessions' && (!init || init.method === undefined)) {
        return sessions;
      }

      if (path === '/api/v1/users/me/sessions/sess-old' && init?.method === 'DELETE') {
        sessions = sessions.filter((entry) => entry.id !== 'sess-old');
        return {
          message: 'Session revoked successfully',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderProfileScreen({ tenantId: 'tenant-1', mode: 'security' });

    expect(await screen.findByText('iPhone Safari')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Revoke' })[1]);

    expect(await screen.findByText('Revoke session iPhone Safari?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Revoke session' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/users/me/sessions/sess-old',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    expect(await screen.findByText('Session revoked successfully.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('iPhone Safari')).not.toBeInTheDocument();
    });
    expect(screen.getByText('MacBook Safari')).toBeInTheDocument();
  });
});
