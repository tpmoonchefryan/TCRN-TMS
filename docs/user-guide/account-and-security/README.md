# Account and Security

This chapter covers the visible account profile and security entry points. It does not document sensitive mutations as completed workflows.

## Account Profile

The account profile area is intended for identity details such as display name, contact metadata, language preference, and profile-related status. Some screens currently combine profile metadata with security-related controls, so treat them as grouped current-state surfaces rather than cleanly separated procedures.

## Security Entry Points

Security surfaces may expose entries for password, multi-factor, SSO, sessions, email, or avatar-related actions. During the current audit, these were not accepted as fully proven mutation workflows.

## Operator Guidance

- Review the visible labels and current account state before editing.
- Avoid using this guide as proof that a sensitive mutation is supported end to end.
- When a mutation is needed, require a focused proof run with cleanup/rollback evidence before promoting it to a normal operating procedure.

## Best Practice

Use account and security pages for review and orientation first. Treat any action that changes credentials, multi-factor setup, linked identity providers, sessions, email, or avatar data as security-sensitive until a focused proof run confirms the full lifecycle and cleanup path.

Recommended operating pattern:

1. Confirm the current signed-in user and active workspace.
2. Separate profile metadata review from security mutation decisions.
3. Do not perform sensitive changes from a shared screen or during public demos.
4. Record whether the task affects only the current user or could affect tenant access, support recovery, or audit history.
5. Escalate to a focused security procedure when password, TOTP, SSO, session, email, or avatar mutation is required.

## Example Scenario

A tenant operator notices that their display name is outdated before a live campaign review. It is reasonable to use the account profile area to inspect profile metadata and language preference. It is not reasonable to use the same visit as proof that password rotation, TOTP setup, or SSO linking is safe; those remain separate security workflows until accepted proof exists.

## Current Limitations

- Password rotation, TOTP setup/recovery, SSO linking, session revocation, email change, and avatar upload are excluded from accepted procedures.
- Profile and security controls may be mixed in one page or flow.
- Accessibility claims remain limited where language metadata, landmarks, skip links, focus behavior, or status announcements are not proven.

Related gap IDs: `GAP-P2-PROFILE-001`, `GAP-P2-PROFILE-002`, `GAP-P2-AUTH-001`, `GAP-P2-A11Y-001`, `GAP-P2-A11Y-002`.
