# User And Role Management

TCRN TMS uses a three-state role permission model:

- `deny`: explicitly forbidden; wins over grants from other assigned roles.
- `grant`: explicitly allowed unless another assigned role denies it.
- `unset`: this role does not decide the permission.

The intended built-in recovery role is `INITIAL_ADMIN`. Day-to-day roles are user-created custom roles. Historical default-role audit rows are archived in the G04/G05/G07 proof slices; do not re-present them as active customer limitations unless a later proof run reopens the role-baseline issue.

## Best-Practice Summary

Create roles around recurring jobs and the narrowest scope. Use `grant` for work the role should perform, `deny` for actions the role must never perform, and `unset` when another assigned role should decide.

Example: a talent report reviewer should receive a talent-scoped custom role for reports and customers, not a tenant-wide admin role.

Detailed guide: [User and Role Management](../user-guide/user-and-role-management/README.md).
