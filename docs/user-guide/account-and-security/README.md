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

## Current Limitations

- Password rotation, TOTP setup/recovery, SSO linking, session revocation, email change, and avatar upload are excluded from accepted procedures.
- Profile and security controls may be mixed in one page or flow.
- Accessibility claims remain limited where language metadata, landmarks, skip links, focus behavior, or status announcements are not proven.

Related gap IDs: `GAP-P2-PROFILE-001`, `GAP-P2-PROFILE-002`, `GAP-P2-AUTH-001`, `GAP-P2-A11Y-001`, `GAP-P2-A11Y-002`.

