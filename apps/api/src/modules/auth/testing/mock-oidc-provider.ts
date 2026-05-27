// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Test-only mock IdP material for Phase 3 SSO protocol/authority acceptance.

export const phase3MockOidcProvider = {
  issuer: 'https://idp.test.tcrn.local/p3',
  keyId: 'p3-test-kid-active',
  callbackProviderCode: 'mock-sso',
  subjects: {
    active: 'TEST_P3_SSO_ACTIVE_SUBJECT',
    unlinked: 'TEST_P3_SSO_UNLINKED_SUBJECT',
    revoked: 'TEST_P3_SSO_REVOKED_SUBJECT',
    wrongTenant: 'TEST_P3_SSO_WRONG_TENANT_SUBJECT',
    resetRequired: 'TEST_P3_SSO_RESET_REQUIRED_SUBJECT',
    totpRequired: 'TEST_P3_SSO_TOTP_REQUIRED_SUBJECT',
    replay: 'TEST_P3_SSO_REPLAY_SUBJECT',
    disabledLink: 'TEST_P3_SSO_DISABLED_LINK_SUBJECT',
    removedRole: 'TEST_P3_SSO_REMOVED_ROLE_SUBJECT',
  },
} as const;

export function buildMockIdpClaims(
  subject: string = phase3MockOidcProvider.subjects.active,
  overrides: Record<string, string> = {}
) {
  return {
    subject,
    email: `${subject.toLowerCase()}@idp.test`,
    displayName: `Mock ${subject}`,
    emailVerified: 'true',
    ...overrides,
  };
}

export function buildMockIdpFixtureManifest() {
  return {
    issuer: phase3MockOidcProvider.issuer,
    keyId: phase3MockOidcProvider.keyId,
    subjects: phase3MockOidcProvider.subjects,
    tokenRedactionPolicy:
      'mock provider tests pass claims through callback query parameters and never persist raw IdP tokens, assertions, private keys, or client secrets',
    supportedProtocolControls: [
      'valid_callback',
      'bad_state',
      'missing_subject',
      'replay_exchange_code',
      'unsafe_next_normalization',
      'unlinked_subject_denial',
      'disabled_link_denial',
      'removed_role_permission_snapshot_denial',
      'bad_nonce',
      'wrong_issuer',
      'wrong_audience',
      'expired_token',
      'clock_skew_boundary',
    ],
  };
}
